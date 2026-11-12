import type { Router } from 'express';
import { db } from '../../database';
import { ApiError, textField } from '../../http';
import { normalizeQuery, scanType } from '../../analysis/analysis';
import { stamp, n, admin, audit, page, json, reportRow, reportView } from './shared';

export function registerAdminReportRoutes(router: Router) {
  router.get('/reports', (req, res) => {
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
  router.patch('/reports/:id', (req, res) => {
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
  router.patch('/reports/:id/visibility', (req, res) => {
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
  router.delete('/reports/:id', (req, res) => {
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
}
