import { catalogItems, db } from '../database';
import { normalizedText } from '../analysis/intelligence';

export interface ChatKnowledgeDocument {
  id: string;
  title: string;
  text: string;
  kind: string;
  url: string;
  sourceDate?: string;
}

export interface ChatKnowledgeChunk extends ChatKnowledgeDocument {
  chunkId: string;
  chunkIndex: number;
}

export interface ChatKnowledgeSource extends ChatKnowledgeDocument {}

const stopWords = new Set(['toi','ban','cua','nhung','nhu','the','nao','gi','voi','mot','cho','nay','muon','lam','hay','can']);

export function chatKnowledgeDocuments(): ChatKnowledgeDocument[] {
  const items: ChatKnowledgeDocument[] = [];
  for (const scenario of catalogItems('scenario')) {
    items.push({
      id: `scenario-${scenario.id}`,
      kind: 'scenario',
      title: scenario.title,
      text: `Tình huống minh họa: ${scenario.summary} ${scenario.preventionTips.join(' ')}`,
      url: '/canh-bao',
    });
  }
  for (const course of catalogItems('course').filter(course => (course.status || 'published') === 'published')) {
    for (const lesson of course.modules.filter((module: any) => module.type !== 'quiz' && module.content)) {
      items.push({ id: `${course.id}-${lesson.id}`, kind: 'lesson', title: lesson.title, text: lesson.content, url: '/hoc-tap' });
    }
    if (course.incidentGuidance) {
      items.push({ id: `${course.id}-guidance`, kind: 'lesson', title: course.incidentGuidance.title, text: course.incidentGuidance.steps.join(' '), url: '/hoc-tap' });
    }
  }
  for (const row of db.prepare("SELECT id,title,summary,source_url,source_date FROM threat_intel WHERE status='reviewed'").all()) {
    if (String(row.source_url).startsWith('https://')) {
      items.push({
        id: `intel-${row.id}`,
        kind: 'intel',
        title: String(row.title),
        text: String(row.summary),
        url: String(row.source_url),
        sourceDate: String(row.source_date),
      });
    }
  }
  return items.filter(item => item.title.trim() && item.text.trim());
}

function splitAtWords(value: string, maxChars: number) {
  const chunks: string[] = [];
  let remaining = value.trim();
  while (remaining.length > maxChars) {
    const boundary = Math.max(remaining.lastIndexOf('\n', maxChars), remaining.lastIndexOf(' ', maxChars));
    const cut = boundary > maxChars * 0.6 ? boundary : maxChars;
    chunks.push(remaining.slice(0, cut).trim());
    remaining = remaining.slice(cut).trim();
  }
  if (remaining) chunks.push(remaining);
  return chunks;
}

export function chunkKnowledgeDocuments(documents: ChatKnowledgeDocument[], maxChars = 1200): ChatKnowledgeChunk[] {
  const chunks: ChatKnowledgeChunk[] = [];
  for (const document of documents) {
    const paragraphs = document.text.split(/\n+/).map(text => text.trim()).filter(Boolean);
    const grouped: string[] = [];
    let current = '';
    for (const paragraph of paragraphs) {
      for (const piece of splitAtWords(paragraph, maxChars)) {
        if (current && current.length + piece.length + 2 > maxChars) {
          grouped.push(current);
          current = '';
        }
        current = current ? `${current}\n\n${piece}` : piece;
      }
    }
    if (current) grouped.push(current);
    grouped.forEach((text, chunkIndex) => chunks.push({
      ...document,
      text,
      chunkIndex,
      chunkId: `${document.id}:${chunkIndex}`,
    }));
  }
  return chunks;
}

function queryWords(question: string) {
  return [...new Set(normalizedText(question).match(/[a-z0-9]{2,}/g) || [])].filter(word => !stopWords.has(word));
}

export function keywordScore(question: string, document: Pick<ChatKnowledgeDocument, 'title' | 'text'>) {
  return queryWords(question).reduce((score, word) =>
    score + Number(normalizedText(document.title).includes(word)) * 3 + Number(normalizedText(document.text).includes(word)), 0);
}

export function cosineSimilarity(a: number[], b: number[]) {
  if (!a.length || a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let index = 0; index < a.length; index++) {
    dot += a[index] * b[index];
    normA += a[index] * a[index];
    normB += b[index] * b[index];
  }
  return normA && normB ? dot / Math.sqrt(normA * normB) : 0;
}

export function rankHybridKnowledge(
  question: string,
  chunks: ChatKnowledgeChunk[],
  queryEmbedding: number[],
  embeddings: Map<string, number[]>,
  limit = 3,
): ChatKnowledgeSource[] {
  const terms = queryWords(question);
  const scored = chunks.map(chunk => {
    const lexical = keywordScore(question, chunk);
    const semantic = cosineSimilarity(queryEmbedding, embeddings.get(chunk.chunkId) || []);
    const normalizedLexical = Math.min(1, lexical / Math.max(3, terms.length * 2));
    return { chunk, lexical, semantic, score: semantic * 0.72 + normalizedLexical * 0.28 };
  }).filter(item => item.semantic >= 0.30 || item.lexical >= 3)
    .sort((a, b) => b.score - a.score || a.chunk.chunkIndex - b.chunk.chunkIndex);

  const merged = new Map<string, ChatKnowledgeSource>();
  for (const item of scored) {
    const existing = merged.get(item.chunk.id);
    if (existing) {
      if (!existing.text.includes(item.chunk.text) && existing.text.length < 2200) {
        existing.text = `${existing.text}\n\n${item.chunk.text}`.slice(0, 2400);
      }
      continue;
    }
    if (merged.size >= limit) continue;
    merged.set(item.chunk.id, {
      id: item.chunk.id,
      title: item.chunk.title,
      kind: item.chunk.kind,
      url: item.chunk.url,
      text: item.chunk.text.slice(0, 1600),
      ...(item.chunk.sourceDate ? { sourceDate: item.chunk.sourceDate } : {}),
    });
  }
  return [...merged.values()];
}

export function chatKnowledge(question: string) {
  return chatKnowledgeDocuments().map(item => ({ item, score: keywordScore(question, item) }))
    .filter(result => result.score > 1)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ item }) => ({ ...item, text: item.text.slice(0, 1600) }));
}
