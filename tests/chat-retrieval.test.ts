import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const dataDir = mkdtempSync(path.join(tmpdir(), 'cyberaware-chat-retrieval-test-'));
process.env.AUTH_DATA_DIR = dataDir;
const [{ db }, knowledge, semantic, attachments] = await Promise.all([
  import('../backend/auth/store'),
  import('../backend/chat/chatKnowledge'),
  import('../backend/chat/chatSemantic'),
  import('../backend/chat/attachments'),
]);
const fixture = JSON.parse(readFileSync(new URL('./fixtures/chat-retrieval-evaluation.json', import.meta.url), 'utf8')) as {
  cases: Array<{ id: string; relevantSourceIds: string[] }>;
};

after(() => {
  db.close();
  rmSync(dataDir, { recursive: true, force: true });
});

test('chat retrieval evaluation cases point to published project sources', () => {
  const ids = new Set(knowledge.chatKnowledgeDocuments().map(document => document.id));
  assert.ok(fixture.cases.length >= 6);
  for (const item of fixture.cases) {
    assert.ok(item.relevantSourceIds.length, `${item.id} needs at least one expected source`);
    for (const id of item.relevantSourceIds) assert.ok(ids.has(id), `${item.id} references missing source ${id}`);
  }
});

test('hybrid ranking keeps semantic paraphrase ahead of an exact keyword decoy', () => {
  const chunks = [
    { id: 'policy', title: 'Mã xác thực một lần', text: 'Không chia sẻ mã dùng một lần với người gọi.', kind: 'lesson', url: '/hoc-tap', chunkId: 'policy:0', chunkIndex: 0 },
    { id: 'keyword-decoy', title: 'OTP ngân hàng', text: 'OTP ngân hàng xuất hiện trong tiêu đề nhưng không có nội dung hướng dẫn.', kind: 'scenario', url: '/canh-bao', chunkId: 'keyword-decoy:0', chunkIndex: 0 },
    { id: 'keyword-only', title: 'Ghi chú OTP ngân hàng', text: 'OTP ngân hàng cần được xác minh.', kind: 'lesson', url: '/hoc-tap', chunkId: 'keyword-only:0', chunkIndex: 0 },
  ];
  const embeddings = new Map([
    ['policy:0', [1, 0]],
    ['keyword-decoy:0', [0.3, 0.95]],
    ['keyword-only:0', [0, 1]],
  ]);
  const result = knowledge.rankHybridKnowledge('OTP ngân hàng', chunks, [1, 0], embeddings);
  assert.equal(result[0]?.id, 'policy');
  assert.ok(result.some(source => source.id === 'keyword-only'));
});

test('chat knowledge still answers with keyword search when embeddings are unavailable', async () => {
  const result = await semantic.retrieveChatKnowledge('Mã OTP ngân hàng', {
    embedContent: async () => { throw new Error('embedding unavailable in this test'); },
  });
  assert.equal(result.embeddingTokens, 0);
  assert.ok(result.sources.some(source => source.title.includes('OTP')));
});

function textPdf(text: string) {
  const escaped = text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${Buffer.byteLength(`BT /F1 12 Tf 40 720 Td (${escaped}) Tj ET`, 'ascii')} >>\nstream\nBT /F1 12 Tf 40 720 Td (${escaped}) Tj ET\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let document = '%PDF-1.4\n';
  const offsets = [0];
  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(document, 'ascii'));
    document += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }
  const xrefOffset = Buffer.byteLength(document, 'ascii');
  document += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) document += `${String(offset).padStart(10, '0')} 00000 n \n`;
  document += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(document, 'ascii');
}

test('PDF extraction preserves page evidence for follow-up questions', async () => {
  const evidence = 'Case PDF-917. The bank will never ask for a one-time code over the phone. Check the official app before confirming any transaction.';
  const file = new Blob([textPdf(evidence)], { type: 'application/pdf' }) as Blob & { name: string };
  Object.defineProperty(file, 'name', { value: 'incident.pdf' });
  const processed = await attachments.processChatAttachment(file);
  assert.match(processed.extractedText || '', /\[Trang 1\]/);
  assert.match(processed.extractedText || '', /PDF-917/);
  assert.equal(processed.modelPart, undefined);
});
