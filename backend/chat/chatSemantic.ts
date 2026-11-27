import { createHash } from 'node:crypto';
import { db } from '../database';
import {
  chatKnowledgeDocuments,
  chatKnowledge,
  chunkKnowledgeDocuments,
  rankHybridKnowledge,
  type ChatKnowledgeChunk,
  type ChatKnowledgeSource,
} from './chatKnowledge';

const EMBEDDING_MODEL = 'gemini-embedding-001';
const EMBEDDING_DIMENSIONS = 768;
const EMBEDDING_BATCH_SIZE = 24;

// Cache vector của tri thức dự án để không gọi Gemini lại cho nội dung không đổi.
db.exec(`
CREATE TABLE IF NOT EXISTS chat_knowledge_embeddings(
  chunk_id TEXT PRIMARY KEY,
  fingerprint TEXT NOT NULL,
  embedding TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`);

type EmbeddingProvider = {
  embedContent: (params: { model: string; contents: string[]; config: { taskType: string; outputDimensionality: number } }) => Promise<{ embeddings?: Array<{ values?: number[] }> }>;
};

function fingerprint(chunk: ChatKnowledgeChunk) {
  // Tiêu đề, loại, URL hoặc nội dung đổi đều làm vector cũ hết hiệu lực.
  return createHash('sha256').update(`${chunk.title}\n${chunk.kind}\n${chunk.url}\n${chunk.text}`).digest('hex');
}

function parseEmbedding(value: unknown): number[] | undefined {
  // Bỏ qua cache hỏng hoặc vector sai số chiều để tạo lại từ nguồn.
  try {
    const parsed = JSON.parse(String(value));
    return Array.isArray(parsed) && parsed.length === EMBEDDING_DIMENSIONS && parsed.every(Number.isFinite) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

async function embedBatch(provider: EmbeddingProvider, contents: string[], taskType: 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY') {
  // RETRIEVAL_DOCUMENT dùng cho tài liệu; RETRIEVAL_QUERY dùng cho câu hỏi.
  const response = await provider.embedContent({
    model: EMBEDDING_MODEL,
    contents,
    config: { taskType, outputDimensionality: EMBEDDING_DIMENSIONS },
  });
  const vectors = response.embeddings?.map(item => item.values || []) || [];

  // Mỗi nội dung đầu vào phải nhận đúng một vector hợp lệ.
  if (vectors.length !== contents.length || vectors.some(vector => vector.length !== EMBEDDING_DIMENSIONS || vector.some(value => !Number.isFinite(value)))) {
    throw new Error('Gemini returned an invalid embedding batch');
  }
  return vectors;
}

async function ensureKnowledgeIndex(provider: EmbeddingProvider, chunks: ChatKnowledgeChunk[]) {
  // Đọc cache và tìm đoạn chưa có vector hoặc đã thay đổi nội dung.
  const existingRows = db.prepare('SELECT chunk_id AS chunkId,fingerprint,embedding FROM chat_knowledge_embeddings').all();
  const existing = new Map<string, { fingerprint: string; vector?: number[] }>();
  for (const row of existingRows) existing.set(String(row.chunkId), { fingerprint: String(row.fingerprint), vector: parseEmbedding(row.embedding) });
  const missing = chunks.filter(chunk => {
    const row = existing.get(chunk.chunkId);
    return !row?.vector || row.fingerprint !== fingerprint(chunk);
  });
  const upsert = db.prepare(`INSERT INTO chat_knowledge_embeddings(chunk_id,fingerprint,embedding,updated_at) VALUES(?,?,?,?)
    ON CONFLICT(chunk_id) DO UPDATE SET fingerprint=excluded.fingerprint,embedding=excluded.embedding,updated_at=excluded.updated_at`);

  // Chỉ gửi các đoạn thiếu hoặc đã đổi lên Gemini, theo từng lô nhỏ.
  for (let offset = 0; offset < missing.length; offset += EMBEDDING_BATCH_SIZE) {
    const batch = missing.slice(offset, offset + EMBEDDING_BATCH_SIZE);
    const vectors = await embedBatch(provider, batch.map(chunk => `title: ${chunk.title} | text: ${chunk.text}`), 'RETRIEVAL_DOCUMENT');
    const now = new Date().toISOString();
    batch.forEach((chunk, index) => upsert.run(chunk.chunkId, fingerprint(chunk), JSON.stringify(vectors[index]), now));
  }

  // Xóa vector của đoạn không còn trong danh sách tri thức hiện tại.
  const activeIds = new Set(chunks.map(chunk => chunk.chunkId));
  const remove = db.prepare('DELETE FROM chat_knowledge_embeddings WHERE chunk_id=?');
  existingRows.forEach(row => {
    if (!activeIds.has(String(row.chunkId))) remove.run(String(row.chunkId));
  });

  // Trả bản đồ chunkId -> vector cho bước so độ tương đồng.
  const vectors = new Map<string, number[]>();
  for (const chunk of chunks) {
    const row = db.prepare('SELECT embedding FROM chat_knowledge_embeddings WHERE chunk_id=? AND fingerprint=?').get(chunk.chunkId, fingerprint(chunk));
    const vector = row && parseEmbedding(row.embedding);
    if (!vector) throw new Error(`Missing embedding for ${chunk.chunkId}`);
    vectors.set(chunk.chunkId, vector);
  }
  return vectors;
}

/**
 * Tìm nguồn tri thức liên quan cho một câu hỏi.
 * `embeddingTokens` chỉ ước lượng embedding của câu hỏi, không gồm những lần
 * tạo embedding tài liệu khi cache mới được xây hoặc cập nhật.
 */
export async function retrieveChatKnowledge(question: string, provider: EmbeddingProvider): Promise<{ sources: ChatKnowledgeSource[]; embeddingTokens: number }> {
  // 1. Lấy tri thức đủ điều kiện rồi chia thành các đoạn nhỏ.
  const documents = chatKnowledgeDocuments();
  const chunks = chunkKnowledgeDocuments(documents);

  // Không có tri thức thì trả ngay, không gọi dịch vụ embedding.
  if (!chunks.length) return { sources: [], embeddingTokens: 0 };

  let queryTokens = 0;
  try {
    // 2. Tạo hoặc dùng lại vector đã lưu của các đoạn tài liệu.
    const documentVectors = await ensureKnowledgeIndex(provider, chunks);

    // 3. Tạo vector cho câu hỏi với tác vụ tìm kiếm truy vấn.
    const query = `task: question answering | query: ${question}`;
    const [queryVector] = await embedBatch(provider, [query], 'RETRIEVAL_QUERY');

    // Gemini không trả số token ở đây; dùng độ dài chuỗi để ước lượng quota.
    queryTokens = Math.ceil(query.length / 4);

    // 4. Kết hợp điểm ngữ nghĩa và từ khóa để chọn tối đa ba nguồn.
    return { sources: rankHybridKnowledge(question, chunks, queryVector, documentVectors), embeddingTokens: queryTokens };
  } catch (error) {
    // 5. Nếu embedding/index lỗi, dùng tìm từ khóa để chatbot vẫn có nguồn.
    console.warn('Semantic chat retrieval unavailable; using keyword search', { name: (error as Error)?.name || 'Error' });
    return { sources: chatKnowledge(question), embeddingTokens: queryTokens };
  }
}
