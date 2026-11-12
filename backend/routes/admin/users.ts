import type { Router, Request } from 'express';
import { randomBytes, randomUUID } from 'node:crypto';
import { hashPassword, sendAccountSetupCode } from '../../auth';
import { db } from '../../database';
import { ApiError, rateLimit, textField } from '../../http';
import { stamp, n, admin, audit, pick, json, userRow, userView, csv } from './shared';

export function registerAdminUserRoutes(router: Router) {
  router.get('/users/summary', (_req, res) => {
    const rows = db.prepare('SELECT role,status,COUNT(*) AS count FROM users GROUP BY role,status').all();
    res.json({ total: rows.reduce((sum, row) => sum + Number(row.count), 0), active: rows.filter(row => row.status === 'active').reduce((sum, row) => sum + Number(row.count), 0), locked: rows.filter(row => row.status === 'locked').reduce((sum, row) => sum + Number(row.count), 0), byRole: { member: rows.filter(row => !['admin','reviewer'].includes(String(row.role))).reduce((sum,row) => sum + Number(row.count), 0), reviewer: rows.filter(row => row.role === 'reviewer').reduce((sum,row) => sum + Number(row.count), 0), admin: rows.filter(row => row.role === 'admin').reduce((sum,row) => sum + Number(row.count), 0) } });
  });
  router.get('/users/export', (req, res) => {
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
  router.get('/users', (req, res) => res.json(pick(filteredUsers(req), req)));
  router.get('/users/:id', (req, res) => res.json(userView(userRow(req.params.id))));
  router.post('/users', rateLimit(10, 15 * 60_000), async (req, res, next) => {
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
  router.patch('/users/:id/role', (req, res) => {
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
  router.post('/users/:id/lock', (req, res) => {
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
  router.post('/users/:id/unlock', (req, res) => {
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
  router.post('/users/:id/invitation/resend', rateLimit(10, 15 * 60_000), async (req, res, next) => {
    try { const row = userRow(req.params.id); const setup = await sendAccountSetupCode(String(row.id)); audit(req, 'user.setup-code', 'user', String(row.id)); res.json({ success: true, setup }); }
    catch (error) { next(error); }
  });

}
