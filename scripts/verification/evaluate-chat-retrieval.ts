import 'dotenv/config';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

type EvaluationCase = { id: string; query: string; relevantSourceIds: string[] };
type EvaluationFixture = { version: number; cases: EvaluationCase[] };

const apiKey = process.env.GEMINI_API_KEY?.trim();
if (!apiKey) {
  console.error('GEMINI_API_KEY is not configured.');
  process.exitCode = 2;
} else {
  const dataDir = mkdtempSync(path.join(tmpdir(), 'cyberaware-chat-retrieval-'));
  process.env.AUTH_DATA_DIR = dataDir;
  let db: { close: () => void } | undefined;
  try {
    const fixturePath = new URL('../../tests/fixtures/chat-retrieval-evaluation.json', import.meta.url);
    const fixture = JSON.parse(readFileSync(fixturePath, 'utf8')) as EvaluationFixture;
    const [{ GoogleGenAI }, { retrieveChatKnowledge }, { db: database }] = await Promise.all([
      import('@google/genai'),
      import('../../backend/chat/chatSemantic'),
      import('../../backend/auth/store'),
    ]);
    db = database;
    const provider = new GoogleGenAI({ apiKey }).models;
    const rows: Array<{ id: string; expected: string[]; returned: string[]; recallAt3: number; reciprocalRank: number }> = [];
    for (const item of fixture.cases) {
      const result = await retrieveChatKnowledge(item.query, provider);
      if (!result.embeddingTokens) throw new Error(`Embedding failed or fell back for case ${item.id}.`);
      const returned = result.sources.map(source => source.id);
      const firstRelevant = returned.findIndex(id => item.relevantSourceIds.includes(id));
      rows.push({
        id: item.id,
        expected: item.relevantSourceIds,
        returned,
        recallAt3: item.relevantSourceIds.filter(id => returned.includes(id)).length / item.relevantSourceIds.length,
        reciprocalRank: firstRelevant < 0 ? 0 : 1 / (firstRelevant + 1),
      });
    }
    const recallAt3 = rows.reduce((sum, row) => sum + row.recallAt3, 0) / rows.length;
    const mrr = rows.reduce((sum, row) => sum + row.reciprocalRank, 0) / rows.length;
    console.log(JSON.stringify({ model: 'gemini-embedding-001', cases: rows.length, recallAt3, mrr, results: rows }, null, 2));
    if (recallAt3 < 0.75 || mrr < 0.6) process.exitCode = 1;
  } catch (error) {
    console.error('Chat retrieval evaluation failed:', (error as Error).message);
    process.exitCode = 1;
  } finally {
    db?.close();
    rmSync(dataDir, { recursive: true, force: true });
  }
}
