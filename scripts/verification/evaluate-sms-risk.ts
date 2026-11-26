import { readFileSync } from 'node:fs';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const dataDir = mkdtempSync(path.join(tmpdir(), 'cyberaware-sms-evaluation-'));
process.env.AUTH_DATA_DIR = dataDir;
process.env.GEMINI_API_KEY = '';
process.env.SAFE_BROWSING_API_KEY = '';

type Case = { id: string; label: 'suspicious' | 'benign'; expectedSign: string; text: string };
const fixture = JSON.parse(readFileSync(new URL('../../tests/fixtures/sms-risk-evaluation.json', import.meta.url), 'utf8')) as { cases: Case[] };
const { analyze, normalizeQuery } = await import('../../backend/analysis/analysis');
const { db } = await import('../../backend/auth/store');

try {
  const results: Array<{ id: string; label: Case['label']; predicted: Case['label']; score: number; level: string; expectedSign: string; flags: string[] }> = [];
  for (const item of fixture.cases) {
    const result = await analyze('sms', normalizeQuery('sms', item.text), false, false);
    const predicted = result.riskScore >= 30 ? 'suspicious' : 'benign';
    results.push({ id: item.id, label: item.label, predicted, score: result.riskScore, level: result.level, expectedSign: item.expectedSign, flags: result.flags });
  }
  const count = (label: Case['label'], predicted: Case['label']) => results.filter(item => item.label === label && item.predicted === predicted).length;
  const tp = count('suspicious', 'suspicious');
  const fn = count('suspicious', 'benign');
  const fp = count('benign', 'suspicious');
  const tn = count('benign', 'benign');
  console.log(JSON.stringify({ sampleCount: results.length, decisionThreshold: 30, aiEnabled: false, tp, fn, fp, tn, precision: tp / (tp + fp), recall: tp / (tp + fn), specificity: tn / (tn + fp), accuracy: (tp + tn) / results.length, results }, null, 2));
} finally {
  db.close();
  rmSync(dataDir, { recursive: true, force: true });
}
