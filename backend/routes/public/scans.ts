import type { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { currentUser } from '../../../auth';
import { db } from '../../database';
import { ApiError, integer, rateLimit } from '../../http';
import { analyze, normalizeQuery, scanType } from '../../analysis/analysis';
import { user } from './shared';

export function registerScanRoutes(router: Router) {
  router.post('/analyze', rateLimit(30, 60_000), async (req, res, next) => {
    try {
      const type = scanType(req.body?.type); const query = normalizeQuery(type, req.body?.query);
      const account = currentUser(req);
      if (!account && (req.headers.authorization || req.headers.cookie?.includes('cyberaware_session='))) throw new ApiError(401, 'Phiên đã hết hạn. Hãy đăng nhập lại hoặc quét với tư cách khách.');
      const matching = !!db.prepare("SELECT 1 FROM reports WHERE type = ? AND target = ? AND status = 'approved' AND is_hidden = 0").get(type, query);
      const result = { ...await analyze(type, query, matching), id: randomUUID() };
      const stored = account ? result : { ...result, query: '[Khách: không lưu nội dung]', flags: [], aiReasoning: undefined, actionAdvice: undefined, threatCategory: undefined };
      db.prepare('INSERT INTO scans (id,user_id,result,created_at) VALUES (?,?,?,?)').run(result.id, account?.id || null, JSON.stringify(stored), result.scannedAt);
      res.json(result);
    } catch (error) { next(error); }
  });
  router.get('/scans', (req, res) => {
    const account = user(req); const limit = integer(req.query.limit, 20, 100);
    const cursor = integer(req.query.cursor, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER);
    const rows = db.prepare('SELECT seq,result FROM scans WHERE user_id = ? AND seq < ? ORDER BY seq DESC LIMIT ?').all(account.id, cursor, limit + 1);
    res.json({ items: rows.slice(0, limit).map(row => JSON.parse(String(row.result))), nextCursor: rows.length > limit ? String(rows[limit - 1].seq) : null });
  });
  router.get('/scans/:id', (req, res) => {
    const account = user(req);
    const row = db.prepare('SELECT result FROM scans WHERE id = ? AND user_id = ?').get(req.params.id, account.id);
    if (!row) throw new ApiError(404, 'Không tìm thấy lần quét của bạn.');
    res.json(JSON.parse(String(row.result)));
  });
}
