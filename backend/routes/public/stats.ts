import type { Router } from 'express';
import { me } from '../../auth';
import { db } from '../../database';
import { now, user, item, progress } from './shared';

export function registerStatsRoutes(router: Router) {
  router.get('/stats/overview', (_req, res) => {
    const counts = db.prepare("SELECT COUNT(*) AS total, COALESCE(SUM(date(created_at, '+7 hours') = date('now', '+7 hours')),0) AS today, AVG(json_extract(result,'$.analysisTimeMs')) AS average FROM scans").get()!;
    res.json({ totalScans: Number(counts.total), totalScansToday: Number(counts.today), verifiedReports: Number(db.prepare("SELECT COUNT(*) AS n FROM reports WHERE status = 'approved' AND is_hidden = 0").get()!.n), averageAnalysisTimeMs: Math.round(Number(counts.average || 0)), source: 'CyberAware SQLite', updatedAt: now() });
  });
  router.get('/me/stats', (req, res) => {
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
}
