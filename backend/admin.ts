import { adminChatSettings, updateChatSettings } from './chat/chat';
import { Router, type Request } from 'express';
import { randomBytes, randomUUID } from 'node:crypto';
import { currentUser, hashPassword, sendAccountSetupCode } from '../auth';
import { db, catalogItem, catalogItems } from './database';
import { ApiError, integer, rateLimit, textField } from './http';
import { normalizeQuery, scanType } from './analysis/analysis';
import './analysis/intelligence';

export const adminRouter = Router();
const stamp = () => new Date().toISOString();
db.exec(`
  CREATE TABLE IF NOT EXISTS admin_audit (id TEXT PRIMARY KEY, actor_id TEXT NOT NULL, action TEXT NOT NULL, target_type TEXT NOT NULL, target_id TEXT NOT NULL, detail TEXT NOT NULL, created_at TEXT NOT NULL);
  CREATE INDEX IF NOT EXISTS admin_audit_time ON admin_audit(created_at);
  CREATE TABLE IF NOT EXISTS admin_request_log (id INTEGER PRIMARY KEY AUTOINCREMENT, method TEXT NOT NULL, path TEXT NOT NULL, status INTEGER NOT NULL, duration_ms INTEGER NOT NULL, created_at TEXT NOT NULL);
  CREATE INDEX IF NOT EXISTS admin_request_log_time ON admin_request_log(created_at);
  CREATE TABLE IF NOT EXISTS admin_user_locks (user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, reason TEXT NOT NULL, actor_id TEXT NOT NULL, updated_at TEXT NOT NULL);
`);
const n = (sql: string, ...values: any[]) => Number(db.prepare(sql).get(...values)!.n);
function admin(req: Request) {
  const account = currentUser(req);
  if (!account) throw new ApiError(401, 'Vui lòng đăng nhập.');
  if (account.role !== 'admin') throw new ApiError(403, 'Chỉ quản trị viên được thực hiện thao tác này.');
  return account;
}
function audit(req: Request, action: string, kind: string, id: string, detail = '') {
  const actor = admin(req);
  db.prepare('INSERT INTO admin_audit VALUES (?,?,?,?,?,?,?)').run(randomUUID(), actor.id, action, kind, id, detail, stamp());
}
function page(req: Request) {
  return { page: integer(req.query.page, 1, 100000), pageSize: integer(req.query.pageSize, 20, 100) };
}
function pick<T>(items: T[], req: Request) {
  const p = page(req);
  return { items: items.slice((p.page - 1) * p.pageSize, p.page * p.pageSize), total: items.length, ...p };
}
function json(kind: string, id: string, value: unknown) {
  db.prepare('INSERT INTO catalog(kind,id,data) VALUES (?,?,?) ON CONFLICT(kind,id) DO UPDATE SET data=excluded.data').run(kind, id, JSON.stringify(value));
}
function course(id: string): any {
  const value = catalogItem('course', id);
  if (!value) throw new ApiError(404, 'Không tìm thấy khóa học.');
  return value;
}
function quiz(id: string): any {
  const value = catalogItem('quiz', id);
  if (!value) throw new ApiError(404, 'Không tìm thấy bài kiểm tra.');
  return value;
}
function courseView(c: any) {
  const questions = catalogItems('quiz').filter(q => q.courseId === c.id).flatMap(q => q.questions);
  return { id: c.id, code: c.code || c.id, title: c.title, description: c.description || '', topic: c.topic || c.category || 'Khác', topicKey: c.topicKey || 'other', incidentGuidance: c.incidentGuidance || null, status: c.status || 'published', updatedAt: c.updatedAt || null, microLessonsCount: c.modules.filter((m: any) => m.type !== 'quiz').length, quizCount: questions.filter((q: any) => q.status !== 'archived').length };
}
function userRow(id: string) {
  const row = db.prepare('SELECT id,name,email,role,phone,avatar,status,created_at FROM users WHERE id = ?').get(id);
  if (!row) throw new ApiError(404, 'Không tìm thấy người dùng.');
  return row as any;
}
function userView(row: any) {
  const last = db.prepare('SELECT MAX(last_active_at) AS time FROM sessions WHERE user_id = ?').get(row.id);
  const lock = db.prepare('SELECT reason,updated_at FROM admin_user_locks WHERE user_id = ?').get(row.id);
  return { id: row.id, name: row.name, email: row.email, role: row.role === 'admin' || row.role === 'reviewer' ? row.role : 'member', phone: row.phone || '', avatar: row.avatar, status: row.status, statusReason: lock?.reason || null, createdAt: new Date(Number(row.created_at)).toISOString(), lastActiveAt: last?.time ? new Date(Number(last.time)).toISOString() : null, lockedAt: lock?.updated_at || null };
}
function reportRow(id: string) {
  const row = db.prepare('SELECT * FROM reports WHERE id = ?').get(id);
  if (!row) throw new ApiError(404, 'Không tìm thấy báo cáo.');
  return row as any;
}
function reportView(row: any) {
  const reporter = db.prepare('SELECT name, email FROM users WHERE id = ?').get(row.user_id);
  return {
    id: row.id, type: row.type, target: row.target, category: row.category,
    description: row.description, status: row.status, reason: row.reason,
    hidden: !!row.is_hidden, reportedAt: row.created_at,
    reporterName: reporter?.name || 'Người dùng đã xóa', reporterEmail: reporter?.email || '',
    votes: n('SELECT COUNT(*) AS n FROM votes WHERE report_id = ?', row.id),
  };
}
function allQuestions() {
  return catalogItems('quiz').flatMap(q => q.questions.map((question: any) => ({ ...question, courseId: q.courseId, quizId: q.id, status: question.status || 'active', difficulty: question.difficulty || 'Cơ bản' })));
}
function questionLocation(id: string): { quiz: any; question: any; index: number } {
  for (const q of catalogItems('quiz')) {
    const index = q.questions.findIndex((question: any) => question.id === id);
    if (index >= 0) return { quiz: q, question: q.questions[index], index };
  }
  throw new ApiError(404, 'Không tìm thấy câu hỏi.');
}
function questionView(q: any) {
  const attempts = db.prepare("SELECT result FROM submissions WHERE course_id = ?").all(q.courseId || questionLocation(q.id).quiz.courseId);
  let total = 0; let correct = 0;
  for (const row of attempts) for (const review of JSON.parse(String(row.result)).explanations || []) if (review.questionId === q.id) { total++; if (review.correct) correct++; }
  const lessonAnswers = db.prepare('SELECT selected_index FROM lesson_answers WHERE course_id = ? AND question_id = ?').all(q.courseId || questionLocation(q.id).quiz.courseId, q.id);
  total += lessonAnswers.length;
  correct += lessonAnswers.filter(row => Number(row.selected_index) === q.correctIndex).length;
  return { ...q, accuracyRate: total ? Math.round(100 * correct / total) : null, attempts: total };
}
function questionBody(req: Request, base?: any) {
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
function saveQuestion(courseId: string, q: any) {
  const c = course(courseId);
  const quizId = c.modules.find((m: any) => m.type === 'quiz')?.quizId || `${courseId}-quiz`;
  let data = catalogItem('quiz', quizId);
  if (!data) {
    data = { id: quizId, courseId, questions: [] };
  }
  data.questions.push(q);
  json('quiz', quizId, data);
}
function csv(rows: Record<string, unknown>[], keys: string[]) {
  const cell = (value: unknown) => {
    const s = String(value ?? '');
    const safe = /^[=+@\-\t\r]/.test(s) ? `'${s}` : s;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  return '\uFEFF' + [keys.join(','), ...rows.map(row => keys.map(key => cell(row[key])).join(','))].join('\r\n');
}
adminRouter.use((req, _res, next) => { try { admin(req); next(); } catch (error) { next(error); } });

adminRouter.get('/chat/settings', (_req,res) => res.json(adminChatSettings()));
adminRouter.patch('/chat/settings', (req,res) => {
  const config = updateChatSettings(req.body);
  audit(req,'chat.settings','chat','1',JSON.stringify(req.body));
  res.json(config);
});
adminRouter.get('/overview', (_req, res) => {
  const since = new Date(Date.now() - 30 * 86400_000).toISOString();
  const recent = db.prepare('SELECT result FROM scans WHERE created_at >= ?').all(since).map(row => JSON.parse(String(row.result)));
  res.json({ users: n('SELECT COUNT(*) AS n FROM users'), activeUsers: n("SELECT COUNT(*) AS n FROM users WHERE status = 'active'"), scansLast30Days: recent.length, highRiskScansLast30Days: recent.filter(s => s.riskScore >= 70).length, courses: catalogItems('course').filter(c => (c.status || 'published') === 'published').length, questions: allQuestions().filter(q => q.status === 'active').length, reportsPending: n("SELECT COUNT(*) AS n FROM reports WHERE status = 'pending'"), updatedAt: stamp() });
});
adminRouter.get('/reports', (req, res) => {
  const status = String(req.query.status || 'all');
  const visibility = String(req.query.visibility || 'all');
  if (!['all', 'pending', 'approved', 'rejected', 'unverified'].includes(status) || !['all', 'visible', 'hidden'].includes(visibility)) throw new ApiError(400, 'Bộ lọc báo cáo không hợp lệ.');
  const type = req.query.type ? scanType(req.query.type) : '';
  const q = textField(req.query.q ?? '', 'Từ khóa', 200, 0).toLocaleLowerCase('vi');
  const filters = ['1=1']; const values: any[] = [];
  if (status !== 'all') { filters.push('r.status = ?'); values.push(status); }
  if (visibility !== 'all') { filters.push('r.is_hidden = ?'); values.push(visibility === 'hidden' ? 1 : 0); }
  if (type) { filters.push('r.type = ?'); values.push(type); }
  if (q) { filters.push('(instr(lower(r.target), ?) > 0 OR instr(lower(r.category), ?) > 0 OR instr(lower(r.description), ?) > 0 OR instr(lower(u.name), ?) > 0)'); values.push(q, q, q, q); }
  const where = filters.join(' AND ');
  const p = page(req);
  const countSql = `FROM reports r LEFT JOIN users u ON u.id = r.user_id WHERE ${where}`;
  const total = n(`SELECT COUNT(*) AS n ${countSql}`, ...values);
  const rows = db.prepare(`SELECT r.* ${countSql} ORDER BY r.created_at DESC, r.id DESC LIMIT ? OFFSET ?`).all(...values, p.pageSize, (p.page - 1) * p.pageSize);
  const summary = db.prepare("SELECT COUNT(*) AS total, SUM(status = 'pending') AS pending, SUM(status = 'approved' AND is_hidden = 0) AS approved, SUM(status = 'rejected') AS rejected, SUM(is_hidden = 1) AS hidden FROM reports").get() as any;
  res.json({ items: rows.map(reportView), total, ...p, summary: { total: Number(summary.total), pending: Number(summary.pending || 0), approved: Number(summary.approved || 0), rejected: Number(summary.rejected || 0), hidden: Number(summary.hidden || 0) } });
});
adminRouter.patch('/reports/:id', (req, res) => {
  const old = reportRow(req.params.id);
  const type = scanType(req.body?.type);
  const target = normalizeQuery(type, req.body?.target);
  const category = textField(req.body?.category, 'Danh mục', 100);
  const description = textField(req.body?.description, 'Mô tả', 3000, 10);
  if (/(?:otp|mật khẩu|password|mã xác thực)\s*[:=]?\s*[a-z0-9_-]{4,}/i.test(description)) throw new ApiError(400, 'Hãy xóa mã xác thực/mật khẩu khỏi mô tả trước khi lưu.');
  const changed = old.type !== type || old.target !== target || old.category !== category || old.description !== description;
  if (!changed) return res.json({ report: reportView(old) });
  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare("UPDATE reports SET type = ?, target = ?, category = ?, description = ?, status = 'pending', reason = ? WHERE id = ?")
      .run(type, target, category, description, 'Nội dung đã chỉnh sửa; chờ kiểm duyệt lại.', old.id);
    db.prepare('DELETE FROM votes WHERE report_id = ?').run(old.id);
    db.prepare('INSERT INTO moderation_log (report_id,admin_id,status,reason,created_at) VALUES (?,?,?,?,?)')
      .run(old.id, admin(req).id, 'pending', 'Nội dung đã chỉnh sửa; chờ kiểm duyệt lại.', stamp());
    audit(req, 'report.edit', 'report', old.id, JSON.stringify({ type, target, category }));
    db.exec('COMMIT');
  } catch (error) { db.exec('ROLLBACK'); throw error; }
  res.json({ report: reportView(reportRow(old.id)) });
});
adminRouter.patch('/reports/:id/visibility', (req, res) => {
  const row = reportRow(req.params.id);
  if (typeof req.body?.hidden !== 'boolean') throw new ApiError(400, 'Trạng thái hiển thị không hợp lệ.');
  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare('UPDATE reports SET is_hidden = ? WHERE id = ?').run(req.body.hidden ? 1 : 0, row.id);
    audit(req, req.body.hidden ? 'report.hide' : 'report.show', 'report', row.id);
    db.exec('COMMIT');
  } catch (error) { db.exec('ROLLBACK'); throw error; }
  res.json({ report: reportView(reportRow(row.id)) });
});
adminRouter.delete('/reports/:id', (req, res) => {
  const row = reportRow(req.params.id);
  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare('DELETE FROM votes WHERE report_id = ?').run(row.id);
    db.prepare('DELETE FROM moderation_log WHERE report_id = ?').run(row.id);
    db.prepare('DELETE FROM reports WHERE id = ?').run(row.id);
    db.prepare("DELETE FROM admin_audit WHERE target_type = 'report' AND target_id = ?").run(row.id);
    audit(req, 'report.delete', 'report', row.id, JSON.stringify({ type: row.type, status: row.status }));
    db.exec('COMMIT');
  } catch (error) { db.exec('ROLLBACK'); throw error; }
  res.json({ success: true });
});
adminRouter.get('/audit-events', (req, res) => {
  const rows = db.prepare('SELECT a.*,u.name AS actor_name FROM admin_audit a LEFT JOIN users u ON u.id = a.actor_id ORDER BY a.created_at DESC').all();
  res.json(pick(rows.map(row => ({ id: row.id, actorId: row.actor_id, actorName: row.actor_name, action: row.action, targetType: row.target_type, targetId: row.target_id, detail: row.detail, createdAt: row.created_at })), req));
});
adminRouter.get('/threats/summary', (req, res) => {
  const days = integer(req.query.days, 7, 365);
  const rows = db.prepare('SELECT category,COUNT(*) AS count FROM reports WHERE status = ? AND is_hidden = 0 AND created_at >= ? GROUP BY category ORDER BY count DESC LIMIT 4').all('approved', new Date(Date.now() - days * 86400_000).toISOString());
  const total = n('SELECT COUNT(*) AS n FROM reports WHERE status = ? AND is_hidden = 0 AND created_at >= ?', 'approved', new Date(Date.now() - days * 86400_000).toISOString());
  res.json({ source: 'approved_reports', days, total, items: rows.map(row => ({ category: row.category, count: row.count, percent: total ? Math.round(100 * Number(row.count) / total) : 0 })) });
});
adminRouter.get('/system/health', (_req, res) => {
  db.prepare('SELECT 1').get();
  res.json({ api: 'ok', database: 'ok', uptimeSeconds: Math.floor(process.uptime()), aiConfigured: !!process.env.GEMINI_API_KEY?.trim(), measuredAt: stamp(), accuracyRate: null });
});
adminRouter.get('/system/request-logs', (req, res) => {
  const rows = db.prepare('SELECT * FROM admin_request_log ORDER BY id DESC LIMIT 1000').all();
  res.json(pick(rows.map(row => ({ id: row.id, method: row.method, path: row.path, status: row.status, durationMs: row.duration_ms, createdAt: row.created_at })), req));
});
adminRouter.get('/analysis/settings', (_req, res) => {
  const configured = !!process.env.GEMINI_API_KEY?.trim();
  const enabled = db.prepare('SELECT ai_enabled FROM analysis_settings WHERE id = 1').get()?.ai_enabled === 1;
  res.json({ configured, enabled, active: configured && enabled, model: process.env.GEMINI_MODEL || 'gemini-3.6-flash' });
});
adminRouter.patch('/analysis/settings', (req, res) => {
  if (typeof req.body?.enabled !== 'boolean') throw new ApiError(400, 'enabled phải là true hoặc false.');
  if (req.body.enabled && !process.env.GEMINI_API_KEY?.trim()) throw new ApiError(409, 'Cần cấu hình GEMINI_API_KEY trước khi bật AI.');
  db.prepare('UPDATE analysis_settings SET ai_enabled = ? WHERE id = 1').run(req.body.enabled ? 1 : 0);
  audit(req, 'analysis.settings', 'analysis', '1', req.body.enabled ? 'enabled' : 'disabled');
  res.json({ configured: !!process.env.GEMINI_API_KEY?.trim(), enabled: req.body.enabled, active: !!process.env.GEMINI_API_KEY?.trim() && req.body.enabled, model: process.env.GEMINI_MODEL || 'gemini-3.6-flash' });
});

