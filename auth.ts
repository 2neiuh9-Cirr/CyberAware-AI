import 'dotenv/config';
import { Router, type Request, type Response } from 'express';
import { DatabaseSync } from 'node:sqlite';
import { createHmac, randomBytes, randomInt, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import path from 'node:path';
import nodemailer from 'nodemailer';
import { passwordChangedMail, resetCodeMail, verificationCodeMail } from './backend/securityMail';
import { rateLimit } from './backend/http';

type DbUser = {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  password_version: number;
  role: string;
  level: string;
  avatar: string;
  phone: string | null;
  status: string;
  email_verified: number;
};

type RecoveryCode = { user_id: string; code_hash: string; expires_at: number; attempts: number };
type RecoveryGrant = { user_id: string; expires_at: number };

const DATA_DIR = path.resolve(process.env.AUTH_DATA_DIR || 'data');
mkdirSync(DATA_DIR, { recursive: true });
export const db = new DatabaseSync(path.join(DATA_DIR, 'auth.sqlite'));
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
const jwtSecret = getJwtSecret();
export const chatDigest = (value: string) => createHmac('sha256',jwtSecret).update('chat-guest:'+value).digest('hex');

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESET_MS = 5 * 60 * 1000;
const VERIFY_MS = 10 * 60 * 1000;
const VERIFY_RESEND_MS = 60 * 1000;
const GRANT_MS = 10 * 60 * 1000;
const ACCESS_MS = 60 * 60 * 1000;
const REMEMBER_MS = 30 * 24 * 60 * 60 * 1000;
const BROWSER_SESSION_MS = 24 * 60 * 60 * 1000;
// Cap sessions created under the previous 400-day setting. Active sessions
// receive a fresh 30-day idle window when the user next visits the app.
db.prepare('UPDATE sessions SET expires_at = ? WHERE remembered = 1 AND expires_at > ?')
  .run(Date.now() + REMEMBER_MS, Date.now() + REMEMBER_MS);
const defaultAvatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80';
const normalizeEmail = (value: unknown) => typeof value === 'string' ? value.trim().toLowerCase() : '';
const validPassword = (value: unknown): value is string => typeof value === 'string' && value.length >= 8 && value.length <= 128;
const sha256 = (value: string) => createHmac('sha256', jwtSecret).update(value).digest('hex');

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `${salt.toString('hex')}:${hash.toString('hex')}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(':');
  if (!saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length);
  return timingSafeEqual(actual, expected);
}

export function publicUser(user: DbUser) {
  return { id: user.id, name: user.name, email: user.email, role: user.role, level: user.level, avatar: user.avatar, phone: user.phone || '', emailVerified: user.email_verified === 1, citizenVerified: false, gmailShieldActive: false };
}

function signAccessToken(user: DbUser, sessionId: string): string {
  const now = Math.floor(Date.now() / 1000);
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const body = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: user.id, sid: sessionId, jti: randomUUID(), ver: user.password_version, iss: 'cyberaware-ai', iat: now, exp: now + ACCESS_MS / 1000 })}`;
  return `${body}.${createHmac('sha256', jwtSecret).update(body).digest('base64url')}`;
}

function verifyAccessToken(token: string): DbUser | null {
  if (db.prepare('SELECT 1 FROM revoked_tokens WHERE token_hash = ? AND expires_at > ?').get(sha256(token), Date.now())) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const body = `${parts[0]}.${parts[1]}`;
  const actual = Buffer.from(parts[2], 'base64url');
  const expected = createHmac('sha256', jwtSecret).update(body).digest();
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  try {
    const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    const claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    if (header.alg !== 'HS256' || claims.iss !== 'cyberaware-ai' || !Number.isInteger(claims.exp) || claims.exp <= Date.now() / 1000 || typeof claims.sub !== 'string') return null;
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(claims.sub) as DbUser | undefined;
    const session = typeof claims.sid === 'string' ? db.prepare('SELECT user_id,expires_at,password_version FROM sessions WHERE id = ?').get(claims.sid) as { user_id: string; expires_at: number; password_version: number } | undefined : undefined;
    return user && user.status !== 'locked' && claims.ver === user.password_version && session?.user_id === user.id && session.expires_at > Date.now() && session.password_version === user.password_version ? user : null;
  } catch { return null; }
}

function cookieValue(req: Request, name: string): string | null {
  const raw = req.headers.cookie || '';
  const match = raw.split(';').map(part => part.trim()).find(part => part.startsWith(`${name}=`));
  if (!match) return null;
  try { return decodeURIComponent(match.slice(name.length + 1)); } catch { return null; }
}

function setCookie(res: Response, name: string, value: string, maxAgeSeconds: number, cookiePath: string) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.append('Set-Cookie', `${name}=${encodeURIComponent(value)}; HttpOnly; SameSite=Lax; Path=${cookiePath}${maxAgeSeconds >= 0 ? `; Max-Age=${maxAgeSeconds}` : ''}${secure}`);
}

function createSession(req: Request, res: Response, user: DbUser, remember: boolean): string {
  const token = randomBytes(32).toString('base64url');
  const id = randomUUID();
  const lifetime = remember ? REMEMBER_MS : BROWSER_SESSION_MS;
  db.prepare('INSERT INTO sessions (token_hash,user_id,password_version,expires_at,remembered,id,created_at,last_active_at,user_agent,ip) VALUES (?,?,?,?,?,?,?,?,?,?)').run(sha256(token), user.id, user.password_version, Date.now() + lifetime, remember ? 1 : 0, id, Date.now(), Date.now(), req.get('user-agent') || '', req.ip || '');
  setCookie(res, 'cyberaware_session', '', 0, '/api/auth');
  setCookie(res, 'cyberaware_session', token, remember ? Math.floor(lifetime / 1000) : -1, '/api');
  return id;
}

