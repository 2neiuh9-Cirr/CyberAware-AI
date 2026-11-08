import { Router, type Request, type Response, type NextFunction } from 'express';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { currentUser, me, publicUser } from '../auth';
import { db, catalogItem, catalogItems } from './database';
import { ApiError, integer, rateLimit, textField } from './http';
import { analyze, normalizeQuery, scanType } from './analysis';

export const apiRouter = Router();
const now = () => new Date().toISOString();
const avatarDir = path.resolve(process.env.AUTH_DATA_DIR || 'data', 'avatars');
mkdirSync(avatarDir, { recursive: true });
db.exec('CREATE TABLE IF NOT EXISTS privacy_settings (user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, auto_delete_30_days INTEGER NOT NULL DEFAULT 0, anonymous_scam_sharing INTEGER NOT NULL DEFAULT 0, email_bank_alerts INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL)');
db.exec('CREATE TABLE IF NOT EXISTS certificates (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, course_id TEXT NOT NULL, code TEXT NOT NULL UNIQUE, issued_at TEXT NOT NULL, UNIQUE(user_id,course_id))');

function privacy(userId: string) {
  const row = db.prepare('SELECT * FROM privacy_settings WHERE user_id = ?').get(userId) as Record<string, unknown> | undefined;
  return { autoDelete30Days: !!row?.auto_delete_30_days, anonymousScamSharing: !!row?.anonymous_scam_sharing, emailBankAlerts: !!row?.email_bank_alerts, updatedAt: row?.updated_at || null };
}
function purgeExpiredScans() {
  db.prepare('DELETE FROM scans WHERE created_at < ? AND user_id IN (SELECT user_id FROM privacy_settings WHERE auto_delete_30_days = 1)').run(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
}
const cleanup = setInterval(purgeExpiredScans, 60 * 60 * 1000);
cleanup.unref();

function ensureCertificates(userId: string) {
  // Earlier empty draft courses could issue certificates without a passing exam.
  db.prepare('DELETE FROM certificates WHERE user_id = ? AND NOT EXISTS (SELECT 1 FROM submissions WHERE submissions.user_id = certificates.user_id AND submissions.course_id = certificates.course_id AND submissions.score >= 80)').run(userId);
  const done = progress(userId).completedCourseIds;
  for (const courseId of done) {
    const course = catalogItem('course', courseId);
    if (!course || (course.status || 'published') === 'draft') continue;
    const exams = course.modules.filter((lesson: any) => lesson.type === 'quiz');
    if (!exams.length || !exams.every((exam: any) => examPassed(userId, exam))) continue;
    db.prepare('INSERT OR IGNORE INTO certificates (id,user_id,course_id,code,issued_at) VALUES (?,?,?,?,?)').run(randomUUID(), userId, courseId, randomUUID().replace(/-/g, '').slice(0, 20).toUpperCase(), now());
  }
}
function user(req: Request) {
  const value = currentUser(req);
  if (!value) throw new ApiError(401, 'Vui lòng đăng nhập để thực hiện thao tác này.');
  return value;
}
function item(kind: string, id: string) {
  const value = catalogItem(kind, id);
  if (!value) throw new ApiError(404, 'Không tìm thấy nội dung.');
  return value;
}
function report(id: string) {
  const row = db.prepare('SELECT * FROM reports WHERE id = ?').get(id);
  if (!row) throw new ApiError(404, 'Không tìm thấy báo cáo.');
  return row;
}
function publicReport(row: any, userId?: string) {
  return { id: row.id, type: row.type, target: row.target, category: row.category, description: row.description,
    status: row.status, verified: row.status === 'approved',
    riskScore: null, reportedAt: row.created_at, createdAt: row.created_at,
    votes: Number(db.prepare('SELECT COUNT(*) AS n FROM votes WHERE report_id = ?').get(row.id)!.n),
    votedByMe: !!(userId && db.prepare('SELECT 1 FROM votes WHERE report_id = ? AND user_id = ?').get(row.id, userId)),
  };
}
function progress(userId: string) {
  const lessonProgress = db.prepare('SELECT course_id AS courseId, lesson_id AS lessonId, completed_at AS completedAt FROM lesson_progress WHERE user_id = ?').all(userId);
  const completedCourseIds = catalogItems('course').filter(course =>
    (course.status || 'published') !== 'draft' &&
    course.modules.some((lesson: any) => lesson.type !== 'quiz') &&
    course.modules.some((lesson: any) => lesson.type === 'quiz') &&
    course.modules.every((lesson: any) => lessonProgress.some(p => p.courseId === course.id && p.lessonId === lesson.id)) &&
    course.modules.filter((lesson: any) => lesson.type === 'quiz').every((exam: any) => examPassed(userId, exam))
  ).map(course => course.id);
  return { completedCourseIds, lessonProgress };
}
function examPassed(userId: string, exam: any) {
  return !!db.prepare('SELECT 1 FROM submissions WHERE user_id = ? AND quiz_id = ? AND score >= 80 AND created_at >= ?').get(userId, exam.quizId, exam.createdAt || '');
}
function publicCourse(course: any) {
  return { ...course, modules: course.modules.map(({ content, ...lesson }: any) => lesson),
    learnersCount: Number(db.prepare('SELECT COUNT(DISTINCT user_id) AS n FROM lesson_progress WHERE course_id = ?').get(course.id)!.n) };
}
function activeQuizQuestions(quiz: any, course: any, module: any) {
  const assigned = module.questionIds;
  // Older courses have no assignments; keep their original final exam until edited.
  const legacyFinal = module.type === 'quiz' && !course.modules.some((entry: any) => Array.isArray(entry.questionIds));
  const ids = Array.isArray(assigned) ? assigned : [];
  return quiz.questions.filter((question: any) => (!question.status || question.status === 'active') && (legacyFinal || ids.includes(question.id)));
}
apiRouter.get('/health', (_req, res) => { db.prepare('SELECT 1').get(); res.json({ status: 'ok', database: 'ok', timestamp: now() }); });
apiRouter.get('/public-warnings/featured', (_req, res) => {
  // Keep the home page editorially small and link only to vetted public sources.
  const featuredIds = [
    'vn-20261105-alert-11', 'vn-20261105-alert-20', 'vn-20261105-alert-14',
    'vn-20261105-alert-08', 'vn-20261105-alert-17', 'vn-20261105-alert-13',
    'vn-20261105-alert-19',
  ];
  const rows = db.prepare(`SELECT id,title,category,summary,source_name AS sourceName,
    source_url AS sourceUrl,source_date AS sourceDate FROM threat_intel
    WHERE status = 'reviewed' AND id IN (${featuredIds.map(() => '?').join(',')})`).all(...featuredIds);
  const trustedHosts = new Set(['baochinhphu.vn', 'thanglong.baochinhphu.vn', 'bocongan.gov.vn', 'www.bocongan.gov.vn', 'mps.gov.vn', 'www.mps.gov.vn']);
  const items = rows.filter((row: any) => {
    try { const url = new URL(row.sourceUrl); return url.protocol === 'https:' && trustedHosts.has(url.hostname); }
    catch { return false; }
  }).sort((a: any, b: any) => featuredIds.indexOf(a.id) - featuredIds.indexOf(b.id));
  res.json({ items });
});
apiRouter.get('/featured-video', (_req, res) => {
  res.json({
    provider: 'youtube',
    videoId: '7KeIXo0G0ws',
    title: "Cuộc gọi từ 'người thân' hóa ác mộng: Chiêu lừa đảo bằng A.I khiến nhiều người trắng tay | VTV Times",
    embedUrl: 'https://www.youtube.com/embed/7KeIXo0G0ws',
    watchUrl: 'https://www.youtube.com/watch?v=7KeIXo0G0ws',
  });
});
apiRouter.get('/me', me);
apiRouter.patch('/me/profile', (req, res) => {
  const account = user(req);
  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body) || !Object.keys(body).length || Object.keys(body).some(key => !['name', 'phone'].includes(key))) throw new ApiError(400, 'Chỉ có thể cập nhật họ tên và số điện thoại.');
  const name = body.name === undefined ? account.name : textField(body.name, 'Họ tên', 100, 2);
  let phone = account.phone || '';
  if (body.phone !== undefined) {
    if (typeof body.phone !== 'string') throw new ApiError(400, 'Số điện thoại không hợp lệ.');
    phone = body.phone.replace(/[\s.()-]/g, '');
    if (phone && !/^\+?\d{9,15}$/.test(phone)) throw new ApiError(400, 'Số điện thoại phải có từ 9 đến 15 chữ số.');
  }
  db.prepare('UPDATE users SET name = ?, phone = ? WHERE id = ?').run(name, phone || null, account.id);
  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(account.id) as typeof account;
  res.json({ success: true, user: publicUser(updated) });
});