// Curated rule and warning corpus. Keep source and review status with every imported warning.
adminRouter.get('/analysis/rules', (req, res) => {
  admin(req);
  const items = db.prepare('SELECT id,type,title,terms,weight,enabled,updated_at AS updatedAt FROM scam_rules ORDER BY type,id').all().map((row: any) => ({ ...row, terms: JSON.parse(row.terms) }));
  res.json({ items, total: items.length });
});
adminRouter.post('/analysis/rules', (req, res) => {
  const actor = admin(req);
  const id = textField(req.body?.id || randomUUID(), 'Mã quy tắc', 80);
  const type = ['sms', 'url', 'phone', 'bank', 'all'].includes(req.body?.type) ? req.body.type : null;
  if (!type) throw new ApiError(400, 'type không hợp lệ.');
  const title = textField(req.body?.title, 'Tên quy tắc', 160, 3);
  const terms = req.body?.terms;
  if (!Array.isArray(terms) || terms.length < 1 || terms.length > 100 || terms.some((term: unknown) => typeof term !== 'string' || term.trim().length < 2 || term.length > 120)) throw new ApiError(400, 'terms phải là danh sách 1–100 cụm từ.');
  const weight = Number(req.body?.weight);
  if (!Number.isInteger(weight) || weight < 1 || weight > 60) throw new ApiError(400, 'weight phải là số nguyên 1–60.');
  const updatedAt = stamp();
  try { db.prepare('INSERT INTO scam_rules (id,type,title,terms,weight,enabled,updated_at) VALUES (?,?,?,?,?,?,?)').run(id, type, title, JSON.stringify(terms.map((term: string) => term.trim())), weight, req.body.enabled === false ? 0 : 1, updatedAt); }
  catch { throw new ApiError(409, 'Mã quy tắc đã tồn tại.'); }
  audit(req, 'analysis.rule.create', 'analysis_rule', id, `${type}:${actor.id}`);
  res.status(201).json({ id, type, title, terms, weight, enabled: req.body.enabled !== false, updatedAt });
});
adminRouter.patch('/analysis/rules/:id', (req, res) => {
  admin(req);
  const existing = db.prepare('SELECT * FROM scam_rules WHERE id=?').get(req.params.id) as any;
  if (!existing) throw new ApiError(404, 'Không tìm thấy quy tắc.');
  const title = req.body.title === undefined ? existing.title : textField(req.body.title, 'Tên quy tắc', 160, 3);
  const terms = req.body.terms === undefined ? JSON.parse(existing.terms) : req.body.terms;
  if (!Array.isArray(terms) || terms.length < 1 || terms.length > 100 || terms.some((term: unknown) => typeof term !== 'string' || term.trim().length < 2 || term.length > 120)) throw new ApiError(400, 'terms phải là danh sách 1–100 cụm từ.');
  const weight = req.body.weight === undefined ? Number(existing.weight) : Number(req.body.weight);
  if (!Number.isInteger(weight) || weight < 1 || weight > 60) throw new ApiError(400, 'weight phải là số nguyên 1–60.');
  if (req.body.enabled !== undefined && typeof req.body.enabled !== 'boolean') throw new ApiError(400, 'enabled phải là true hoặc false.');
  const enabled = req.body.enabled === undefined ? Number(existing.enabled) : (req.body.enabled ? 1 : 0);
  const updatedAt = stamp();
  db.prepare('UPDATE scam_rules SET title=?,terms=?,weight=?,enabled=?,updated_at=? WHERE id=?').run(title, JSON.stringify(terms), weight, enabled, updatedAt, req.params.id);
  audit(req, 'analysis.rule.update', 'analysis_rule', req.params.id);
  res.json({ id: req.params.id, type: existing.type, title, terms, weight, enabled: !!enabled, updatedAt });
});
adminRouter.delete('/analysis/rules/:id', (req, res) => {
  admin(req);
  const changed = db.prepare('DELETE FROM scam_rules WHERE id=?').run(req.params.id).changes;
  if (!changed) throw new ApiError(404, 'Không tìm thấy quy tắc.');
  audit(req, 'analysis.rule.delete', 'analysis_rule', req.params.id);
  res.json({ success: true });
});
adminRouter.get('/analysis/intel', (req, res) => {
  admin(req);
  const items = db.prepare('SELECT id,title,category,summary,source_name AS sourceName,source_url AS sourceUrl,source_date AS sourceDate,terms,indicators,status,created_at AS createdAt FROM threat_intel ORDER BY source_date DESC,id').all().map((row: any) => ({ ...row, terms: JSON.parse(row.terms), indicators: JSON.parse(row.indicators) }));
  res.json({ items, total: items.length });
});
adminRouter.post('/analysis/intel', (req, res) => {
  admin(req);
  const id = textField(req.body?.id || randomUUID(), 'Mã cảnh báo', 100);
  const title = textField(req.body?.title, 'Tiêu đề', 200, 4);
  const category = textField(req.body?.category, 'Danh mục', 100, 2);
  const summary = textField(req.body?.summary, 'Tóm tắt', 2000, 10);
  const sourceName = textField(req.body?.sourceName, 'Nguồn', 200, 2);
  const sourceUrl = textField(req.body?.sourceUrl, 'URL nguồn', 1000);
  try { if (new URL(sourceUrl).protocol !== 'https:') throw new Error(); } catch { throw new ApiError(400, 'Nguồn phải là liên kết HTTPS hợp lệ.'); }
  const sourceDate = textField(req.body?.sourceDate, 'Ngày nguồn', 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(sourceDate)) throw new ApiError(400, 'sourceDate phải theo YYYY-MM-DD.');
  const terms = req.body?.terms ?? [];
  const indicators = req.body?.indicators ?? [];
  if (!Array.isArray(terms) || terms.length > 100 || terms.some((term: unknown) => typeof term !== 'string' || term.length < 2 || term.length > 120)) throw new ApiError(400, 'terms không hợp lệ.');
  if (!Array.isArray(indicators) || indicators.length > 100 || indicators.some((item: any) => !item || !['url','phone','bank'].includes(item.type) || typeof item.value !== 'string' || item.value.length < 3 || item.value.length > 2048)) throw new ApiError(400, 'indicators không hợp lệ.');
  try { db.prepare('INSERT INTO threat_intel (id,title,category,summary,source_name,source_url,source_date,terms,indicators,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)').run(id,title,category,summary,sourceName,sourceUrl,sourceDate,JSON.stringify(terms),JSON.stringify(indicators),'reviewed',stamp()); }
  catch { throw new ApiError(409, 'Mã cảnh báo đã tồn tại.'); }
  audit(req, 'analysis.intel.create', 'threat_intel', id, sourceUrl);
  res.status(201).json({ id, title, category, summary, sourceName, sourceUrl, sourceDate, terms, indicators, status: 'reviewed' });
});
adminRouter.patch('/analysis/intel/:id/status', (req, res) => {
  admin(req);
  if (!['reviewed','inactive'].includes(req.body?.status)) throw new ApiError(400, 'status phải là reviewed hoặc inactive.');
  const changed = db.prepare('UPDATE threat_intel SET status=? WHERE id=?').run(req.body.status, req.params.id).changes;
  if (!changed) throw new ApiError(404, 'Không tìm thấy cảnh báo.');
  audit(req, 'analysis.intel.status', 'threat_intel', req.params.id, req.body.status);
  res.json({ success: true, id: req.params.id, status: req.body.status });
});

