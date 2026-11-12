import type { Request } from 'express';
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { currentUser } from '../../../auth';
import { db, catalogItem, catalogItems } from '../../database';
import { ApiError } from '../../http';

export const now = () => new Date().toISOString();
export const avatarDir = path.resolve(process.env.AUTH_DATA_DIR || 'data', 'avatars');
mkdirSync(avatarDir, { recursive: true });
db.exec('CREATE TABLE IF NOT EXISTS privacy_settings (user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, auto_delete_30_days INTEGER NOT NULL DEFAULT 0, anonymous_scam_sharing INTEGER NOT NULL DEFAULT 0, email_bank_alerts INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL)');
db.exec('CREATE TABLE IF NOT EXISTS certificates (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, course_id TEXT NOT NULL, code TEXT NOT NULL UNIQUE, issued_at TEXT NOT NULL, UNIQUE(user_id,course_id))');

export function privacy(userId: string) {
  const row = db.prepare('SELECT * FROM privacy_settings WHERE user_id = ?').get(userId) as Record<string, unknown> | undefined;
  return { autoDelete30Days: !!row?.auto_delete_30_days, anonymousScamSharing: !!row?.anonymous_scam_sharing, emailBankAlerts: !!row?.email_bank_alerts, updatedAt: row?.updated_at || null };
}
export function purgeExpiredScans() {
  db.prepare('DELETE FROM scans WHERE created_at < ? AND user_id IN (SELECT user_id FROM privacy_settings WHERE auto_delete_30_days = 1)').run(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
}
const cleanup = setInterval(purgeExpiredScans, 60 * 60 * 1000);
cleanup.unref();

export function ensureCertificates(userId: string) {
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
export function user(req: Request) {
  const value = currentUser(req);
  if (!value) throw new ApiError(401, 'Vui lòng đăng nhập để thực hiện thao tác này.');
  return value;
}
export function item(kind: string, id: string) {
  const value = catalogItem(kind, id);
  if (!value) throw new ApiError(404, 'Không tìm thấy nội dung.');
  return value;
}
export function report(id: string) {
  const row = db.prepare('SELECT * FROM reports WHERE id = ?').get(id);
  if (!row) throw new ApiError(404, 'Không tìm thấy báo cáo.');
  return row;
}
export function publicReport(row: any, userId?: string) {
  return { id: row.id, type: row.type, target: row.target, category: row.category, description: row.description,
    status: row.status, hidden: !!row.is_hidden, verified: row.status === 'approved' && !row.is_hidden,
    riskScore: null, reportedAt: row.created_at, createdAt: row.created_at,
    votes: Number(db.prepare('SELECT COUNT(*) AS n FROM votes WHERE report_id = ?').get(row.id)!.n),
    votedByMe: !!(userId && db.prepare('SELECT 1 FROM votes WHERE report_id = ? AND user_id = ?').get(row.id, userId)),
  };
}
export function progress(userId: string) {
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
export function examPassed(userId: string, exam: any) {
  return !!db.prepare('SELECT 1 FROM submissions WHERE user_id = ? AND quiz_id = ? AND score >= 80 AND created_at >= ?').get(userId, exam.quizId, exam.createdAt || '');
}
export function publicCourse(course: any) {
  return { ...course, modules: course.modules.map(({ content, ...lesson }: any) => lesson),
    learnersCount: Number(db.prepare('SELECT COUNT(DISTINCT user_id) AS n FROM lesson_progress WHERE course_id = ?').get(course.id)!.n) };
}
export function activeQuizQuestions(quiz: any, course: any, module: any) {
  const assigned = module.questionIds;
  // Older courses have no assignments; keep their original final exam until edited.
  const legacyFinal = module.type === 'quiz' && !course.modules.some((entry: any) => Array.isArray(entry.questionIds));
  const ids = Array.isArray(assigned) ? assigned : [];
  return quiz.questions.filter((question: any) => (!question.status || question.status === 'active') && (legacyFinal || ids.includes(question.id)));
}