apiRouter.put('/me/avatar', (req, res) => {
  const account = user(req);
  const input = req.body?.dataUrl;
  const match = typeof input === 'string' ? /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(input) : null;
  if (!match) throw new ApiError(400, 'Ảnh phải là JPEG, PNG hoặc WebP.');
  const image = Buffer.from(match[2], 'base64');
  if (!image.length || image.length > 256 * 1024) throw new ApiError(400, 'Ảnh đại diện phải nhỏ hơn 256 KB.');
  const mime = match[1];
  const valid = mime === 'png' ? image.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) : mime === 'jpeg' ? image[0] === 255 && image[1] === 216 && image[2] === 255 : image.subarray(0, 12).toString('ascii', 0, 4) === 'RIFF' && image.subarray(8, 12).toString('ascii') === 'WEBP';
  if (!valid) throw new ApiError(400, 'Nội dung ảnh không đúng định dạng.');
  writeFileSync(path.join(avatarDir, account.id), image, { mode: 0o600 });
  const avatar = `/api/me/avatar?v=${Date.now()}`;
  db.prepare('UPDATE users SET avatar = ? WHERE id = ?').run(avatar, account.id);
  res.json({ success: true, avatar });
});

apiRouter.get('/me/avatar', (req, res) => {
  const account = user(req);
  const file = path.join(avatarDir, account.id);
  if (!existsSync(file)) throw new ApiError(404, 'Chưa có ảnh đại diện đã tải lên.');
  const image = readFileSync(file);
  const mime = image.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ? 'image/png' : image[0] === 255 && image[1] === 216 ? 'image/jpeg' : 'image/webp';
  res.type(mime).send(image);
});

