import type { Request } from 'express';
import { randomUUID } from 'node:crypto';
import { currentUser } from '../../auth';
import { db, catalogItem, catalogItems } from '../../database';
import { ApiError, integer, textField } from '../../http';
import '../../analysis/intelligence';

export const stamp = () => new Date().toISOString();
db.exec(`
  CREATE TABLE IF NOT EXISTS admin_audit (id TEXT PRIMARY KEY, actor_id TEXT NOT NULL, action TEXT NOT NULL, target_type TEXT NOT NULL, target_id TEXT NOT NULL, detail TEXT NOT NULL, created_at TEXT NOT NULL);
  CREATE INDEX IF NOT EXISTS admin_audit_time ON admin_audit(created_at);
  CREATE TABLE IF NOT EXISTS admin_request_log (id INTEGER PRIMARY KEY AUTOINCREMENT, method TEXT NOT NULL, path TEXT NOT NULL, status INTEGER NOT NULL, duration_ms INTEGER NOT NULL, created_at TEXT NOT NULL);
  CREATE INDEX IF NOT EXISTS admin_request_log_time ON admin_request_log(created_at);
  CREATE TABLE IF NOT EXISTS admin_user_locks (user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, reason TEXT NOT NULL, actor_id TEXT NOT NULL, updated_at TEXT NOT NULL);
`);
export const n = (sql: string, ...values: any[]) => Number(db.prepare(sql).get(...values)!.n);
export function admin(req: Request) {
  const account = currentUser(req);
  if (!account) throw new ApiError(401, 'Vui lòng đăng nhập.');
  if (account.role !== 'admin') throw new ApiError(403, 'Chỉ quản trị viên được thực hiện thao tác này.');
  return account;
}
export function audit(req: Request, action: string, kind: string, id: string, detail = '') {
  const actor = admin(req);
  db.prepare('INSERT INTO admin_audit VALUES (?,?,?,?,?,?,?)').run(randomUUID(), actor.id, action, kind, id, detail, stamp());
}
export function page(req: Request) {
  return { page: integer(req.query.page, 1, 100000), pageSize: integer(req.query.pageSize, 20, 100) };
}
export function pick<T>(items: T[], req: Request) {
  const p = page(req);
  return { items: items.slice((p.page - 1) * p.pageSize, p.page * p.pageSize), total: items.length, ...p };
}
export function json(kind: string, id: string, value: unknown) {
  db.prepare('INSERT INTO catalog(kind,id,data) VALUES (?,?,?) ON CONFLICT(kind,id) DO UPDATE SET data=excluded.data').run(kind, id, JSON.stringify(value));
}
export function course(id: string): any {
  const value = catalogItem('course', id);
  if (!value) throw new ApiError(404, 'Không tìm thấy khóa học.');
  return value;
}
export function quiz(id: string): any {
  const value = catalogItem('quiz', id);
  if (!value) throw new ApiError(404, 'Không tìm thấy bài kiểm tra.');
  return value;
}
export function courseView(c: any) {
  const questions = catalogItems('quiz').filter(q => q.courseId === c.id).flatMap(q => q.questions);
  return { id: c.id, code: c.code || c.id, title: c.title, description: c.description || '', topic: c.topic || c.category || 'Khác', topicKey: c.topicKey || 'other', incidentGuidance: c.incidentGuidance || null, status: c.status || 'published', updatedAt: c.updatedAt || null, microLessonsCount: c.modules.filter((m: any) => m.type !== 'quiz').length, quizCount: questions.filter((q: any) => q.status !== 'archived').length };
}
export function userRow(id: string) {
  const row = db.prepare('SELECT id,name,email,role,phone,avatar,status,created_at FROM users WHERE id = ?').get(id);
  if (!row) throw new ApiError(404, 'Không tìm thấy người dùng.');
  return row as any;
}
export function userView(row: any) {
  const last = db.prepare('SELECT MAX(last_active_at) AS time FROM sessions WHERE user_id = ?').get(row.id);
  const lock = db.prepare('SELECT reason,updated_at FROM admin_user_locks WHERE user_id = ?').get(row.id);
  return { id: row.id, name: row.name, email: row.email, role: row.role === 'admin' || row.role === 'reviewer' ? row.role : 'member', phone: row.phone || '', avatar: row.avatar, status: row.status, statusReason: lock?.reason || null, createdAt: new Date(Number(row.created_at)).toISOString(), lastActiveAt: last?.time ? new Date(Number(last.time)).toISOString() : null, lockedAt: lock?.updated_at || null };
}
export function reportRow(id: string) {
  const row = db.prepare('SELECT * FROM reports WHERE id = ?').get(id);
  if (!row) throw new ApiError(404, 'Không tìm thấy báo cáo.');
  return row as any;
}
export function reportView(row: any) {
  const reporter = db.prepare('SELECT name, email FROM users WHERE id = ?').get(row.user_id);
  return {
    id: row.id, type: row.type, target: row.target, category: row.category,
    description: row.description, status: row.status, reason: row.reason,
    hidden: !!row.is_hidden, reportedAt: row.created_at,
    reporterName: reporter?.name || 'Người dùng đã xóa', reporterEmail: reporter?.email || '',
    votes: n('SELECT COUNT(*) AS n FROM votes WHERE report_id = ?', row.id),
  };
}
export function allQuestions() {
  return catalogItems('quiz').flatMap(q => q.questions.map((question: any) => ({ ...question, courseId: q.courseId, quizId: q.id, status: question.status || 'active', difficulty: question.difficulty || 'Cơ bản' })));
}
export function questionLocation(id: string): { quiz: any; question: any; index: number } {
  for (const q of catalogItems('quiz')) {
    const index = q.questions.findIndex((question: any) => question.id === id);
    if (index >= 0) return { quiz: q, question: q.questions[index], index };
  }
  throw new ApiError(404, 'Không tìm thấy câu hỏi.');
}
export function questionView(q: any) {
  const attempts = db.prepare("SELECT result FROM submissions WHERE course_id = ?").all(q.courseId || questionLocation(q.id).quiz.courseId);
  let total = 0; let correct = 0;
  for (const row of attempts) for (const review of JSON.parse(String(row.result)).explanations || []) if (review.questionId === q.id) { total++; if (review.correct) correct++; }
  const lessonAnswers = db.prepare('SELECT selected_index FROM lesson_answers WHERE course_id = ? AND question_id = ?').all(q.courseId || questionLocation(q.id).quiz.courseId, q.id);
  total += lessonAnswers.length;
  correct += lessonAnswers.filter(row => Number(row.selected_index) === q.correctIndex).length;
  return { ...q, accuracyRate: total ? Math.round(100 * correct / total) : null, attempts: total };
}
export function questionBody(req: Request, base?: any) {
  const body = req.body || {};
  const courseId = typeof body.courseId === 'string' ? body.courseId : base?.courseId;
  if (!courseId) throw new ApiError(400, 'Cần chọn khóa học.');
  course(courseId);
  const question = textField(body.question ?? base?.question, 'Câu hỏi', 2000, 10);
  const options = body.options ?? base?.options;
  if (!Array.isArray(options) || options.length !== 4 || options.some(o => typeof o !== 'string' || !o.trim() || o.length > 1000)) throw new ApiError(400, 'Cần đúng 4 đáp án A, B, C, D.');
  const correctIndex = body.correctIndex ?? base?.correctIndex;
  if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex > 3) throw new ApiError(400, 'Đáp án đúng không hợp lệ.');
  const explanation = textField(body.explanation ?? base?.explanation, 'Giải thích', 3000, 10);
  const optionExplanations = body.optionExplanations ?? base?.optionExplanations;
  if (!Array.isArray(optionExplanations) || optionExplanations.length !== 4 || optionExplanations.some(value => typeof value !== 'string' || value.trim().length < 5 || value.length > 2000)) throw new ApiError(400, 'Cần giải thích cho cả bốn phương án.');
  const difficulty = body.difficulty ?? base?.difficulty ?? 'Cơ bản';
  if (!['Cơ bản','Tình huống khẩn cấp','Nâng cao'].includes(difficulty)) throw new ApiError(400, 'Độ khó không hợp lệ.');
  const status = base?.status ?? 'review';
  if (!['review','active','archived'].includes(status)) throw new ApiError(400, 'Trạng thái câu hỏi không hợp lệ.');
  return { courseId, question, options: options.map(value => value.trim()), correctIndex, explanation, optionExplanations: optionExplanations.map(value => value.trim()), difficulty, status };
}
export function saveQuestion(courseId: string, q: any) {
  const c = course(courseId);
  const quizId = c.modules.find((m: any) => m.type === 'quiz')?.quizId || `${courseId}-quiz`;
  let data = catalogItem('quiz', quizId);
  if (!data) {
    data = { id: quizId, courseId, questions: [] };
  }
  data.questions.push(q);
  json('quiz', quizId, data);
}
export function csv(rows: Record<string, unknown>[], keys: string[]) {
  const cell = (value: unknown) => {
    const s = String(value ?? '');
    const safe = /^[=+@\-\t\r]/.test(s) ? `'${s}` : s;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  return '\uFEFF' + [keys.join(','), ...rows.map(row => keys.map(key => cell(row[key])).join(','))].join('\r\n');
}