function sessionUser(req: Request): DbUser | null {
  const token = cookieValue(req, 'cyberaware_session');
  if (!token) return null;
  const row = db.prepare('SELECT user_id, password_version, expires_at, remembered FROM sessions WHERE token_hash = ?').get(sha256(token)) as { user_id: string; password_version: number; expires_at: number; remembered: number } | undefined;
  if (!row || row.expires_at <= Date.now()) return null;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(row.user_id) as DbUser | undefined;
  if (!user || user.status === 'locked' || user.password_version !== row.password_version) return null;
  db.prepare('UPDATE sessions SET expires_at = ?, last_active_at = ? WHERE token_hash = ?').run(Date.now() + (row.remembered ? REMEMBER_MS : BROWSER_SESSION_MS), Date.now(), sha256(token));
  return user;
}

function renewRememberCookie(req: Request, res: Response) {
  const token = cookieValue(req, 'cyberaware_session');
  if (!token) return;
  const row = db.prepare('SELECT remembered, expires_at FROM sessions WHERE token_hash = ?').get(sha256(token)) as { remembered: number; expires_at: number } | undefined;
  if (row?.remembered && row.expires_at > Date.now()) setCookie(res, 'cyberaware_session', token, Math.floor(REMEMBER_MS / 1000), '/api');
}
export function refreshRememberedSession(req: Request, res: Response) {
  if (sessionUser(req)) renewRememberCookie(req, res);
}

function getUserByEmail(email: string): DbUser | undefined {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email) as DbUser | undefined;
}

async function sendResetMail(email: string, name: string, code: string) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM } = process.env;
  if (SMTP_HOST && SMTP_USER && SMTP_PASSWORD && SMTP_FROM) {
    const transport = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT || 587),
      secure: Number(SMTP_PORT || 587) === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
    });
    await transport.sendMail({
      from: SMTP_FROM,
      to: email,
      ...resetCodeMail(name, code),
    });
    return;
  }
  if (process.env.NODE_ENV === 'production') throw new Error('SMTP chưa được cấu hình.');
  // Local development mailbox; never expose the code through an API response.
  appendFileSync(path.join(DATA_DIR, 'dev-reset-codes.log'), `${new Date().toISOString()} ${email} ${code}\n`, { mode: 0o600 });
}

async function sendVerificationMail(email: string, name: string, code: string) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM } = process.env;
  if (SMTP_HOST && SMTP_USER && SMTP_PASSWORD && SMTP_FROM) {
    const transport = nodemailer.createTransport({
      host: SMTP_HOST, port: Number(SMTP_PORT || 587), secure: Number(SMTP_PORT || 587) === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
    });
    await transport.sendMail({ from: SMTP_FROM, to: email, ...verificationCodeMail(name, code) });
    return;
  }
  if (process.env.NODE_ENV === 'production') throw new Error('SMTP chưa được cấu hình.');
  appendFileSync(path.join(DATA_DIR, 'dev-verification-codes.log'), `${new Date().toISOString()} ${email} ${code}\n`, { mode: 0o600 });
}

export async function sendAccountSetupCode(userId: string) {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as DbUser | undefined;
  if (!user) throw new Error('Không tìm thấy tài khoản.');
  const previous = db.prepare('SELECT code_hash FROM recovery_codes WHERE user_id = ?').get(user.id) as { code_hash: string } | undefined;
  let code: string; let codeHash: string;
  do { code = randomInt(0, 100_000_000).toString().padStart(8, '0'); codeHash = sha256(`${user.id}:${code}`); } while (codeHash === previous?.code_hash);
  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare('DELETE FROM recovery_grants WHERE user_id = ?').run(user.id);
    db.prepare('INSERT INTO recovery_codes (user_id,code_hash,expires_at,attempts) VALUES (?,?,?,0) ON CONFLICT(user_id) DO UPDATE SET code_hash=excluded.code_hash,expires_at=excluded.expires_at,attempts=0').run(user.id, codeHash, Date.now() + RESET_MS);
    db.exec('COMMIT');
  } catch (error) { db.exec('ROLLBACK'); throw error; }
  try { await sendResetMail(user.email, user.name, code); }
  catch (error) { db.prepare('DELETE FROM recovery_codes WHERE user_id = ? AND code_hash = ?').run(user.id, codeHash); throw error; }
  return { expiresInSeconds: 300, deliveryMode: process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD && process.env.SMTP_FROM ? 'email' : 'local' };
}

async function sendPasswordChangedMail(email: string, name: string) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD || !SMTP_FROM) return;
  const transport = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT || 587),
    secure: Number(SMTP_PORT || 587) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
  });
  await transport.sendMail({
    from: SMTP_FROM,
    to: email,
    ...passwordChangedMail(name),
  });
}

function appOrigin(req: Request): string | null {
  const configured = process.env.APP_URL;
  if (configured && configured !== 'MY_APP_URL') {
    try {
      const url = new URL(configured);
      if (url.protocol === 'https:' || (process.env.NODE_ENV !== 'production' && url.protocol === 'http:')) return url.origin;
    } catch { /* invalid URL */ }
    return null;
  }
  if (process.env.NODE_ENV === 'production') return null;
  return `${req.protocol}://${req.get('host')}`;
}

export const authRouter = Router();

