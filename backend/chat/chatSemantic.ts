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
  return createHash('sha256').update(`${chunk.title}\n${chunk.kind}\n${chunk.url}\n${chunk.text}`).digest('hex');
}

function parseEmbedding(value: unknown): number[] | undefined {
  try {
    const parsed = JSON.parse(String(value));
    return Array.isArray(parsed) && parsed.length === EMBEDDING_DIMENSIONS && parsed.every(Number.isFinite) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

async function embedBatch(provider: EmbeddingProvider, contents: string[], taskType: 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY') {
  const response = await provider.embedContent({
    model: EMBEDDING_MODEL,
    contents,
    config: { taskType, outputDimensionality: EMBEDDING_DIMENSIONS },
  });
  const vectors = response.embeddings?.map(item => item.values || []) || [];
  if (vectors.length !== contents.length || vectors.some(vector => vector.length !== EMBEDDING_DIMENSIONS || vector.some(value => !Number.isFinite(value)))) {
    throw new Error('Gemini returned an invalid embedding batch');
  }
  return vectors;
}

async function ensureKnowledgeIndex(provider: EmbeddingProvider, chunks: ChatKnowledgeChunk[]) {
  const existingRows = db.prepare('SELECT chunk_id AS chunkId,fingerprint,embedding FROM chat_knowledge_embeddings').all();
  const existing = new Map<string, { fingerprint: string; vector?: number[] }>();
  for (const row of existingRows) existing.set(String(row.chunkId), { fingerprint: String(row.fingerprint), vector: parseEmbedding(row.embedding) });
  const missing = chunks.filter(chunk => {
    const row = existing.get(chunk.chunkId);
    return !row?.vector || row.fingerprint !== fingerprint(chunk);
  });
  const upsert = db.prepare(`INSERT INTO chat_knowledge_embeddings(chunk_id,fingerprint,embedding,updated_at) VALUES(?,?,?,?)
    ON CONFLICT(chunk_id) DO UPDATE SET fingerprint=excluded.fingerprint,embedding=excluded.embedding,updated_at=excluded.updated_at`);
  for (let offset = 0; offset < missing.length; offset += EMBEDDING_BATCH_SIZE) {
    const batch = missing.slice(offset, offset + EMBEDDING_BATCH_SIZE);
    const vectors = await embedBatch(provider, batch.map(chunk => `title: ${chunk.title} | text: ${chunk.text}`), 'RETRIEVAL_DOCUMENT');
    const now = new Date().toISOString();
    batch.forEach((chunk, index) => upsert.run(chunk.chunkId, fingerprint(chunk), JSON.stringify(vectors[index]), now));
  }
  const activeIds = new Set(chunks.map(chunk => chunk.chunkId));
  const remove = db.prepare('DELETE FROM chat_knowledge_embeddings WHERE chunk_id=?');
  existingRows.forEach(row => {
    if (!activeIds.has(String(row.chunkId))) remove.run(String(row.chunkId));
  });

  const vectors = new Map<string, number[]>();
  for (const chunk of chunks) {
    const row = db.prepare('SELECT embedding FROM chat_knowledge_embeddings WHERE chunk_id=? AND fingerprint=?').get(chunk.chunkId, fingerprint(chunk));
    const vector = row && parseEmbedding(row.embedding);
    if (!vector) throw new Error(`Missing embedding for ${chunk.chunkId}`);
    vectors.set(chunk.chunkId, vector);
  }
  return vectors;
}

export async function retrieveChatKnowledge(question: string, provider: EmbeddingProvider): Promise<{ sources: ChatKnowledgeSource[]; embeddingTokens: number }> {
  const documents = chatKnowledgeDocuments();
  const chunks = chunkKnowledgeDocuments(documents);
  if (!chunks.length) return { sources: [], embeddingTokens: 0 };
  let queryTokens = 0;
  try {
    const documentVectors = await ensureKnowledgeIndex(provider, chunks);
    const query = `task: question answering | query: ${question}`;
    const [queryVector] = await embedBatch(provider, [query], 'RETRIEVAL_QUERY');
    queryTokens = Math.ceil(query.length / 4);
    return { sources: rankHybridKnowledge(question, chunks, queryVector, documentVectors), embeddingTokens: queryTokens };
  } catch (error) {
    console.warn('Semantic chat retrieval unavailable; using keyword search', { name: (error as Error)?.name || 'Error' });
    return { sources: chatKnowledge(question), embeddingTokens: queryTokens };
  }
}