apiRouter.get('/me/privacy-settings', (req, res) => res.json(privacy(user(req).id)));
apiRouter.patch('/me/privacy-settings', (req, res) => {
  const account = user(req);
  const body = req.body;
  const allowed = ['autoDelete30Days', 'anonymousScamSharing', 'emailBankAlerts'];
  if (!body || typeof body !== 'object' || Array.isArray(body) || !Object.keys(body).length || Object.keys(body).some(key => !allowed.includes(key) || typeof body[key] !== 'boolean')) throw new ApiError(400, 'Tùy chọn quyền riêng tư không hợp lệ.');
  const next = { ...privacy(account.id), ...body };
  db.prepare('INSERT INTO privacy_settings (user_id,auto_delete_30_days,anonymous_scam_sharing,email_bank_alerts,updated_at) VALUES (?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET auto_delete_30_days=excluded.auto_delete_30_days,anonymous_scam_sharing=excluded.anonymous_scam_sharing,email_bank_alerts=excluded.email_bank_alerts,updated_at=excluded.updated_at').run(account.id, next.autoDelete30Days ? 1 : 0, next.anonymousScamSharing ? 1 : 0, next.emailBankAlerts ? 1 : 0, now());
  if (next.autoDelete30Days) purgeExpiredScans();
  res.json({ success: true, settings: privacy(account.id) });
});