type OAuthProvider = 'google' | 'facebook';
type OAuthProfile = { id: string; name: string; email: string | null; emailVerified: boolean };
const oauthProvider = (value: string): value is OAuthProvider => value === 'google' || value === 'facebook';
function oauthConfig(provider: OAuthProvider) {
  const clientId = provider === 'google' ? process.env.GOOGLE_CLIENT_ID : process.env.FACEBOOK_APP_ID;
  const clientSecret = provider === 'google' ? process.env.GOOGLE_CLIENT_SECRET : process.env.FACEBOOK_APP_SECRET;
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}
function oauthRedirect(origin: string, provider: OAuthProvider, error?: string) {
  const url = new URL(error ? '/dang-nhap' : '/', origin);
  if (error) { url.searchParams.set('oauth_error', error); url.searchParams.set('provider', provider); }
  return url.toString();
}
function oauthLinkRedirect(origin: string, provider: OAuthProvider, error?: string) {
  const url = new URL('/cai-dat', origin);
  if (error) url.searchParams.set('oauth_link_error', error);
  else url.searchParams.set('oauth_link', provider);
  return url.toString();
}
async function oauthProfile(provider: OAuthProvider, code: string, redirectUri: string, config: { clientId: string; clientSecret: string }): Promise<OAuthProfile> {
  const timeout = () => AbortSignal.timeout(10_000);
  if (provider === 'google') {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, signal: timeout(),
      body: new URLSearchParams({ code, client_id: config.clientId, client_secret: config.clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code' }),
    });
    if (!tokenResponse.ok) throw new Error('oauth_token');
    const token = await tokenResponse.json() as { access_token?: string };
    if (!token.access_token) throw new Error('oauth_token');
    const profileResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${token.access_token}` }, signal: timeout(),
    });
    if (!profileResponse.ok) throw new Error('oauth_profile');
    const profile = await profileResponse.json() as { sub?: string; name?: string; email?: string; email_verified?: boolean };
    if (!profile.sub || !profile.email || profile.email_verified !== true) throw new Error('oauth_email');
    return { id: profile.sub, name: profile.name || '', email: normalizeEmail(profile.email), emailVerified: true };
  }
  const version = /^v\d+\.\d+$/.test(process.env.FACEBOOK_GRAPH_VERSION || '') ? process.env.FACEBOOK_GRAPH_VERSION : 'v25.0';
  const tokenUrl = new URL(`https://graph.facebook.com/${version}/oauth/access_token`);
  for (const [key, value] of Object.entries({ client_id: config.clientId, client_secret: config.clientSecret, redirect_uri: redirectUri, code })) tokenUrl.searchParams.set(key, value);
  const tokenResponse = await fetch(tokenUrl, { signal: timeout() });
  if (!tokenResponse.ok) throw new Error('oauth_token');
  const token = await tokenResponse.json() as { access_token?: string };
  if (!token.access_token) throw new Error('oauth_token');
  const profileResponse = await fetch(`https://graph.facebook.com/${version}/me?fields=id,name,email`, {
    headers: { Authorization: `Bearer ${token.access_token}` }, signal: timeout(),
  });
  if (!profileResponse.ok) throw new Error('oauth_profile');
  const profile = await profileResponse.json() as { id?: string; name?: string; email?: string };
  if (!profile.id) throw new Error('oauth_profile');
  return { id: profile.id, name: profile.name || '', email: profile.email ? normalizeEmail(profile.email) : null, emailVerified: false };
}
function socialAccount(provider: OAuthProvider, profile: OAuthProfile): DbUser {
  if (!profile.id || profile.id.length > 255) throw new Error('oauth_profile');
  const linked = db.prepare('SELECT user_id FROM oauth_accounts WHERE provider = ? AND provider_user_id = ?').get(provider, profile.id) as { user_id: string } | undefined;
  if (linked) {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(linked.user_id) as DbUser | undefined;
    if (!user || user.status === 'locked') throw new Error('oauth_locked');
    return user;
  }
  if (!profile.email) throw new Error('oauth_email');
  if (!emailPattern.test(profile.email) || profile.email.length > 254) throw new Error('oauth_profile');
  const existing = getUserByEmail(profile.email);
  if (existing?.status === 'locked') throw new Error('oauth_locked');
  if (existing && (provider !== 'google' || !profile.emailVerified)) throw new Error('oauth_account_exists');
  const id = existing?.id || randomUUID();
  db.exec('BEGIN IMMEDIATE');
  try {
    if (!existing) {
      const name = profile.name.trim().slice(0, 100) || profile.email.split('@')[0].slice(0, 100);
      db.prepare('INSERT INTO users (id,name,email,password_hash,password_version,role,level,avatar,created_at,email_verified) VALUES (?,?,?,?,?,?,?,?,?,?)')
        .run(id, name, profile.email, hashPassword(randomBytes(32).toString('base64url')), 0, 'Thành viên bảo vệ số', 'Người tự vệ số', defaultAvatar, Date.now(), profile.emailVerified ? 1 : 0);
    } else if (profile.emailVerified) {
      db.prepare('UPDATE users SET email_verified = 1 WHERE id = ?').run(id);
    }
    db.prepare('INSERT INTO oauth_accounts (provider,provider_user_id,user_id) VALUES (?,?,?)').run(provider, profile.id, id);
    db.exec('COMMIT');
  } catch (error) { db.exec('ROLLBACK'); throw error; }
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as DbUser;
}

authRouter.get('/oauth/providers', (_req, res) => res.json({ google: !!oauthConfig('google'), facebook: !!oauthConfig('facebook') }));
authRouter.get('/oauth/links', (req, res) => {
  const user = currentUser(req);
  if (!user) return res.status(401).json({ success: false, error: 'Vui lòng đăng nhập lại.' });
  const links = db.prepare('SELECT provider FROM oauth_accounts WHERE user_id = ?').all(user.id) as { provider: string }[];
  res.json({ google: links.some(link => link.provider === 'google'), facebook: links.some(link => link.provider === 'facebook') });
});
function beginOAuth(req: Request, res: Response, provider: OAuthProvider, linkUserId: string | null = null) {
  const config = oauthConfig(provider); const origin = appOrigin(req);
  if (!config || !origin) return res.status(503).json({ success: false, error: 'Đăng nhập qua dịch vụ này chưa được cấu hình.' });
  const state = randomBytes(32).toString('base64url');
  db.prepare('DELETE FROM oauth_states WHERE expires_at <= ?').run(Date.now());
  db.prepare('INSERT INTO oauth_states (state_hash,provider,expires_at,link_user_id) VALUES (?,?,?,?)').run(sha256(state), provider, Date.now() + 10 * 60_000, linkUserId);
  setCookie(res, 'cyberaware_oauth_state', state, 600, '/api/auth/oauth');
  const redirectUri = `${origin}/api/auth/oauth/${provider}/callback`;
  const url = provider === 'google'
    ? new URL('https://accounts.google.com/o/oauth2/v2/auth')
    : new URL(`https://www.facebook.com/${/^v\d+\.\d+$/.test(process.env.FACEBOOK_GRAPH_VERSION || '') ? process.env.FACEBOOK_GRAPH_VERSION : 'v25.0'}/dialog/oauth`);
  for (const [key, value] of Object.entries({ client_id: config.clientId, redirect_uri: redirectUri, response_type: 'code', scope: provider === 'google' ? 'openid email profile' : 'public_profile,email', state })) url.searchParams.set(key, value);
  res.redirect(302, url.toString());
}
authRouter.get('/oauth/:provider/link/start', rateLimit(20, 15 * 60_000), (req, res) => {
  if (!oauthProvider(req.params.provider)) return res.status(404).json({ success: false, error: 'Nhà cung cấp đăng nhập không hợp lệ.' });
  const user = sessionUser(req);
  const origin = appOrigin(req);
  if (!user) return origin ? res.redirect(303, new URL('/dang-nhap', origin).toString()) : res.status(401).json({ success: false, error: 'Vui lòng đăng nhập lại.' });
  return beginOAuth(req, res, req.params.provider, user.id);
});
authRouter.get('/oauth/:provider/start', rateLimit(20, 15 * 60_000), (req, res) => {
  if (!oauthProvider(req.params.provider)) return res.status(404).json({ success: false, error: 'Nhà cung cấp đăng nhập không hợp lệ.' });
  return beginOAuth(req, res, req.params.provider);
});
authRouter.get('/oauth/:provider/callback', async (req, res) => {
  if (!oauthProvider(req.params.provider)) return res.status(404).json({ success: false, error: 'Nhà cung cấp đăng nhập không hợp lệ.' });
  const provider = req.params.provider;
  const origin = appOrigin(req);
  if (!origin) return res.status(503).json({ success: false, error: 'APP_URL chưa được cấu hình hợp lệ.' });
  const state = typeof req.query.state === 'string' ? req.query.state : '';
  const cookie = cookieValue(req, 'cyberaware_oauth_state');
  const row = state && cookie && state === cookie ? db.prepare('SELECT * FROM oauth_states WHERE state_hash = ?').get(sha256(state)) as { provider: string; expires_at: number; link_user_id: string | null } | undefined : undefined;
  if (row) db.prepare('DELETE FROM oauth_states WHERE state_hash = ?').run(sha256(state));
  setCookie(res, 'cyberaware_oauth_state', '', 0, '/api/auth/oauth');
  if (!row || row.provider !== provider || row.expires_at <= Date.now()) return res.redirect(303, oauthRedirect(origin, provider, 'state'));
  const redirect = (error: string) => row.link_user_id ? oauthLinkRedirect(origin, provider, error) : oauthRedirect(origin, provider, error);
  if (req.query.error) return res.redirect(303, redirect('cancelled'));
  const code = typeof req.query.code === 'string' ? req.query.code : '';
  if (!code || code.length > 2048) return res.redirect(303, redirect('code'));
  const config = oauthConfig(provider);
  if (!config) return res.redirect(303, redirect('config'));
  try {
    const profile = await oauthProfile(provider, code, `${origin}/api/auth/oauth/${provider}/callback`, config);
    if (row.link_user_id) {
      const user = sessionUser(req);
      if (!user || user.id !== row.link_user_id) throw new Error('oauth_link_session');
      const linked = db.prepare('SELECT user_id FROM oauth_accounts WHERE provider = ? AND provider_user_id = ?').get(provider, profile.id) as { user_id: string } | undefined;
      if (linked && linked.user_id !== user.id) throw new Error('oauth_linked_elsewhere');
      if (!linked) db.prepare('INSERT INTO oauth_accounts (provider,provider_user_id,user_id) VALUES (?,?,?)').run(provider, profile.id, user.id);
      return res.redirect(303, oauthLinkRedirect(origin, provider));
    }
    const account = socialAccount(provider, profile);
    createSession(req, res, account, false);
    return res.redirect(303, oauthRedirect(origin, provider));
  } catch (error) {
    const reason = error instanceof Error && ['oauth_email', 'oauth_account_exists', 'oauth_locked', 'oauth_link_session', 'oauth_linked_elsewhere'].includes(error.message) ? error.message : 'provider';
    console.error(`Đăng nhập ${provider} không thành công:`, reason);
    return res.redirect(303, redirect(reason));
  }
});

function requestToken(req: Request) {
  return /^Bearer\s+(.+)$/i.exec(req.headers.authorization || '')?.[1] || cookieValue(req, 'cyberaware_session') || '';
}
export function currentUser(req: Request) {
  const bearer = /^Bearer\s+(.+)$/i.exec(req.headers.authorization || '')?.[1];
  return bearer ? verifyAccessToken(bearer) : sessionUser(req) || verifyAccessToken(cookieValue(req, 'cyberaware_session') || '');
}
export function me(req: Request, res: Response) {
  const user = currentUser(req);
  if (!user) return res.status(401).json({ success: false, error: 'Vui lòng đăng nhập lại.' });
  renewRememberCookie(req, res);
  return res.json({ success: true, user: publicUser(user) });
}

authRouter.post('/register', async (req: Request, res: Response) => {
  const { fullname, password } = req.body || {};
  const email = normalizeEmail(req.body?.email);
  if (typeof fullname !== 'string' || fullname.trim().length < 2 || fullname.trim().length > 100 || !emailPattern.test(email) || email.length > 254 || !validPassword(password)) {
    return res.status(400).json({ success: false, error: 'Họ tên, email hoặc mật khẩu không hợp lệ (mật khẩu từ 8 đến 128 ký tự).' });
  }
  if (getUserByEmail(email)) return res.status(409).json({ success: false, error: 'Địa chỉ email này đã được đăng ký.' });
  if (process.env.NODE_ENV === 'production' && !(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD && process.env.SMTP_FROM))
    return res.status(503).json({ success: false, error: 'Chưa thể gửi mã qua email. Vui lòng thử lại sau.' });
  const previous = db.prepare('SELECT last_sent_at FROM pending_registrations WHERE email = ?').get(email) as { last_sent_at: number } | undefined;
  if (previous && Date.now() - previous.last_sent_at < VERIFY_RESEND_MS)
    return res.status(429).json({ success: false, error: 'Vui lòng đợi một phút trước khi yêu cầu mã mới.' });
  const code = randomInt(0, 100_000_000).toString().padStart(8, '0');
  const challenge = randomBytes(32).toString('base64url');
  const challengeHash = sha256(challenge);
  try {
    db.prepare(`INSERT INTO pending_registrations (email,name,password_hash,challenge_hash,code_hash,expires_at,attempts,last_sent_at)
      VALUES (?,?,?,?,?,?,0,?) ON CONFLICT(email) DO UPDATE SET name=excluded.name,password_hash=excluded.password_hash,
      challenge_hash=excluded.challenge_hash,code_hash=excluded.code_hash,expires_at=excluded.expires_at,attempts=0,last_sent_at=excluded.last_sent_at`)
      .run(email, fullname.trim(), hashPassword(password), challengeHash, sha256(`${email}:${code}`), Date.now() + VERIFY_MS, Date.now());
    await sendVerificationMail(email, fullname.trim(), code);
  } catch (error) {
    db.prepare('DELETE FROM pending_registrations WHERE email = ? AND challenge_hash = ?').run(email, challengeHash);
    console.error('Không gửi được mã xác minh đăng ký:', error);
    return res.status(503).json({ success: false, error: 'Chưa thể gửi mã qua email. Vui lòng thử lại sau.' });
  }
  setCookie(res, 'cyberaware_verify', challenge, Math.floor(VERIFY_MS / 1000), '/api/auth');
  return res.status(202).json({ success: true, requiresVerification: true, expiresInSeconds: VERIFY_MS / 1000, deliveryMode: process.env.SMTP_HOST ? 'email' : 'local' });
});

authRouter.post('/resend-verification', async (req: Request, res: Response) => {
  const email = normalizeEmail(req.body?.email);
  const challenge = cookieValue(req, 'cyberaware_verify');
  const row = emailPattern.test(email) && challenge ? db.prepare('SELECT * FROM pending_registrations WHERE email = ? AND challenge_hash = ?').get(email, sha256(challenge)) as { name: string; code_hash: string; expires_at: number; attempts: number; last_sent_at: number } | undefined : undefined;
  if (!row || row.expires_at <= Date.now()) return res.status(401).json({ success: false, error: 'Yêu cầu xác minh đã hết hạn. Vui lòng đăng ký lại.' });
  if (Date.now() - row.last_sent_at < VERIFY_RESEND_MS) return res.status(429).json({ success: false, error: 'Vui lòng đợi một phút trước khi gửi lại mã.' });
  let code: string;
  let codeHash: string;
  do {
    code = randomInt(0, 100_000_000).toString().padStart(8, '0');
    codeHash = sha256(`${email}:${code}`);
  } while (codeHash === row.code_hash);
  db.prepare('UPDATE pending_registrations SET code_hash = ?, expires_at = ?, attempts = 0, last_sent_at = ? WHERE email = ? AND challenge_hash = ?')
    .run(codeHash, Date.now() + VERIFY_MS, Date.now(), email, sha256(challenge!));
  try { await sendVerificationMail(email, row.name, code); }
  catch (error) {
    db.prepare('UPDATE pending_registrations SET code_hash = ?, expires_at = ?, attempts = ?, last_sent_at = ? WHERE email = ? AND challenge_hash = ? AND code_hash = ?')
      .run(row.code_hash, row.expires_at, row.attempts, row.last_sent_at, email, sha256(challenge!), codeHash);
    console.error('Không gửi lại được mã xác minh đăng ký:', error);
    return res.status(503).json({ success: false, error: 'Chưa thể gửi mã qua email. Vui lòng thử lại sau.' });
  }
  setCookie(res, 'cyberaware_verify', challenge!, Math.floor(VERIFY_MS / 1000), '/api/auth');
  return res.json({ success: true, expiresInSeconds: VERIFY_MS / 1000, deliveryMode: process.env.SMTP_HOST ? 'email' : 'local' });
});

authRouter.post('/verify-email', (req: Request, res: Response) => {
  const email = normalizeEmail(req.body?.email);
  const code = req.body?.code;
  const challenge = cookieValue(req, 'cyberaware_verify');
  if (!emailPattern.test(email) || typeof code !== 'string' || !/^\d{8}$/.test(code)) return res.status(400).json({ success: false, error: 'Email hoặc mã xác minh không hợp lệ.' });
  const row = challenge ? db.prepare('SELECT * FROM pending_registrations WHERE email = ? AND challenge_hash = ?').get(email, sha256(challenge)) as { name: string; password_hash: string; code_hash: string; expires_at: number; attempts: number } | undefined : undefined;
  if (!row || row.expires_at <= Date.now() || row.attempts >= 5) return res.status(401).json({ success: false, error: 'Mã không hợp lệ hoặc đã hết hạn. Vui lòng đăng ký lại.' });
  const expected = Buffer.from(row.code_hash, 'hex');
  const actual = Buffer.from(sha256(`${email}:${code}`), 'hex');
  if (!timingSafeEqual(expected, actual)) {
    db.prepare('UPDATE pending_registrations SET attempts = attempts + 1 WHERE email = ? AND challenge_hash = ?').run(email, sha256(challenge!));
    return res.status(401).json({ success: false, error: 'Mã xác minh không đúng hoặc đã hết lượt thử.' });
  }
  const id = randomUUID();
  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare('INSERT INTO users (id,name,email,password_hash,password_version,role,level,avatar,created_at,email_verified) VALUES (?,?,?,?,?,?,?,?,?,1)')
      .run(id, row.name, email, row.password_hash, 0, 'Thành viên bảo vệ số', 'Người tự vệ số', defaultAvatar, Date.now());
    db.prepare('DELETE FROM pending_registrations WHERE email = ? AND challenge_hash = ?').run(email, sha256(challenge!));
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    return res.status(409).json({ success: false, error: 'Không thể hoàn tất đăng ký. Vui lòng thử lại.' });
  }
  setCookie(res, 'cyberaware_verify', '', 0, '/api/auth');
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as DbUser;
  const sessionId = createSession(req, res, user, false);
  return res.status(201).json({ success: true, user: publicUser(user), token: signAccessToken(user, sessionId) });
});

