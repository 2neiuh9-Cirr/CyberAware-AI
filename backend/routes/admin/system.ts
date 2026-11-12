import type { Router } from 'express';
import { db, catalogItems } from '../../database';
import { integer } from '../../http';
import { stamp, n, audit, pick, json, course, allQuestions } from './shared';

export function registerAdminOverviewRoutes(router: Router) {
  router.get('/overview', (_req, res) => {
    const since = new Date(Date.now() - 30 * 86400_000).toISOString();
    const recent = db.prepare('SELECT result FROM scans WHERE created_at >= ?').all(since).map(row => JSON.parse(String(row.result)));
    res.json({ users: n('SELECT COUNT(*) AS n FROM users'), activeUsers: n("SELECT COUNT(*) AS n FROM users WHERE status = 'active'"), scansLast30Days: recent.length, highRiskScansLast30Days: recent.filter(s => s.riskScore >= 70).length, courses: catalogItems('course').filter(c => (c.status || 'published') === 'published').length, questions: allQuestions().filter(q => q.status === 'active').length, reportsPending: n("SELECT COUNT(*) AS n FROM reports WHERE status = 'pending'"), updatedAt: stamp() });
  });
}

export function registerAdminSystemRoutes(router: Router) {
  router.get('/audit-events', (req, res) => {
    const rows = db.prepare('SELECT a.*,u.name AS actor_name FROM admin_audit a LEFT JOIN users u ON u.id = a.actor_id ORDER BY a.created_at DESC').all();
    res.json(pick(rows.map(row => ({ id: row.id, actorId: row.actor_id, actorName: row.actor_name, action: row.action, targetType: row.target_type, targetId: row.target_id, detail: row.detail, createdAt: row.created_at })), req));
  });
  router.get('/threats/summary', (req, res) => {
    const days = integer(req.query.days, 7, 365);
    const rows = db.prepare('SELECT category,COUNT(*) AS count FROM reports WHERE status = ? AND is_hidden = 0 AND created_at >= ? GROUP BY category ORDER BY count DESC LIMIT 4').all('approved', new Date(Date.now() - days * 86400_000).toISOString());
    const total = n('SELECT COUNT(*) AS n FROM reports WHERE status = ? AND is_hidden = 0 AND created_at >= ?', 'approved', new Date(Date.now() - days * 86400_000).toISOString());
    res.json({ source: 'approved_reports', days, total, items: rows.map(row => ({ category: row.category, count: row.count, percent: total ? Math.round(100 * Number(row.count) / total) : 0 })) });
  });
  router.get('/system/health', (_req, res) => {
    db.prepare('SELECT 1').get();
    res.json({ api: 'ok', database: 'ok', uptimeSeconds: Math.floor(process.uptime()), aiConfigured: !!process.env.GEMINI_API_KEY?.trim(), measuredAt: stamp(), accuracyRate: null });
  });
  router.get('/system/request-logs', (req, res) => {
    const rows = db.prepare('SELECT * FROM admin_request_log ORDER BY id DESC LIMIT 1000').all();
    res.json(pick(rows.map(row => ({ id: row.id, method: row.method, path: row.path, status: row.status, durationMs: row.duration_ms, createdAt: row.created_at })), req));
  });
}