apiRouter.get('/me/certificates', (req, res) => {
  const account = user(req);
  ensureCertificates(account.id);
  const rows = db.prepare('SELECT id,course_id,code,issued_at FROM certificates WHERE user_id = ? ORDER BY issued_at DESC').all(account.id);
  res.json({ items: rows.map(row => ({ id: row.id, courseId: row.course_id, courseTitle: catalogItem('course', String(row.course_id))?.title || 'Khóa học', code: row.code, issuedAt: row.issued_at })) });
});
apiRouter.post('/analyze', rateLimit(30, 60_000), async (req, res, next) => {
  try {
    const type = scanType(req.body?.type); const query = normalizeQuery(type, req.body?.query);
    const account = currentUser(req);
    if (!account && (req.headers.authorization || req.headers.cookie?.includes('cyberaware_session='))) throw new ApiError(401, 'Phiên đã hết hạn. Hãy đăng nhập lại hoặc quét với tư cách khách.');
    const matching = !!db.prepare("SELECT 1 FROM reports WHERE type = ? AND target = ? AND status = 'approved'").get(type, query);
    const result = { ...await analyze(type, query, matching), id: randomUUID() };
    const stored = account ? result : { ...result, query: '[Khách: không lưu nội dung]', flags: [], aiReasoning: undefined, actionAdvice: undefined, threatCategory: undefined };
    db.prepare('INSERT INTO scans (id,user_id,result,created_at) VALUES (?,?,?,?)').run(result.id, account?.id || null, JSON.stringify(stored), result.scannedAt);
    res.json(result);
  } catch (error) { next(error); }
});
apiRouter.get('/scans', (req, res) => {
  const account = user(req); const limit = integer(req.query.limit, 20, 100);
  const cursor = integer(req.query.cursor, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER);
  const rows = db.prepare('SELECT seq,result FROM scans WHERE user_id = ? AND seq < ? ORDER BY seq DESC LIMIT ?').all(account.id, cursor, limit + 1);
  res.json({ items: rows.slice(0, limit).map(row => JSON.parse(String(row.result))), nextCursor: rows.length > limit ? String(rows[limit - 1].seq) : null });
});
apiRouter.get('/scans/:id', (req, res) => {
  const account = user(req);
  const row = db.prepare('SELECT result FROM scans WHERE id = ? AND user_id = ?').get(req.params.id, account.id);
  if (!row) throw new ApiError(404, 'Không tìm thấy lần quét của bạn.');
  res.json(JSON.parse(String(row.result)));
});
apiRouter.get('/reports', (req, res) => {
  const account = currentUser(req); const mine = req.query.mine === 'true';
  if (mine && !account) throw new ApiError(401, 'Vui lòng đăng nhập.');
  const status = req.query.status ?? (mine ? 'all' : 'community');
  if (!['pending', 'approved', 'rejected', 'unverified', 'community', 'all'].includes(status as string)) throw new ApiError(400, 'Trạng thái không hợp lệ.');
  if (!['approved', 'unverified', 'community'].includes(status as string) && !mine && account?.role !== 'admin') throw new ApiError(403, 'Chỉ quản trị viên được xem hàng chờ duyệt.');
  const where = ['1=1']; const params: any[] = [];
  if (status === 'community') where.push("status IN ('approved','unverified')");
  else if (status !== 'all') { where.push('status = ?'); params.push(status); }
  if (mine) { where.push('user_id = ?'); params.push(account!.id); }
  if (req.query.type) { where.push('type = ?'); params.push(scanType(req.query.type)); }
  if (req.query.q !== undefined) {
    const q = textField(req.query.q, 'q', 200, 0).toLowerCase();
    where.push('(instr(lower(target), ?) > 0 OR instr(lower(category), ?) > 0 OR instr(lower(description), ?) > 0)'); params.push(q, q, q);
  }
  const page = integer(req.query.page, 1, 100000); const pageSize = integer(req.query.pageSize, 20, 100);
  const sql = where.join(' AND ');
  const total = Number(db.prepare(`SELECT COUNT(*) AS n FROM reports WHERE ${sql}`).get(...params)!.n);
  const items = db.prepare(`SELECT * FROM reports WHERE ${sql} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`).all(...params, pageSize, (page - 1) * pageSize).map(row => publicReport(row, account?.id));
  res.json({ items, total, page, pageSize });
});
apiRouter.get('/reports/:id', (req, res) => {
  const row = report(req.params.id); const account = currentUser(req);
  if (!['approved', 'unverified'].includes(String(row.status)) && row.user_id !== account?.id && account?.role !== 'admin') throw new ApiError(404, 'Không tìm thấy báo cáo công khai.');
  res.json(publicReport(row, account?.id));
});
apiRouter.post('/report', rateLimit(10, 60_000), (req, res) => {
  const account = user(req); const type = scanType(req.body?.type);
  const target = normalizeQuery(type, req.body?.target);
  const category = textField(req.body?.category, 'Danh mục', 100);
  const description = textField(req.body?.description, 'Mô tả', 3000, 10);
  if (/(?:otp|mật khẩu|password|mã xác thực)\s*[:=]?\s*[a-z0-9_-]{4,}/i.test(description)) throw new ApiError(400, 'Hãy xóa mã xác thực/mật khẩu khỏi mô tả trước khi gửi.');
  const id = randomUUID();
  db.prepare('INSERT INTO reports (id,user_id,type,target,category,description,created_at) VALUES (?,?,?,?,?,?,?)').run(id, account.id, type, target, category, description, now());
  res.status(201).json({ success: true, report: publicReport(report(id), account.id) });
});
apiRouter.post('/reports/:id/votes', rateLimit(60, 60_000), (req, res) => {
  const account = user(req); const row = report(req.params.id);
  if (row.status !== 'approved') throw new ApiError(409, 'Chỉ bình chọn báo cáo đã duyệt.');
  db.exec('BEGIN IMMEDIATE');
  try {
    const removed = db.prepare('DELETE FROM votes WHERE report_id = ? AND user_id = ?').run(row.id, account.id);
    if (!removed.changes) db.prepare('INSERT INTO votes (report_id,user_id) VALUES (?,?)').run(row.id, account.id);
    db.exec('COMMIT');
  } catch (error) { db.exec('ROLLBACK'); throw error; }
  const result = publicReport(row, account.id);
  res.json({ votes: result.votes, votedByMe: result.votedByMe });
});
apiRouter.patch('/admin/reports/:id/status', (req, res) => {
  const account = user(req);
  if (account.role !== 'admin') throw new ApiError(403, 'Chỉ quản trị viên có quyền kiểm duyệt.');
  const row = report(req.params.id); const status = req.body?.status;
  if (!['pending', 'approved', 'rejected'].includes(status)) throw new ApiError(400, 'Trạng thái không hợp lệ.');
  const reason = textField(req.body?.reason, 'Lý do kiểm duyệt', 1000, 3);
  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare('UPDATE reports SET status = ?, reason = ? WHERE id = ?').run(status, reason, row.id);
    db.prepare('INSERT INTO moderation_log (report_id,admin_id,status,reason,created_at) VALUES (?,?,?,?,?)').run(row.id, account.id, status, reason, now());
    db.exec('COMMIT');
  } catch (error) { db.exec('ROLLBACK'); throw error; }
  res.json({ success: true, report: publicReport(report(req.params.id), account.id) });
});
for (const [route, kind] of [['scenarios', 'scenario'], ['courses', 'course']]) {
  apiRouter.get(`/${route}`, (req, res) => {
    const q = req.query.q === undefined ? '' : textField(req.query.q, 'q', 200, 0).toLocaleLowerCase('vi');
    const category = req.query.category === undefined ? '' : textField(req.query.category, 'category', 100, 0);
    const page = integer(req.query.page, 1, 100000); const pageSize = integer(req.query.pageSize, 20, 100);
    const matches = catalogItems(kind).filter(value => (kind !== 'course' || (value.status || 'published') === 'published') && (!category || value.category === category) && JSON.stringify(value).toLocaleLowerCase('vi').includes(q));
    const items = matches.slice((page - 1) * pageSize, page * pageSize).map(value => kind === 'course' ? publicCourse(value) : value);
    res.json({ items, total: matches.length, page, pageSize });
  });
  apiRouter.get(`/${route}/:id`, (req, res) => { const value = item(kind, req.params.id); if (kind === 'course' && (value.status || 'published') !== 'published') throw new ApiError(404, 'Không tìm thấy khóa học đã phát hành.'); res.json(kind === 'course' ? publicCourse(value) : value); });
}
apiRouter.get('/courses/:id/lessons/:lessonId', (req, res) => {
  const course = item('course', req.params.id); const lesson = course.modules.find((l: any) => l.id === req.params.lessonId);
  if ((course.status || 'published') !== 'published') throw new ApiError(404, 'Không tìm thấy khóa học đã phát hành.');
  if (!lesson) throw new ApiError(404, 'Không tìm thấy bài học trong khóa học.');
  let quiz;
  if (lesson.quizId || (Array.isArray(lesson.questionIds) && lesson.questionIds.length)) {
    const exam = course.modules.find((module: any) => module.type === 'quiz');
    const data = item('quiz', lesson.quizId || exam?.quizId || `${course.id}-quiz`);
    quiz = { id: lesson.type === 'quiz' ? data.id : `${data.id}::${lesson.id}`, questions: activeQuizQuestions(data, course, lesson).map(({ correctIndex, explanation, optionExplanations, ...question }: any) => question) };
  }
  const account = currentUser(req);
  res.json({ ...lesson, quiz, ...(lesson.type === 'quiz' ? { passed: !!account && examPassed(account.id, lesson) } : {}) });
});
apiRouter.post('/courses/:id/lessons/:lessonId/questions/:questionId/answer', rateLimit(120, 60_000), (req, res) => {
  const course = item('course', req.params.id);
  if ((course.status || 'published') !== 'published') throw new ApiError(404, 'Không tìm thấy khóa học đã phát hành.');
  const lesson = course.modules.find((module: any) => module.id === req.params.lessonId && module.type !== 'quiz');
  if (!lesson) throw new ApiError(404, 'Không tìm thấy bài học.');
  const quiz = item('quiz', course.modules.find((module: any) => module.type === 'quiz')?.quizId || `${course.id}-quiz`);
  const question = activeQuizQuestions(quiz, course, lesson).find((entry: any) => entry.id === req.params.questionId);
  if (!question) throw new ApiError(404, 'Câu hỏi không thuộc bài học này.');
  const selectedIndex = req.body?.selectedIndex;
  if (!Number.isInteger(selectedIndex) || selectedIndex < 0 || selectedIndex >= question.options.length) throw new ApiError(400, 'Đáp án không hợp lệ.');
  const account = currentUser(req);
  let answeredAll = false;
  if (account) {
    db.prepare('INSERT INTO lesson_answers VALUES (?,?,?,?,?,?) ON CONFLICT(user_id,course_id,lesson_id,question_id) DO UPDATE SET selected_index=excluded.selected_index,answered_at=excluded.answered_at').run(account.id, course.id, lesson.id, question.id, selectedIndex, now());
    const assigned = activeQuizQuestions(quiz, course, lesson);
    answeredAll = assigned.every((entry: any) => db.prepare('SELECT 1 FROM lesson_answers WHERE user_id = ? AND course_id = ? AND lesson_id = ? AND question_id = ?').get(account.id, course.id, lesson.id, entry.id));
  }
  res.json({ questionId: question.id, selectedIndex, correctIndex: question.correctIndex, correct: selectedIndex === question.correctIndex, explanation: question.explanation, optionExplanations: question.optionExplanations, answeredAll });
});
apiRouter.post('/quizzes/:id/submissions', rateLimit(30, 60_000), (req, res) => {
  const account = user(req); const [quizId, moduleId] = req.params.id.split('::'); const quiz = item('quiz', quizId); const answers = req.body?.answers;
  const quizCourse = item('course', quiz.courseId);
  if ((quizCourse.status || 'published') !== 'published') throw new ApiError(404, 'Bài kiểm tra chưa được phát hành.');
  const module = moduleId ? quizCourse.modules.find((entry: any) => entry.id === moduleId && entry.type !== 'quiz') : quizCourse.modules.find((entry: any) => entry.quizId === quizId && entry.type === 'quiz');
  if (!module) throw new ApiError(404, 'Không tìm thấy phần kiểm tra.');
  const questions = activeQuizQuestions(quiz, quizCourse, module);
  if (!questions.length || !Array.isArray(answers) || answers.length !== questions.length || answers.some((answer, i) => !Number.isInteger(answer) || answer < -1 || answer >= questions[i].options.length)) throw new ApiError(400, 'answers phải chứa chỉ số phương án hợp lệ hoặc -1 cho câu bỏ trống, theo thứ tự câu hỏi.');
  const explanations = questions.map((q: any, i: number) => ({ questionId: q.id, correct: answers[i] === q.correctIndex, selectedIndex: answers[i], correctIndex: q.correctIndex, explanation: q.explanation, optionExplanations: q.optionExplanations }));
  const correctCount = explanations.filter((e: any) => e.correct).length; const score = Math.round(correctCount * 100 / questions.length);
  const submissionQuizId = moduleId ? req.params.id : quiz.id;
  const result = { id: randomUUID(), quizId: submissionQuizId, score, correctCount, total: questions.length, passed: score >= 80, explanations, submittedAt: now() };
  db.prepare('INSERT INTO submissions VALUES (?,?,?,?,?,?,?)').run(result.id, account.id, submissionQuizId, quiz.courseId, score, JSON.stringify(result), result.submittedAt);
  res.status(201).json(result);
});
apiRouter.get('/me/learning-progress', (req, res) => res.json(progress(user(req).id)));
apiRouter.put('/me/learning-progress/:courseId', (req, res) => {
  const account = user(req); const course = item('course', req.params.courseId);
  if ((course.status || 'published') !== 'published') throw new ApiError(404, 'Không tìm thấy khóa học đã phát hành.');
  if (req.body?.completion !== true) throw new ApiError(400, 'completion phải là true.');
  const lesson = course.modules.find((l: any) => l.id === req.body?.lessonId);
  if (!lesson) throw new ApiError(400, 'lessonId không thuộc khóa học.');
  if (lesson.type === 'quiz') {
    if (!course.modules.filter((module: any) => module.type === 'quiz').every((module: any) => examPassed(account.id, module))) throw new ApiError(409, 'Cần đạt tối thiểu 80% ở tất cả bài kiểm tra trước khi hoàn thành khóa.');
    if (course.modules.some((module: any) => module.type !== 'quiz' && !db.prepare('SELECT 1 FROM lesson_progress WHERE user_id = ? AND course_id = ? AND lesson_id = ?').get(account.id, course.id, module.id))) throw new ApiError(409, 'Hãy đánh dấu đã đọc tất cả bài học trước khi hoàn thành khóa.');
    db.exec('BEGIN IMMEDIATE');
    try {
      db.prepare('INSERT OR IGNORE INTO lesson_progress VALUES (?,?,?,?)').run(account.id, course.id, lesson.id, now());
      ensureCertificates(account.id);
      db.exec('COMMIT');
    } catch (error) { db.exec('ROLLBACK'); throw error; }
    res.json(progress(account.id));
    return;
  }
  db.prepare('INSERT OR IGNORE INTO lesson_progress VALUES (?,?,?,?)').run(account.id, course.id, lesson.id, now());
  ensureCertificates(account.id);
  res.json(progress(account.id));
});
apiRouter.get('/stats/overview', (_req, res) => {
  const counts = db.prepare("SELECT COUNT(*) AS total, COALESCE(SUM(date(created_at, '+7 hours') = date('now', '+7 hours')),0) AS today, AVG(json_extract(result,'$.analysisTimeMs')) AS average FROM scans").get()!;
  res.json({ totalScans: Number(counts.total), totalScansToday: Number(counts.today), verifiedReports: Number(db.prepare("SELECT COUNT(*) AS n FROM reports WHERE status = 'approved'").get()!.n), averageAnalysisTimeMs: Math.round(Number(counts.average || 0)), source: 'CyberAware SQLite', updatedAt: now() });
});
apiRouter.get('/me/stats', (req, res) => {
  const account = user(req);
  const quizScores = db.prepare('SELECT course_id AS courseId, MAX(score) AS bestScore, AVG(score) AS averageScore, COUNT(*) AS attempts FROM submissions WHERE user_id = ? GROUP BY course_id').all(account.id);
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const recent = db.prepare("SELECT json_extract(result,'$.type') AS type, json_extract(result,'$.riskScore') AS riskScore FROM scans WHERE user_id = ? AND created_at >= ?").all(account.id, since);
  const scanCountsByType = { url: 0, sms: 0, phone: 0, bank: 0 };
  for (const row of recent) {
    const type = String(row.type);
    if (Object.hasOwn(scanCountsByType, type)) scanCountsByType[type as keyof typeof scanCountsByType]++;
  }
  res.json({ scanCount: Number(db.prepare('SELECT COUNT(*) AS n FROM scans WHERE user_id = ?').get(account.id)!.n), scansLast30Days: recent.length, scanCountsByType, highRiskScansLast30Days: recent.filter(row => Number(row.riskScore) >= 70).length, safetyScore: null, reportCount: Number(db.prepare('SELECT COUNT(*) AS n FROM reports WHERE user_id = ?').get(account.id)!.n), quizScores, weakTopics: quizScores.filter(q => Number(q.averageScore) < 80).map(q => ({ courseId: q.courseId, title: item('course', String(q.courseId)).title, averageScore: q.averageScore })), ...progress(account.id), updatedAt: now() });
});
export function apiError(error: any, _req: Request, res: Response, _next: NextFunction) {
  const status = error instanceof ApiError ? error.status : error.type === 'entity.too.large' ? 413 : error.type === 'entity.parse.failed' ? 400 : 500;
  if (status === 500) console.error('API error:', error);
  res.status(status).json({ success: false, error: status === 500 ? 'Có lỗi máy chủ. Vui lòng thử lại.' : status === 413 ? 'Nội dung yêu cầu quá lớn.' : error.type === 'entity.parse.failed' ? 'JSON không hợp lệ.' : error.message });
}
