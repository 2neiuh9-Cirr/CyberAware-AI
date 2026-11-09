import { randomBytes, randomUUID, scryptSync } from 'node:crypto';
import { db } from '../../auth';

const email = (process.env.ADMIN_BOOTSTRAP_EMAIL || 'admin@gmail.com').trim().toLowerCase();
const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password || password.length < 8 || password.length > 128) {
  throw new Error('Cần ADMIN_BOOTSTRAP_EMAIL hợp lệ và ADMIN_BOOTSTRAP_PASSWORD dài 8–128 ký tự.');
}

const salt = randomBytes(16);
const passwordHash = `${salt.toString('hex')}:${scryptSync(password, salt, 64).toString('hex')}`;
const avatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80';
const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email) as { id: string } | undefined;
db.exec('BEGIN IMMEDIATE');
try {
  if (existing) {
    db.prepare("UPDATE users SET role = 'admin', avatar = CASE WHEN avatar = '' THEN ? ELSE avatar END, password_hash = ?, password_version = password_version + 1 WHERE id = ?").run(avatar, passwordHash, existing.id);
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(existing.id);
  } else {
    db.prepare('INSERT INTO users (id,name,email,password_hash,password_version,role,level,avatar,created_at) VALUES (?,?,?,?,?,?,?,?,?)')
      .run(randomUUID(), 'Quản trị viên', email, passwordHash, 0, 'admin', 'Quản trị viên', avatar, Date.now());
  }
  db.exec('COMMIT');
  console.log(existing ? 'Đã cập nhật tài khoản quản trị.' : 'Đã tạo tài khoản quản trị.');
} catch (error) {
  db.exec('ROLLBACK');
  throw error;
} finally {
  db.close();
}
