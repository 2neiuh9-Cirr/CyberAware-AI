import 'dotenv/config';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

// SQLite lưu tài khoản và phiên đăng nhập trong thư mục dữ liệu riêng của ứng dụng.
export const DATA_DIR = path.resolve(process.env.AUTH_DATA_DIR || 'data');
mkdirSync(DATA_DIR, { recursive: true });
export const db = new DatabaseSync(path.join(DATA_DIR, 'auth.sqlite'));

// Tạo bảng xác thực, khôi phục mật khẩu, đăng ký chờ xác minh và liên kết OAuth.
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    password_version INTEGER NOT NULL DEFAULT 0,
    role TEXT NOT NULL,
    level TEXT NOT NULL,
    avatar TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS password_resets (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL,
    used_at INTEGER
  );
  CREATE INDEX IF NOT EXISTS idx_password_resets_user ON password_resets(user_id);
  CREATE TABLE IF NOT EXISTS recovery_codes (user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, code_hash TEXT NOT NULL, expires_at INTEGER NOT NULL, attempts INTEGER NOT NULL DEFAULT 0);
  CREATE TABLE IF NOT EXISTS recovery_grants (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS revoked_tokens (token_hash TEXT PRIMARY KEY, expires_at INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, password_version INTEGER NOT NULL, expires_at INTEGER NOT NULL, remembered INTEGER NOT NULL);
  CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);
  CREATE TABLE IF NOT EXISTS pending_registrations (
    email TEXT PRIMARY KEY, name TEXT NOT NULL, password_hash TEXT NOT NULL,
    challenge_hash TEXT NOT NULL, code_hash TEXT NOT NULL,
    expires_at INTEGER NOT NULL, attempts INTEGER NOT NULL DEFAULT 0,
    last_sent_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS oauth_states (state_hash TEXT PRIMARY KEY, provider TEXT NOT NULL, expires_at INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS oauth_accounts (
    provider TEXT NOT NULL, provider_user_id TEXT NOT NULL,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY(provider, provider_user_id), UNIQUE(provider, user_id)
  );
`);

// Mở rộng schema cho dữ liệu cũ bằng cách chỉ thêm những cột còn thiếu.
const columns = (table: string) => new Set(db.prepare(`PRAGMA table_info(${table})`).all().map(row => String(row.name)));
if (!columns('users').has('phone')) db.exec('ALTER TABLE users ADD COLUMN phone TEXT');
if (!columns('users').has('status')) db.exec("ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'active'");
// Existing accounts remain usable; only registrations created from this version require email proof.
if (!columns('users').has('email_verified')) db.exec('ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0');
if (!columns('oauth_states').has('link_user_id')) db.exec('ALTER TABLE oauth_states ADD COLUMN link_user_id TEXT');
for (const [name, kind] of [['id', 'TEXT'], ['created_at', 'INTEGER'], ['last_active_at', 'INTEGER'], ['user_agent', 'TEXT'], ['ip', 'TEXT']] as const) {
  if (!columns('sessions').has(name)) db.exec(`ALTER TABLE sessions ADD COLUMN ${name} ${kind}`);
}
for (const row of db.prepare('SELECT token_hash FROM sessions WHERE id IS NULL').all()) {
  db.prepare('UPDATE sessions SET id = ? WHERE token_hash = ?').run(randomUUID(), row.token_hash);
}
db.exec('CREATE UNIQUE INDEX IF NOT EXISTS sessions_id ON sessions(id)');

// Khóa ký token được giữ ổn định qua lần khởi động và tạo mới nếu chưa tồn tại.
const secretFile = path.join(DATA_DIR, 'jwt-secret');
function getJwtSecret(): Buffer {
  const configured = process.env.AUTH_JWT_SECRET;
  if (configured) {
    if (Buffer.byteLength(configured) < 32) throw new Error('AUTH_JWT_SECRET phải có ít nhất 32 byte.');
    return Buffer.from(configured);
  }
  if (process.env.NODE_ENV === 'production') throw new Error('Cần cấu hình AUTH_JWT_SECRET trong production.');
  if (!existsSync(secretFile)) writeFileSync(secretFile, randomBytes(48).toString('base64url'), { mode: 0o600, flag: 'wx' });
  return Buffer.from(readFileSync(secretFile, 'utf8').trim());
}
export const jwtSecret = getJwtSecret();