authRouter.post('/login', (req: Request, res: Response) => {
  const email = normalizeEmail(req.body?.email);
  const password = req.body?.password;
  const remember = req.body?.remember === true;
  if (!emailPattern.test(email) || email.length > 254 || typeof password !== 'string' || password.length > 128 || password.length === 0) return res.status(400).json({ success: false, error: 'Email hoặc mật khẩu không hợp lệ.' });
  const user = getUserByEmail(email);
  if (!user || !verifyPassword(password, user.password_hash)) return res.status(401).json({ success: false, error: 'Email hoặc mật khẩu không chính xác.' });
  if (user.status === 'locked') return res.status(403).json({ success: false, error: 'Tài khoản đang bị khóa. Vui lòng liên hệ quản trị viên.' });
  const sessionId = createSession(req, res, user, remember);
  const token = signAccessToken(user, sessionId);
  return res.json({ success: true, user: publicUser(user), token });
});

authRouter.get('/me', me);

authRouter.post('/logout', (req: Request, res: Response) => {
  const token = requestToken(req);
  const session = cookieValue(req, 'cyberaware_session');
  if (session) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha256(session));
  if (verifyAccessToken(token)) db.prepare('INSERT OR REPLACE INTO revoked_tokens VALUES (?,?)').run(sha256(token), Date.now() + ACCESS_MS);
  db.prepare('DELETE FROM revoked_tokens WHERE expires_at <= ?').run(Date.now());
  setCookie(res, 'cyberaware_session', '', 0, '/api/auth');
  setCookie(res, 'cyberaware_session', '', 0, '/api');
  return res.json({ success: true });
});

