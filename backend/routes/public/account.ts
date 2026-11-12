import type { Router } from 'express';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { me, publicUser } from '../../../auth';
import { db, catalogItem } from '../../database';
import { ApiError, textField } from '../../http';
import { now, avatarDir, privacy, purgeExpiredScans, ensureCertificates, user } from './shared';

export function registerAccountRoutes(router: Router) {
  router.get('/me', me);
  router.patch('/me/profile', (req, res) => {
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

  router.put('/me/avatar', (req, res) => {
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

  router.get('/me/avatar', (req, res) => {
    const account = user(req);
    const file = path.join(avatarDir, account.id);
    if (!existsSync(file)) throw new ApiError(404, 'Chưa có ảnh đại diện đã tải lên.');
    const image = readFileSync(file);
    const mime = image.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ? 'image/png' : image[0] === 255 && image[1] === 216 ? 'image/jpeg' : 'image/webp';
    res.type(mime).send(image);
  });

  router.get('/me/privacy-settings', (req, res) => res.json(privacy(user(req).id)));
  router.patch('/me/privacy-settings', (req, res) => {
    const account = user(req);
    const body = req.body;
    const allowed = ['autoDelete30Days', 'anonymousScamSharing', 'emailBankAlerts'];
    if (!body || typeof body !== 'object' || Array.isArray(body) || !Object.keys(body).length || Object.keys(body).some(key => !allowed.includes(key) || typeof body[key] !== 'boolean')) throw new ApiError(400, 'Tùy chọn quyền riêng tư không hợp lệ.');
    const next = { ...privacy(account.id), ...body };
    db.prepare('INSERT INTO privacy_settings (user_id,auto_delete_30_days,anonymous_scam_sharing,email_bank_alerts,updated_at) VALUES (?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET auto_delete_30_days=excluded.auto_delete_30_days,anonymous_scam_sharing=excluded.anonymous_scam_sharing,email_bank_alerts=excluded.email_bank_alerts,updated_at=excluded.updated_at').run(account.id, next.autoDelete30Days ? 1 : 0, next.anonymousScamSharing ? 1 : 0, next.emailBankAlerts ? 1 : 0, now());
    if (next.autoDelete30Days) purgeExpiredScans();
    res.json({ success: true, settings: privacy(account.id) });
  });

  router.get('/me/certificates', (req, res) => {
    const account = user(req);
    ensureCertificates(account.id);
    const rows = db.prepare('SELECT id,course_id,code,issued_at FROM certificates WHERE user_id = ? ORDER BY issued_at DESC').all(account.id);
    res.json({ items: rows.map(row => ({ id: row.id, courseId: row.course_id, courseTitle: catalogItem('course', String(row.course_id))?.title || 'Khóa học', code: row.code, issuedAt: row.issued_at })) });
  });
}