adminRouter.get('/users/summary', (_req, res) => {
  const rows = db.prepare('SELECT role,status,COUNT(*) AS count FROM users GROUP BY role,status').all();
  res.json({ total: rows.reduce((sum, row) => sum + Number(row.count), 0), active: rows.filter(row => row.status === 'active').reduce((sum, row) => sum + Number(row.count), 0), locked: rows.filter(row => row.status === 'locked').reduce((sum, row) => sum + Number(row.count), 0), byRole: { member: rows.filter(row => !['admin','reviewer'].includes(String(row.role))).reduce((sum,row) => sum + Number(row.count), 0), reviewer: rows.filter(row => row.role === 'reviewer').reduce((sum,row) => sum + Number(row.count), 0), admin: rows.filter(row => row.role === 'admin').reduce((sum,row) => sum + Number(row.count), 0) } });
});
adminRouter.get('/users/export', (req, res) => {
  const rows = filteredUsers(req);
  res.type('text/csv; charset=utf-8').attachment('cyberaware-users.csv').send(csv(rows, ['id','name','email','role','status','createdAt','lastActiveAt']));
});
function filteredUsers(req: Request) {
  const q = String(req.query.q || '').trim().toLowerCase();
  const role = String(req.query.role || '');
  const status = String(req.query.status || '');
  return db.prepare('SELECT id,name,email,role,phone,avatar,status,created_at FROM users ORDER BY created_at DESC').all()
    .map(userView).filter(row => (!q || [row.id,row.name,row.email,row.phone].some(value => String(value).toLowerCase().includes(q))) && (!role || row.role === role) && (!status || row.status === status));
}
adminRouter.get('/users', (req, res) => res.json(pick(filteredUsers(req), req)));
adminRouter.get('/users/:id', (req, res) => res.json(userView(userRow(req.params.id))));
adminRouter.post('/users', rateLimit(10, 15 * 60_000), async (req, res, next) => {
  try {
  const name = textField(req.body?.name, 'Họ tên', 100, 2);
  const email = textField(req.body?.email, 'Email', 254, 5).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ApiError(400, 'Email không hợp lệ.');
  const role = req.body?.role || 'member';
  if (!['member','reviewer','admin'].includes(role)) throw new ApiError(400, 'Vai trò không hợp lệ.');
  if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) throw new ApiError(409, 'Email đã tồn tại.');
  const id = randomUUID();
  const temporaryPassword = randomBytes(32).toString('base64url');
  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare('INSERT INTO users (id,name,email,password_hash,password_version,role,level,avatar,created_at,status) VALUES (?,?,?,?,?,?,?,?,?,?)')
      .run(id, name, email, hashPassword(temporaryPassword), 0, role, role === 'admin' ? 'Quản trị viên' : 'Người tự vệ số', '', Date.now(), 'active');
    audit(req, 'user.create', 'user', id, `role=${role}`);
    db.exec('COMMIT');
  } catch (error) { db.exec('ROLLBACK'); throw error; }
  try {
    const setup = await sendAccountSetupCode(id);
    res.status(201).json({ user: userView(userRow(id)), setup });
  } catch (error) {
    console.error('Không gửi được mã đặt mật khẩu tài khoản mới:', error);
    res.status(201).json({ user: userView(userRow(id)), setup: { deliveryMode: 'failed', message: 'Tài khoản đã tạo nhưng chưa gửi được mã. Hãy cấu hình SMTP rồi gửi lại mã.' } });
  }
  } catch (error) { next(error); }
});
adminRouter.patch('/users/:id/role', (req, res) => {
  const row = userRow(req.params.id); const role = req.body?.role;
  if (!['member','reviewer','admin'].includes(role)) throw new ApiError(400, 'Vai trò không hợp lệ.');
  if (role === row.role) { res.json({ user: userView(row) }); return; }
  if (row.id === admin(req).id && role !== 'admin') throw new ApiError(409, 'Không thể tự gỡ quyền quản trị của phiên hiện tại.');
  if (row.role === 'admin' && role !== 'admin' && n("SELECT COUNT(*) AS n FROM users WHERE role = 'admin'") <= 1) throw new ApiError(409, 'Cần giữ ít nhất một quản trị viên.');
  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare('UPDATE users SET role = ?, password_version = password_version + 1 WHERE id = ?').run(role, row.id);
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(row.id);
    audit(req, 'user.role', 'user', row.id, `${row.role} -> ${role}`);
    db.exec('COMMIT');
  } catch (error) { db.exec('ROLLBACK'); throw error; }
  res.json({ user: userView(userRow(row.id)) });
});
adminRouter.post('/users/:id/lock', (req, res) => {
  const row = userRow(req.params.id);
  if (row.id === admin(req).id) throw new ApiError(409, 'Không thể tự khóa tài khoản quản trị đang dùng.');
  if (row.role === 'admin' && n("SELECT COUNT(*) AS n FROM users WHERE role = 'admin' AND status = 'active'") <= 1) throw new ApiError(409, 'Cần giữ ít nhất một quản trị viên đang hoạt động.');
  const reason = textField(req.body?.reason, 'Lý do khóa', 1000, 3);
  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare("UPDATE users SET status = 'locked',password_version = password_version + 1 WHERE id = ?").run(row.id);
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(row.id);
    db.prepare('INSERT INTO admin_user_locks VALUES (?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET reason=excluded.reason,actor_id=excluded.actor_id,updated_at=excluded.updated_at').run(row.id, reason, admin(req).id, stamp());
    audit(req, 'user.lock', 'user', row.id, reason);
    db.exec('COMMIT');
  } catch (error) { db.exec('ROLLBACK'); throw error; }
  res.json({ user: userView(userRow(row.id)) });
});
adminRouter.post('/users/:id/unlock', (req, res) => {
  const row = userRow(req.params.id);
  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare("UPDATE users SET status = 'active' WHERE id = ?").run(row.id);
    db.prepare('DELETE FROM admin_user_locks WHERE user_id = ?').run(row.id);
    audit(req, 'user.unlock', 'user', row.id);
    db.exec('COMMIT');
  } catch (error) { db.exec('ROLLBACK'); throw error; }
  res.json({ user: userView(userRow(row.id)) });
});
adminRouter.post('/users/:id/invitation/resend', rateLimit(10, 15 * 60_000), async (req, res, next) => {
  try { const row = userRow(req.params.id); const setup = await sendAccountSetupCode(String(row.id)); audit(req, 'user.setup-code', 'user', String(row.id)); res.json({ success: true, setup }); }
  catch (error) { next(error); }
});