function activeSessionId(req: Request): string | null {
  const cookie = cookieValue(req, 'cyberaware_session');
  if (cookie) {
    const row = db.prepare('SELECT id FROM sessions WHERE token_hash = ? AND expires_at > ?').get(sha256(cookie), Date.now()) as { id: string } | undefined;
    if (row) return row.id;
  }
  const bearer = /^Bearer\s+(.+)$/i.exec(req.headers.authorization || '')?.[1];
  if (!bearer || !verifyAccessToken(bearer)) return null;
  try { return JSON.parse(Buffer.from(bearer.split('.')[1], 'base64url').toString('utf8')).sid || null; }
  catch { return null; }
}

function sessionDevice(agent: string): { device: string; browser: string } {
  const device = /iPhone/i.test(agent) ? 'iPhone' : /Android/i.test(agent) ? 'Android' : /Windows/i.test(agent) ? 'Máy tính Windows' : /Macintosh|Mac OS/i.test(agent) ? 'Máy Mac' : /Linux/i.test(agent) ? 'Máy tính Linux' : 'Thiết bị không xác định';
  const browser = /Edg\//i.test(agent) ? 'Microsoft Edge' : /Firefox\//i.test(agent) ? 'Firefox' : /Chrome\//i.test(agent) ? 'Chrome' : /Safari\//i.test(agent) ? 'Safari' : 'Trình duyệt không xác định';
  return { device, browser };
}

