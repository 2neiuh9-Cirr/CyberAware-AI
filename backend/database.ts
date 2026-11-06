import { db } from '../auth';
import { courses, quizzes, scenarios } from './catalog';

db.exec(`
  PRAGMA busy_timeout = 5000;
  CREATE TABLE IF NOT EXISTS scans (seq INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT NOT NULL UNIQUE, user_id TEXT REFERENCES users(id), result TEXT NOT NULL, created_at TEXT NOT NULL);
  CREATE INDEX IF NOT EXISTS scans_user ON scans(user_id, seq);
  CREATE TABLE IF NOT EXISTS reports (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), type TEXT NOT NULL, target TEXT NOT NULL, category TEXT NOT NULL, description TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', reason TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL);
  CREATE INDEX IF NOT EXISTS reports_status ON reports(status, created_at);
  CREATE TABLE IF NOT EXISTS votes (report_id TEXT REFERENCES reports(id), user_id TEXT REFERENCES users(id), PRIMARY KEY(report_id,user_id));
  CREATE TABLE IF NOT EXISTS moderation_log (id INTEGER PRIMARY KEY, report_id TEXT REFERENCES reports(id), admin_id TEXT REFERENCES users(id), status TEXT NOT NULL, reason TEXT NOT NULL, created_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS catalog (kind TEXT NOT NULL, id TEXT NOT NULL, data TEXT NOT NULL, PRIMARY KEY(kind,id));
  CREATE TABLE IF NOT EXISTS catalog_migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS lesson_progress (user_id TEXT REFERENCES users(id), course_id TEXT NOT NULL, lesson_id TEXT NOT NULL, completed_at TEXT NOT NULL, PRIMARY KEY(user_id,course_id,lesson_id));
  CREATE TABLE IF NOT EXISTS submissions (id TEXT PRIMARY KEY, user_id TEXT REFERENCES users(id), quiz_id TEXT NOT NULL, course_id TEXT NOT NULL, score INTEGER NOT NULL, result TEXT NOT NULL, created_at TEXT NOT NULL);
  CREATE INDEX IF NOT EXISTS submissions_user ON submissions(user_id,course_id);
  CREATE TABLE IF NOT EXISTS lesson_answers (user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, course_id TEXT NOT NULL, lesson_id TEXT NOT NULL, question_id TEXT NOT NULL, selected_index INTEGER NOT NULL, answered_at TEXT NOT NULL, PRIMARY KEY(user_id,course_id,lesson_id,question_id));
`);
// Seed curriculum. Real user reports require moderation.
const insert = db.prepare('INSERT OR IGNORE INTO catalog (kind,id,data) VALUES (?,?,?)');
db.exec('BEGIN');
try {
  for (const [kind, items] of Object.entries({ scenario: scenarios, course: courses, quiz: quizzes })) for (const item of items) insert.run(kind, item.id, JSON.stringify(item));
  // Upgrade existing databases without replacing questions edited by administrators.
  for (const seeded of quizzes) {
    const row = db.prepare("SELECT data FROM catalog WHERE kind = 'quiz' AND id = ?").get(seeded.id);
    if (!row) continue;
    const current = JSON.parse(String(row.data));
    const existingIds = new Set(current.questions.map((question: { id: string }) => question.id));
    const additions = seeded.questions.filter(question => !existingIds.has(question.id));
    if (additions.length) {
      current.questions.push(...additions);
      db.prepare("UPDATE catalog SET data = ? WHERE kind = 'quiz' AND id = ?").run(JSON.stringify(current), seeded.id);
    }
  }
  const migrationName = 'everyday-situations-q6-q10-v1';
  if (!db.prepare('SELECT 1 FROM catalog_migrations WHERE name = ?').get(migrationName)) {
    for (const seeded of quizzes) {
      const row = db.prepare("SELECT data FROM catalog WHERE kind = 'quiz' AND id = ?").get(seeded.id);
      if (!row) continue;
      const current = JSON.parse(String(row.data));
      const replacements = new Map(seeded.questions.slice(5, 10).map(question => [question.id, question]));
      current.questions = current.questions.map((question: { id: string }) => replacements.get(question.id) || question);
      db.prepare("UPDATE catalog SET data = ? WHERE kind = 'quiz' AND id = ?").run(JSON.stringify(current), seeded.id);
    }
    db.prepare('INSERT INTO catalog_migrations (name, applied_at) VALUES (?, ?)').run(migrationName, new Date().toISOString());
  }
  const previousGuidanceTitles: Record<string, string> = {
    'course-deepfake': 'Lỡ chuyển tiền sau cuộc gọi giả người thân?',
    'course-banking': 'Lỡ cung cấp OTP hoặc thông tin ngân hàng?',
    'course-parents': 'Lỡ làm theo cuộc gọi mạo danh?',
    'course-crisis': 'Lỡ mở liên kết hoặc cài ứng dụng lạ?',
  };
  for (const seeded of courses) {
    const row = db.prepare("SELECT data FROM catalog WHERE kind = 'course' AND id = ?").get(seeded.id);
    if (!row) continue;
    const current = JSON.parse(String(row.data));
    let changed = false;
    if (current.incidentGuidance === undefined && seeded.incidentGuidance) {
      current.incidentGuidance = seeded.incidentGuidance;
      changed = true;
    }
    if (current.incidentGuidance?.title === previousGuidanceTitles[seeded.id] && seeded.incidentGuidance) {
      current.incidentGuidance.title = seeded.incidentGuidance.title;
      changed = true;
    }
    const module = current.modules.find((item: { id: string }) => item.id === `${seeded.id}-quiz`);
    const updated = seeded.modules.find(item => item.id === `${seeded.id}-quiz`);
    if (module && updated && module.duration === '3 phút' && module.content === 'Đạt ít nhất 80% để hoàn thành khóa học.') {
      module.duration = updated.duration;
      module.content = updated.content;
      changed = true;
    }
    if (changed) db.prepare("UPDATE catalog SET data = ? WHERE kind = 'course' AND id = ?").run(JSON.stringify(current), seeded.id);
  }
  const removeSamples = 'remove-five-unverified-demo-reports-v1';
  if (!db.prepare('SELECT 1 FROM catalog_migrations WHERE name = ?').get(removeSamples)) {
    const sampleIds = ['delivery', 'relative', 'deposit', 'prize', 'travel'].map(name => `sample-unverified-${name}`);
    const placeholders = sampleIds.map(() => '?').join(',');
    db.prepare(`DELETE FROM votes WHERE report_id IN (${placeholders})`).run(...sampleIds);
    db.prepare(`DELETE FROM moderation_log WHERE report_id IN (${placeholders})`).run(...sampleIds);
    db.prepare(`DELETE FROM reports WHERE id IN (${placeholders})`).run(...sampleIds);
    db.prepare('INSERT INTO catalog_migrations (name, applied_at) VALUES (?, ?)').run(removeSamples, new Date().toISOString());
  }
  db.exec('COMMIT');
} catch (error) { db.exec('ROLLBACK'); throw error; }
export function catalogItems(kind: string): any[] { return db.prepare('SELECT data FROM catalog WHERE kind = ? ORDER BY rowid').all(kind).map(row => JSON.parse(String(row.data))); }
export function catalogItem(kind: string, id: string): any | undefined {
  const row = db.prepare('SELECT data FROM catalog WHERE kind = ? AND id = ?').get(kind, id);
  return row ? JSON.parse(String(row.data)) : undefined;
}
export { db };
