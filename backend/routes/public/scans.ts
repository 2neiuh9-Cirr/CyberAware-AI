import type { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { currentUser } from '../../auth';
import { db } from '../../database';
import { ApiError, integer, rateLimit, textField } from '../../http';
import { analyze, normalizeQuery, scanType } from '../../analysis/analysis';
import { checkSafeBrowsing } from '../../analysis/safeBrowsing';
import { user } from './shared';

// Các tuyến kiểm tra nhanh và quét có lưu lịch sử cho tài khoản đăng nhập.
export function registerScanRoutes(router: Router) {
  // Kiểm tra URL kết hợp Safe Browsing, báo cáo đã duyệt và bộ phân tích nội bộ; văn bản dùng nhánh tin nhắn.
  router.post('/context-check', rateLimit(15, 60_000), async (req, res, next) => {
    try {
      if (req.body?.kind === 'url') {
        const url = normalizeQuery('url', req.body?.url);
        const matching = !!db.prepare("SELECT 1 FROM reports WHERE type = 'url' AND target = ? AND status = 'approved' AND is_hidden = 0").get(url);
        const [google, result] = await Promise.all([checkSafeBrowsing(url), analyze('url', url, matching)]);
        const overall = google.status === 'matched'
          ? { level: 'NGUY_HIEM', source: 'google' }
          : result.level === 'NGUY_HIEM' || result.level === 'CANH_GIAC'
            ? { level: result.level, source: 'cyberAware' }
            : { level: 'CHUA_XAC_MINH', source: 'none' };
        res.json({ url, overall, google, cyberAware: {
          riskScore: result.riskScore, level: result.level, title: result.title, flags: result.flags,
          aiStatus: result.aiStatus, aiReasoning: result.aiReasoning, actionAdvice: result.actionAdvice,
        } });
      } else {
        if (req.body?.kind !== undefined && req.body.kind !== 'text') throw new ApiError(400, 'Loại nội dung không hợp lệ.');
        const text = normalizeQuery('sms', textField(req.body?.text, 'Đoạn văn bản', 4500));
        const result = await analyze('sms', text, false);
        res.json({
          riskScore: result.riskScore, level: result.level, title: result.title, flags: result.flags,
          recommendations: result.recommendations, aiStatus: result.aiStatus,
          aiReasoning: result.aiReasoning, actionAdvice: result.actionAdvice,
        });
      }
    } catch (error) { next(error); }
  });

  // Endpoint danh tiếng URL không gọi bước AI để trả kết quả dựa trên nguồn/quy tắc.
  router.post('/url-reputation', rateLimit(15, 60_000), async (req, res, next) => {
    try {
      const url = normalizeQuery('url', req.body?.url);
      const matching = !!db.prepare("SELECT 1 FROM reports WHERE type = 'url' AND target = ? AND status = 'approved' AND is_hidden = 0").get(url);
      const [google, cyberAware] = await Promise.all([
        checkSafeBrowsing(url),
        analyze('url', url, matching, false),
      ]);
      const overall = google.status === 'matched'
        ? { level: 'NGUY_HIEM', source: 'google' }
        : cyberAware.level === 'NGUY_HIEM' || cyberAware.level === 'CANH_GIAC'
          ? { level: cyberAware.level, source: 'cyberAware' }
          : { level: 'CHUA_XAC_MINH', source: 'none' };
      res.json({ url, overall, google, cyberAware });
    } catch (error) { next(error); }
  });

  // Quét đầy đủ và lưu bản kết quả; khách không được lưu nội dung nhạy cảm.
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

  // Chỉ chủ tài khoản được đọc danh sách và chi tiết lần quét của mình.
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