authRouter.get('/sessions', (req: Request, res: Response) => {
  const account = currentUser(req);
  if (!account) return res.status(401).json({ success: false, error: 'Vui lòng đăng nhập.' });
  const currentId = activeSessionId(req);
  const rows = db.prepare('SELECT id,created_at,last_active_at,expires_at,remembered,user_agent,ip FROM sessions WHERE user_id = ? AND expires_at > ? ORDER BY last_active_at DESC').all(account.id, Date.now());
  return res.json({ items: rows.map(row => ({ id: row.id, ...sessionDevice(String(row.user_agent || '')), isCurrent: row.id === currentId, createdAt: row.created_at ? new Date(Number(row.created_at)).toISOString() : null, lastActiveAt: row.last_active_at ? new Date(Number(row.last_active_at)).toISOString() : null, expiresAt: new Date(Number(row.expires_at)).toISOString(), remembered: !!row.remembered, ip: row.ip || null, location: null })) });
});

authRouter.delete('/sessions/:id', (req: Request, res: Response) => {
  const account = currentUser(req);
  if (!account) return res.status(401).json({ success: false, error: 'Vui lòng đăng nhập.' });
  const currentId = activeSessionId(req);
  const result = db.prepare('DELETE FROM sessions WHERE id = ? AND user_id = ?').run(req.params.id, account.id);
  if (!result.changes) return res.status(404).json({ success: false, error: 'Không tìm thấy phiên đăng nhập của bạn.' });
  const currentRevoked = req.params.id === currentId;
  if (currentRevoked) setCookie(res, 'cyberaware_session', '', 0, '/api');
  return res.json({ success: true, currentRevoked });
});

