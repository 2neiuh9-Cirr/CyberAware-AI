import type { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { currentUser } from '../../auth';
import { db } from '../../database';
import { ApiError, integer, rateLimit, textField } from '../../http';
import { normalizeQuery, scanType } from '../../analysis/analysis';
import { now, user, report, publicReport } from './shared';

export function registerReportRoutes(router: Router) {
  router.get('/reports', (req, res) => {
    const account = currentUser(req); const mine = req.query.mine === 'true';
    if (mine && !account) throw new ApiError(401, 'Vui lòng đăng nhập.');
    const status = req.query.status ?? (mine ? 'all' : 'community');
    if (!['pending', 'approved', 'rejected', 'unverified', 'community', 'all'].includes(status as string)) throw new ApiError(400, 'Trạng thái không hợp lệ.');
    if (!['approved', 'unverified', 'community'].includes(status as string) && !mine && account?.role !== 'admin') throw new ApiError(403, 'Chỉ quản trị viên được xem hàng chờ duyệt.');
    const where = ['1=1']; const params: any[] = [];
    if (!mine && account?.role !== 'admin') where.push('is_hidden = 0');
    if (!mine && account?.role === 'admin' && ['community', 'approved', 'unverified'].includes(status as string)) where.push('is_hidden = 0');
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
  router.get('/reports/:id', (req, res) => {
    const row = report(req.params.id); const account = currentUser(req);
    if ((!!row.is_hidden || !['approved', 'unverified'].includes(String(row.status))) && row.user_id !== account?.id && account?.role !== 'admin') throw new ApiError(404, 'Không tìm thấy báo cáo công khai.');
    res.json(publicReport(row, account?.id));
  });
  router.post('/report', rateLimit(10, 60_000), (req, res) => {
    const account = user(req); const type = scanType(req.body?.type);
    const target = normalizeQuery(type, req.body?.target);
    const category = textField(req.body?.category, 'Danh mục', 100);
    const description = textField(req.body?.description, 'Mô tả', 3000, 10);
    if (/(?:otp|mật khẩu|password|mã xác thực)\s*[:=]?\s*[a-z0-9_-]{4,}/i.test(description)) throw new ApiError(400, 'Hãy xóa mã xác thực/mật khẩu khỏi mô tả trước khi gửi.');
    const id = randomUUID();
    db.prepare('INSERT INTO reports (id,user_id,type,target,category,description,created_at) VALUES (?,?,?,?,?,?,?)').run(id, account.id, type, target, category, description, now());
    res.status(201).json({ success: true, report: publicReport(report(id), account.id) });
  });
  router.post('/reports/:id/votes', rateLimit(60, 60_000), (req, res) => {
    const account = user(req); const row = report(req.params.id);
    if (row.status !== 'approved' || row.is_hidden) throw new ApiError(409, 'Chỉ bình chọn báo cáo đã duyệt và đang hiển thị.');
    db.exec('BEGIN IMMEDIATE');
    try {
      const removed = db.prepare('DELETE FROM votes WHERE report_id = ? AND user_id = ?').run(row.id, account.id);
      if (!removed.changes) db.prepare('INSERT INTO votes (report_id,user_id) VALUES (?,?)').run(row.id, account.id);
      db.exec('COMMIT');
    } catch (error) { db.exec('ROLLBACK'); throw error; }
    const result = publicReport(row, account.id);
    res.json({ votes: result.votes, votedByMe: result.votedByMe });
  });
  router.patch('/admin/reports/:id/status', (req, res) => {
    const account = user(req);
    if (account.role !== 'admin') throw new ApiError(403, 'Chỉ quản trị viên có quyền kiểm duyệt.');
    const row = report(req.params.id); const status = req.body?.status;
    if (!['pending', 'approved', 'rejected', 'unverified'].includes(status)) throw new ApiError(400, 'Trạng thái không hợp lệ.');
    const reason = textField(req.body?.reason, 'Lý do kiểm duyệt', 1000, 3);
    db.exec('BEGIN IMMEDIATE');
    try {
      db.prepare('UPDATE reports SET status = ?, reason = ? WHERE id = ?').run(status, reason, row.id);
      db.prepare('INSERT INTO moderation_log (report_id,admin_id,status,reason,created_at) VALUES (?,?,?,?,?)').run(row.id, account.id, status, reason, now());
      db.exec('COMMIT');
    } catch (error) { db.exec('ROLLBACK'); throw error; }
    res.json({ success: true, report: publicReport(report(req.params.id), account.id) });
  });
}