function filteredCourses(req: Request) {
  const q = String(req.query.q || '').trim().toLowerCase();
  const status = String(req.query.status || '');
  const topic = String(req.query.topic || '');
  return catalogItems('course').map(courseView).filter(c => (!q || [c.code,c.title,c.description].some(value => value.toLowerCase().includes(q))) && (!status || c.status === status) && (!topic || c.topicKey === topic)).sort((a,b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
}
adminRouter.get('/courses/summary', (_req, res) => {
  const list = catalogItems('course').map(courseView);
  res.json({ total: list.length, published: list.filter(c => c.status === 'published').length, draft: list.filter(c => c.status === 'draft').length, archived: list.filter(c => c.status === 'archived').length, lessons: list.reduce((sum,c) => sum + c.microLessonsCount, 0) });
});
adminRouter.get('/courses/export', (req, res) => res.type('text/csv; charset=utf-8').attachment('cyberaware-courses.csv').send(csv(filteredCourses(req), ['code','title','description','topic','status','microLessonsCount','quizCount','updatedAt'])));
adminRouter.get('/courses', (req, res) => res.json(pick(filteredCourses(req), req)));
adminRouter.get('/courses/:id', (req, res) => {
  const c = course(req.params.id);
  res.json({ ...courseView(c), lessons: c.modules });
});
function courseBody(req: Request, old?: any) {
  const title = textField(req.body?.title ?? old?.title, 'Tên khóa học', 200, 3);
  const description = textField(req.body?.description ?? old?.description ?? '', 'Mô tả', 3000, 0);
  const topic = textField(req.body?.topic ?? old?.topic ?? 'Khác', 'Chủ đề', 100, 2);
  const topicKey = textField(req.body?.topicKey ?? old?.topicKey ?? 'other', 'Mã chủ đề', 60, 2);
  const code = textField(req.body?.code ?? old?.code ?? '', 'Mã khóa học', 40, 2);
  if (catalogItems('course').some(c => c.code === code && c.id !== old?.id)) throw new ApiError(409, 'Mã khóa học đã tồn tại.');
  let incidentGuidance = old?.incidentGuidance || null;
  if (req.body?.incidentGuidance !== undefined) {
    const guidance = req.body.incidentGuidance;
    if (guidance === null) incidentGuidance = null;
    else {
      if (!guidance || typeof guidance !== 'object' || Array.isArray(guidance) || !Array.isArray(guidance.steps) || guidance.steps.length < 2 || guidance.steps.length > 6) throw new ApiError(400, 'Hướng xử lý cần từ 2 đến 6 bước.');
      incidentGuidance = {
        title: textField(guidance.title, 'Tiêu đề hướng xử lý', 150, 5),
        intro: textField(guidance.intro, 'Tình huống cần xử lý', 500, 15),
        steps: guidance.steps.map((step: unknown) => textField(step, 'Bước xử lý', 500, 15)),
      };
    }
  }
  return { title, description, topic, topicKey, code, incidentGuidance };
}
adminRouter.post('/courses', (req, res) => {
  const id = randomUUID();
  const body = courseBody(req);
  const c = { id, ...body, category: body.topic, tag: body.topic, duration: '0 phút', lessonsCount: 0, rating: 0, learnersCount: 0, thumbnail: '', modules: [], status: 'draft', updatedAt: stamp() };
  json('course', id, c); audit(req, 'course.create', 'course', id);
  res.status(201).json(courseView(c));
});
adminRouter.patch('/courses/:id', (req, res) => {
  const c = course(req.params.id); const body = courseBody(req, c);
  Object.assign(c, body, { category: body.topic, updatedAt: stamp() });
  json('course', c.id, c); audit(req, 'course.update', 'course', c.id);
  res.json(courseView(c));
});
adminRouter.patch('/courses/:id/status', (req, res) => {
  const c = course(req.params.id); const status = req.body?.status;
  if (!['draft','published','archived'].includes(status)) throw new ApiError(400, 'Trạng thái không hợp lệ.');
  if (status === 'published') {
    const lessons = c.modules.filter((m: any) => m.type !== 'quiz');
    const exam = c.modules.find((m: any) => m.type === 'quiz');
    const active = (exam ? catalogItem('quiz', exam.quizId)?.questions || [] : []).filter((q: any) => q.status !== 'review' && q.status !== 'archived');
    const legacyFinal = !c.modules.some((module: any) => Array.isArray(module.questionIds));
    if (!lessons.length || !lessons.every((m: any) => typeof m.content === 'string' && m.content.trim().length >= 20) || !exam || !active.some((q: any) => legacyFinal || exam.questionIds?.includes(q.id))) throw new ApiError(409, 'Cần ít nhất một bài học có nội dung và một câu hỏi đang dùng được gán vào kiểm tra cuối khóa trước khi phát hành.');
  }
  c.status = status; c.updatedAt = stamp();
  json('course', c.id, c); audit(req, 'course.status', 'course', c.id, status);
  res.json(courseView(c));
});
adminRouter.post('/courses/:id/lessons', (req, res) => {
  const c = course(req.params.id);
  const title = textField(req.body?.title, 'Tiêu đề bài học', 200, 3);
  const duration = textField(req.body?.duration || '3 phút', 'Thời lượng', 60, 2);
  const content = textField(req.body?.content || '', 'Nội dung', 15000, 0);
  const lesson = { id: randomUUID(), title, duration, content, type: 'interactive', order: c.modules.filter((m: any) => m.type !== 'quiz').length + 1 };
  c.modules.splice(c.modules.findIndex((m: any) => m.type === 'quiz') < 0 ? c.modules.length : c.modules.findIndex((m: any) => m.type === 'quiz'), 0, lesson);
  c.lessonsCount = c.modules.length; c.updatedAt = stamp();
  json('course', c.id, c); audit(req, 'lesson.create', 'lesson', lesson.id, c.id);
  res.status(201).json(lesson);
});
adminRouter.post('/courses/:id/exams', (req, res) => {
  const c = course(req.params.id);
  if (c.modules.some((module: any) => module.type === 'quiz')) throw new ApiError(409, 'Khóa học đã có bài kiểm tra cuối khóa.');
  const quizId = `${c.id}-quiz`;
  const exam = { id: randomUUID(), title: textField(req.body?.title || 'Kiểm tra cuối khóa', 'Tiêu đề', 200, 3), duration: textField(req.body?.duration || '8 phút', 'Thời lượng', 60, 2), content: textField(req.body?.content || 'Đạt ít nhất 80% để hoàn thành khóa học.', 'Nội dung', 15000, 0), type: 'quiz', quizId, questionIds: [] as string[], createdAt: stamp() };
  if (!catalogItem('quiz', quizId)) json('quiz', quizId, { id: quizId, courseId: c.id, questions: [] });
  c.modules.push(exam); c.lessonsCount = c.modules.length; c.updatedAt = stamp();
  json('course', c.id, c); audit(req, 'exam.create', 'course', c.id);
  res.status(201).json(exam);
});
function lesson(courseId: string, lessonId: string) {
  const c = course(courseId);
  const index = c.modules.findIndex((m: any) => m.id === lessonId);
  if (index < 0) throw new ApiError(404, 'Không tìm thấy bài học.');
  return { c, index, value: c.modules[index] };
}
adminRouter.get('/courses/:id/lessons/:lessonId', (req, res) => res.json(lesson(req.params.id, req.params.lessonId).value));
adminRouter.patch('/courses/:id/lessons/:lessonId', (req, res) => {
  const found = lesson(req.params.id, req.params.lessonId);
  const value = { ...found.value, title: textField(req.body?.title ?? found.value.title, 'Tiêu đề', 200, 3), duration: textField(req.body?.duration ?? found.value.duration, 'Thời lượng', 60, 2), content: textField(req.body?.content ?? found.value.content, 'Nội dung', 15000, 0) };
  found.c.modules[found.index] = value; found.c.updatedAt = stamp();
  json('course', found.c.id, found.c); audit(req, 'lesson.update', 'lesson', value.id);
  res.json(value);
});
adminRouter.delete('/courses/:id/lessons/:lessonId', (req, res) => {
  const found = lesson(req.params.id, req.params.lessonId);
  if (found.value.type !== 'quiz' && (found.c.status || 'published') === 'published' && found.c.modules.filter((m: any) => m.type !== 'quiz').length <= 1) throw new ApiError(409, 'Khóa học đang phát hành cần ít nhất một bài học; hãy lưu trữ khóa trước.');
  if (found.value.type !== 'quiz' && n('SELECT COUNT(*) AS n FROM lesson_progress WHERE course_id = ? AND lesson_id = ?', found.c.id, found.value.id)) throw new ApiError(409, 'Bài học đã có tiến độ học viên; hãy lưu trữ khóa hoặc sửa nội dung.');
  if (found.value.type === 'quiz' && (found.c.status || 'published') === 'published') found.c.status = 'draft';
  found.c.modules.splice(found.index, 1); found.c.lessonsCount = found.c.modules.length; found.c.updatedAt = stamp();
  json('course', found.c.id, found.c); audit(req, 'lesson.delete', 'lesson', found.value.id);
  res.json({ success: true, courseStatus: found.c.status });
});
adminRouter.put('/courses/:id/lessons/order', (req, res) => {
  const c = course(req.params.id);
  const ids = req.body?.lessonIds;
  const lessons = c.modules.filter((m: any) => m.type !== 'quiz');
  if (!Array.isArray(ids) || ids.length !== lessons.length || new Set(ids).size !== lessons.length || ids.some(id => !lessons.some((m: any) => m.id === id))) throw new ApiError(400, 'Danh sách thứ tự bài học không hợp lệ.');
  c.modules = [...ids.map((id: string, i: number) => ({ ...lessons.find((m: any) => m.id === id), order: i + 1 })), ...c.modules.filter((m: any) => m.type === 'quiz')];
  c.updatedAt = stamp(); json('course', c.id, c); audit(req, 'lesson.reorder', 'course', c.id);
  res.json({ lessons: c.modules.filter((m: any) => m.type !== 'quiz') });
});
adminRouter.put('/courses/:id/lessons/:lessonId/questions', (req, res) => {
  const c = course(req.params.id);
  const index = c.modules.findIndex((module: any) => module.id === req.params.lessonId);
  if (index < 0) throw new ApiError(404, 'Không tìm thấy phần học.');
  const ids = req.body?.questionIds;
  if (!Array.isArray(ids) || new Set(ids).size !== ids.length || ids.some(id => typeof id !== 'string' || !allQuestions().some(q => q.id === id && q.courseId === c.id))) throw new ApiError(400, 'Danh sách câu hỏi không hợp lệ.');
  c.modules[index].questionIds = ids; c.updatedAt = stamp();
  json('course', c.id, c); audit(req, 'lesson.questions', 'lesson', req.params.lessonId, ids.join(','));
  res.json({ questionIds: ids });
});

adminRouter.get('/questions/summary', (_req, res) => {
  const questions = allQuestions();
  const scored = questions.map(questionView).filter(q => q.attempts > 0);
  const totalAttempts = scored.reduce((sum, q) => sum + q.attempts, 0);
  res.json({ total: questions.filter(q => q.status !== 'archived').length, active: questions.filter(q => q.status === 'active').length, review: questions.filter(q => q.status === 'review').length, urgent: questions.filter(q => q.difficulty === 'Tình huống khẩn cấp').length, averageAccuracy: totalAttempts ? Math.round(scored.reduce((sum,q) => sum + Number(q.accuracyRate) * q.attempts, 0) / totalAttempts) : null, attempts: totalAttempts });
});
adminRouter.get('/questions', (req, res) => {
  const q = String(req.query.q || '').toLowerCase();
  const courseId = String(req.query.courseId || '');
  const difficulty = String(req.query.difficulty || '');
  const status = String(req.query.status || '');
  const rows = allQuestions().filter(item => (!q || [item.id,item.question].some((value: string) => value.toLowerCase().includes(q))) && (!courseId || item.courseId === courseId) && (!difficulty || item.difficulty === difficulty) && (!status || item.status === status)).map(questionView);
  res.json(pick(rows, req));
});
adminRouter.get('/questions/:id', (req, res) => {
  const found = questionLocation(req.params.id);
  res.json(questionView({ ...found.question, courseId: found.quiz.courseId, quizId: found.quiz.id }));
});
adminRouter.post('/questions', (req, res) => {
  const body = questionBody(req);
  const id = randomUUID();
  const q = { id, question: body.question, options: body.options, correctIndex: body.correctIndex, explanation: body.explanation, optionExplanations: body.optionExplanations, difficulty: body.difficulty, status: 'review', updatedAt: stamp() };
  saveQuestion(body.courseId, q); audit(req, 'question.create', 'question', id, body.courseId);
  res.status(201).json(questionView({ ...q, courseId: body.courseId }));
});
adminRouter.patch('/questions/:id', (req, res) => {
  const found = questionLocation(req.params.id);
  const body = questionBody(req, { ...found.question, courseId: found.quiz.courseId, status: found.question.status || 'active' });
  const q = { ...found.question, question: body.question, options: body.options, correctIndex: body.correctIndex, explanation: body.explanation, optionExplanations: body.optionExplanations, difficulty: body.difficulty, status: body.status, updatedAt: stamp() };
  if (body.courseId === found.quiz.courseId) {
    found.quiz.questions[found.index] = q; json('quiz', found.quiz.id, found.quiz);
  } else {
    if ((found.question.status || 'active') === 'active' && (course(found.quiz.courseId).status || 'published') === 'published' && found.quiz.questions.filter((item: any) => item.id !== found.question.id && (!item.status || item.status === 'active')).length === 0) throw new ApiError(409, 'Không thể chuyển câu hỏi đang dùng cuối cùng khỏi khóa học đã phát hành.');
    if (n('SELECT COUNT(*) AS n FROM submissions WHERE course_id = ?', found.quiz.courseId)) throw new ApiError(409, 'Không thể chuyển câu hỏi đã có bài nộp sang khóa khác.');
    found.quiz.questions.splice(found.index, 1); json('quiz', found.quiz.id, found.quiz); saveQuestion(body.courseId, q);
  }
  audit(req, 'question.update', 'question', q.id);
  res.json(questionView({ ...q, courseId: body.courseId }));
});
adminRouter.post('/questions/:id/duplicate', (req, res) => {
  const found = questionLocation(req.params.id);
  const q = { ...found.question, id: randomUUID(), status: 'review', updatedAt: stamp() };
  saveQuestion(found.quiz.courseId, q); audit(req, 'question.duplicate', 'question', q.id, found.question.id);
  res.status(201).json(questionView({ ...q, courseId: found.quiz.courseId }));
});
adminRouter.patch('/questions/:id/status', (req, res) => {
  const found = questionLocation(req.params.id);
  const status = req.body?.status;
  if (!['review','active','archived'].includes(status)) throw new ApiError(400, 'Trạng thái câu hỏi không hợp lệ.');
  if (status !== 'active' && (found.question.status || 'active') === 'active' && (course(found.quiz.courseId).status || 'published') === 'published' && found.quiz.questions.filter((q: any) => q.id !== found.question.id && (!q.status || q.status === 'active')).length === 0) throw new ApiError(409, 'Khóa học đang phát hành cần ít nhất một câu hỏi đang dùng.');
  found.quiz.questions[found.index].status = status;
  json('quiz', found.quiz.id, found.quiz); audit(req, 'question.status', 'question', found.question.id, status);
  res.json(questionView({ ...found.quiz.questions[found.index], courseId: found.quiz.courseId }));
});
adminRouter.delete('/questions/:id', (req, res) => {
  const found = questionLocation(req.params.id);
  if ((found.question.status || 'active') === 'active' && (course(found.quiz.courseId).status || 'published') === 'published' && found.quiz.questions.filter((q: any) => q.id !== found.question.id && (!q.status || q.status === 'active')).length === 0) throw new ApiError(409, 'Hãy lưu trữ khóa học hoặc thêm câu hỏi khác trước khi lưu trữ câu cuối cùng.');
  found.quiz.questions[found.index].status = 'archived';
  json('quiz', found.quiz.id, found.quiz); audit(req, 'question.archive', 'question', found.question.id);
  res.json({ success: true });
});
adminRouter.get('/questions/import/template', (_req, res) => {
  res.type('text/csv; charset=utf-8').attachment('cyberaware-question-template.csv').send('\uFEFFcourseId,question,A,B,C,D,correct,explanation,explanationA,explanationB,explanationC,explanationD,difficulty\r\n');
});
function importRows(req: Request) {
  const rows = req.body?.rows;
  if (!Array.isArray(rows) || !rows.length || rows.length > 100) throw new ApiError(400, 'Cần từ 1 đến 100 câu hỏi mỗi lần nhập.');
  return rows.map((row, index) => {
    try { return questionBody(Object.assign(Object.create(req), { body: row }) as Request); }
    catch (error) { if (error instanceof Error) throw new ApiError(400, `Dòng ${index + 2}: ${error.message}`); throw error; }
  });
}
adminRouter.post('/questions/import/preview', (req, res) => {
  const rows = importRows(req);
  res.json({ valid: true, count: rows.length, items: rows.map(row => ({ courseId: row.courseId, question: row.question, difficulty: row.difficulty })) });
});
adminRouter.post('/questions/import/commit', (req, res) => {
  const rows = importRows(req);
  const ids: string[] = [];
  db.exec('BEGIN IMMEDIATE');
  try {
    for (const row of rows) {
      const id = randomUUID(); ids.push(id);
      saveQuestion(row.courseId, { id, question: row.question, options: row.options, correctIndex: row.correctIndex, explanation: row.explanation, optionExplanations: row.optionExplanations, difficulty: row.difficulty, status: 'review', updatedAt: stamp() });
      audit(req, 'question.import', 'question', id, row.courseId);
    }
    db.exec('COMMIT');
  } catch (error) { db.exec('ROLLBACK'); throw error; }
  res.status(201).json({ created: ids.length, ids, status: 'review' });
});