authRouter.post('/sessions/revoke-others', (req: Request, res: Response) => {
  const account = currentUser(req);
  const currentId = activeSessionId(req);
  if (!account || !currentId) return res.status(401).json({ success: false, error: 'Vui lòng đăng nhập lại.' });
  const result = db.prepare('DELETE FROM sessions WHERE user_id = ? AND id <> ?').run(account.id, currentId);
  return res.json({ success: true, revokedCount: result.changes });
});

authRouter.post('/change-password', (req: Request, res: Response) => {
  const account = currentUser(req);
  if (!account) return res.status(401).json({ success: false, error: 'Vui lòng đăng nhập.' });
  const currentPassword = req.body?.currentPassword;
  const newPassword = req.body?.newPassword;
  if (typeof currentPassword !== 'string' || currentPassword.length > 128 || !validPassword(newPassword)) return res.status(400).json({ success: false, error: 'Mật khẩu hiện tại không hợp lệ hoặc mật khẩu mới phải dài từ 8 đến 128 ký tự.' });
  if (!verifyPassword(currentPassword, account.password_hash)) return res.status(401).json({ success: false, error: 'Mật khẩu hiện tại không chính xác.' });
  if (currentPassword === newPassword) return res.status(400).json({ success: false, error: 'Mật khẩu mới phải khác mật khẩu hiện tại.' });
  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare('UPDATE users SET password_hash = ?, password_version = password_version + 1 WHERE id = ?').run(hashPassword(newPassword), account.id);
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(account.id);
    db.prepare('DELETE FROM recovery_codes WHERE user_id = ?').run(account.id);
    db.prepare('DELETE FROM recovery_grants WHERE user_id = ?').run(account.id);
    db.exec('COMMIT');
  } catch (error) { db.exec('ROLLBACK'); throw error; }
  setCookie(res, 'cyberaware_session', '', 0, '/api');
  void sendPasswordChangedMail(account.email, account.name).catch(error => console.error('Không gửi được email xác nhận đổi mật khẩu:', error));
  return res.json({ success: true, requiresLogin: true });
});

authRouter.post('/forgot-password', async (req: Request, res: Response) => {
  const email = normalizeEmail(req.body?.email);
  if (!emailPattern.test(email) || email.length > 254) return res.status(400).json({ success: false, error: 'Email không hợp lệ.' });
  const mailConfigured = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD && process.env.SMTP_FROM);
  if (process.env.NODE_ENV === 'production' && !mailConfigured) return res.status(503).json({ success: false, error: 'Chưa thể gửi mã qua email. Vui lòng thử lại sau.' });
  const user = getUserByEmail(email);
  if (user) {
    const previous = db.prepare('SELECT code_hash FROM recovery_codes WHERE user_id = ?').get(user.id) as { code_hash: string } | undefined;
    let code: string;
    let codeHash: string;
    do {
      code = randomInt(0, 100_000_000).toString().padStart(8, '0');
      codeHash = sha256(`${user.id}:${code}`);
    } while (codeHash === previous?.code_hash);
    db.exec('BEGIN IMMEDIATE');
    try {
      db.prepare('DELETE FROM recovery_grants WHERE user_id = ?').run(user.id);
      db.prepare('INSERT INTO recovery_codes (user_id,code_hash,expires_at,attempts) VALUES (?,?,?,0) ON CONFLICT(user_id) DO UPDATE SET code_hash=excluded.code_hash, expires_at=excluded.expires_at, attempts=0').run(user.id, codeHash, Date.now() + RESET_MS);
      db.exec('COMMIT');
    } catch (error) { db.exec('ROLLBACK'); throw error; }
    // Delivery runs outside the response path so SMTP latency does not reveal account existence.
    void sendResetMail(user.email, user.name, code).catch(error => {
      db.prepare('DELETE FROM recovery_codes WHERE user_id = ? AND code_hash = ?').run(user.id, codeHash);
      console.error('Không gửi được mã khôi phục:', error);
    });
  } else {
    sha256(`${email}:${randomBytes(8).toString('hex')}`);
  }
  await new Promise(resolve => setTimeout(resolve, 150));
  return res.json({ success: true, message: 'Nếu email có tài khoản, mã xác thực gồm 8 chữ số sẽ được gửi tới địa chỉ đó.', expiresInSeconds: 300, deliveryMode: mailConfigured ? 'email' : 'local' });
});

