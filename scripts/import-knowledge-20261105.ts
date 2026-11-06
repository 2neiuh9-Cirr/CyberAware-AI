import 'dotenv/config';
import { DatabaseSync, backup } from 'node:sqlite';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const payload = JSON.parse(readFileSync(new URL('../backend/knowledge-20261105.json', import.meta.url), 'utf8'));
const databasePath = path.resolve(process.env.AUTH_DATA_DIR || 'data', 'auth.sqlite');
const db = new DatabaseSync(databasePath);
db.exec('PRAGMA busy_timeout=5000');
assert.equal(payload.rules.length, 56);
assert.equal(payload.intel.length, 20);
assert.equal(new Set(payload.rules.map((r: any) => r.id)).size, 56);
assert.equal(new Set(payload.intel.map((r: any) => r.sourceUrl)).size, 20);
for (const r of payload.rules) {
  assert.ok(['url', 'sms'].includes(r.type) && r.weight > 0 && r.weight <= 40);
  assert.ok(r.terms.length && r.terms.every((term: string) => term.length >= 4));
}
for (const r of payload.intel) {
  assert.ok(new URL(r.sourceUrl).hostname.endsWith('.gov.vn') || new URL(r.sourceUrl).hostname.endsWith('baochinhphu.vn'));
  assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(r.sourceDate));
}
mkdirSync('outputs', { recursive: true });
const backupPath = path.resolve('outputs', `before-knowledge-${Date.now()}.sqlite`);
await backup(db, backupPath);
const before = { rules: db.prepare('SELECT COUNT(*) AS n FROM scam_rules').get()!.n, intel: db.prepare('SELECT COUNT(*) AS n FROM threat_intel').get()!.n };
const rule = db.prepare('INSERT OR IGNORE INTO scam_rules (id,type,title,terms,weight,enabled,updated_at) VALUES (?,?,?,?,?,1,?)');
const intel = db.prepare('INSERT OR IGNORE INTO threat_intel (id,title,category,summary,source_name,source_url,source_date,terms,indicators,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)');
let insertedRules = 0, insertedIntel = 0;
db.exec('BEGIN IMMEDIATE');
try {
  for (const r of payload.rules) insertedRules += Number(rule.run(r.id,r.type,r.title,JSON.stringify(r.terms),r.weight,payload.retrievedAt).changes);
  for (const r of payload.intel) insertedIntel += Number(intel.run(r.id,r.title,r.category,r.summary,r.sourceName,r.sourceUrl,r.sourceDate,JSON.stringify(r.terms),'[]','reviewed',payload.retrievedAt).changes);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM scam_rules WHERE id LIKE 'vn-20261105-%'").get()!.n, 56);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM threat_intel WHERE id LIKE 'vn-20261105-%'").get()!.n, 20);
  db.exec('COMMIT');
} catch (error) { db.exec('ROLLBACK'); throw error; }
const report = { databasePath, backupPath, before, insertedRules, insertedIntel, after: { rules: db.prepare('SELECT COUNT(*) AS n FROM scam_rules').get()!.n, intel: db.prepare('SELECT COUNT(*) AS n FROM threat_intel').get()!.n }, integrity: db.prepare('PRAGMA quick_check').get() };
writeFileSync('outputs/knowledge-20261105-report.json', JSON.stringify(report, null, 2));
writeFileSync('outputs/knowledge-20261105-sources.md', '# Cảnh báo bổ sung ngày 05/11/2026\n\n' + payload.intel.map((r: any, i: number) => `${i + 1}. **${r.title}** — ${r.sourceName}, ${r.sourceDate}\n\n   ${r.summary}\n\n   [Nguồn](${r.sourceUrl})\n`).join('\n'));
console.log(JSON.stringify(report, null, 2));
db.close();