authRouter.post('/verify-reset-code', (req: Request, res: Response) => {
  const email = normalizeEmail(req.body?.email);
  const code = req.body?.code;
  if (!emailPattern.test(email) || typeof code !== 'string' || !/^\d{8}$/.test(code)) return res.status(400).json({ success: false, error: 'Email hoặc mã xác thực không hợp lệ.' });
  const user = getUserByEmail(email);
  const row = user ? db.prepare('SELECT * FROM recovery_codes WHERE user_id = ?').get(user.id) as RecoveryCode | undefined : undefined;
  if (!row || row.expires_at <= Date.now() || row.attempts >= 5) return res.status(401).json({ success: false, error: 'Mã không hợp lệ hoặc đã hết hạn. Vui lòng gửi mã mới.' });
  const actual = Buffer.from(row.code_hash, 'hex');
  const expected = Buffer.from(sha256(`${user!.id}:${code}`), 'hex');
  if (!timingSafeEqual(actual, expected)) {
    db.prepare('UPDATE recovery_codes SET attempts = attempts + 1 WHERE user_id = ? AND code_hash = ?').run(user!.id, row.code_hash);
    return res.status(401).json({ success: false, error: row.attempts >= 4 ? 'Mã đã bị khóa sau 5 lần nhập sai. Vui lòng gửi mã mới.' : 'Mã xác thực không đúng.' });
  }
  const grant = randomBytes(32).toString('base64url');
  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare('DELETE FROM recovery_codes WHERE user_id = ?').run(user!.id);
    db.prepare('DELETE FROM recovery_grants WHERE user_id = ?').run(user!.id);
    db.prepare('INSERT INTO recovery_grants (token_hash,user_id,expires_at) VALUES (?,?,?)').run(sha256(grant), user!.id, Date.now() + GRANT_MS);
    db.exec('COMMIT');
  } catch (error) { db.exec('ROLLBACK'); throw error; }
  setCookie(res, 'cyberaware_reset', grant, Math.floor(GRANT_MS / 1000), '/api/auth/reset-password');
  return res.json({ success: true, message: 'Mã hợp lệ. Bạn có thể đặt mật khẩu mới.', resetExpiresInSeconds: 600 });
});

authRouter.get('/reset-password/status', (req: Request, res: Response) => {
  const token = cookieValue(req, 'cyberaware_reset');
  // This endpoint is requested when the recovery page mounts. Returning to it
  // after navigation or reload must never resume a previously verified grant.
  if (token) db.prepare('DELETE FROM recovery_grants WHERE token_hash = ?').run(sha256(token));
  setCookie(res, 'cyberaware_reset', '', 0, '/api/auth/reset-password');
  return res.status(401).json({ success: false, error: 'Phiên đặt lại mật khẩu đã đóng. Vui lòng xác thực mã mới.' });
});

authRouter.post('/reset-password/cancel', (req: Request, res: Response) => {
  const token = cookieValue(req, 'cyberaware_reset');
  if (token) db.prepare('DELETE FROM recovery_grants WHERE token_hash = ?').run(sha256(token));
  setCookie(res, 'cyberaware_reset', '', 0, '/api/auth/reset-password');
  return res.json({ success: true });
});

authRouter.post('/reset-password', (req: Request, res: Response) => {
  const token = cookieValue(req, 'cyberaware_reset');
  const password = req.body?.newPassword;
  if (!validPassword(password)) return res.status(400).json({ success: false, error: 'Mật khẩu mới phải có từ 8 đến 128 ký tự.' });
  const row = token ? db.prepare('SELECT * FROM recovery_grants WHERE token_hash = ?').get(sha256(token)) as RecoveryGrant | undefined : undefined;
  if (!row || row.expires_at <= Date.now()) return res.status(401).json({ success: false, error: 'Cần xác minh mã email hợp lệ trước khi đặt mật khẩu mới.' });
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(row.user_id) as DbUser | undefined;
  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare('UPDATE users SET password_hash = ?, password_version = password_version + 1 WHERE id = ?').run(hashPassword(password), row.user_id);
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(row.user_id);
    db.prepare('DELETE FROM recovery_grants WHERE user_id = ?').run(row.user_id);
    db.prepare('DELETE FROM recovery_codes WHERE user_id = ?').run(row.user_id);
    db.exec('COMMIT');
  } catch (error) { db.exec('ROLLBACK'); throw error; }
  setCookie(res, 'cyberaware_reset', '', 0, '/api/auth/reset-password');
  setCookie(res, 'cyberaware_session', '', 0, '/api/auth');
  setCookie(res, 'cyberaware_session', '', 0, '/api');
  if (user) void sendPasswordChangedMail(user.email, user.name).catch(error => console.error('Không gửi được email xác nhận đổi mật khẩu:', error));
  return res.json({ success: true, message: 'Mật khẩu đã được cập nhật.' });
});
