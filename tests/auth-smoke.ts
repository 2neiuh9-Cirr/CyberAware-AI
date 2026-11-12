import assert from 'node:assert/strict';
import express from 'express';
import { mkdtempSync, readFileSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';

const dataDir = mkdtempSync(path.join(tmpdir(), 'cyberaware-auth-smoke-'));
process.env.AUTH_DATA_DIR = dataDir;
process.env.AUTH_JWT_SECRET = 'isolated-auth-smoke-secret-at-least-32-bytes';
process.env.NODE_ENV = 'test';
process.env.SMTP_HOST = '';
process.env.APP_URL = 'http://127.0.0.1';

const { authRouter, db } = await import('../backend/auth');
const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);
const server = app.listen(0, '127.0.0.1');
await new Promise<void>(resolve => server.once('listening', resolve));
const port = (server.address() as AddressInfo).port;
process.env.APP_URL = `http://127.0.0.1:${port}`;
const base = `${process.env.APP_URL}/api/auth`;
const email = `smoke-${Date.now()}@example.test`;

async function post(route: string, body: object, cookie?: string) {
  return fetch(`${base}${route}`, {
    method: 'POST', headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body),
  });
}

function cookie(response: Response, name: string): string {
  const value = response.headers.getSetCookie().find(item => item.startsWith(`${name}=`) && !item.includes('Max-Age=0'));
  assert.ok(value, `Missing ${name} cookie`);
  return value.split(';')[0];
}

try {
  const registration = await post('/register', { fullname: 'Smoke User', email, password: 'OldPass!234' });
  assert.equal(registration.status, 202);
  const pending = await registration.json() as { requiresVerification: boolean; token?: string; user?: unknown; deliveryMode: string };
  assert.equal(pending.requiresVerification, true);
  assert.equal(pending.deliveryMode, 'local');
  assert.equal(pending.token, undefined);
  assert.equal(pending.user, undefined);
  assert.equal((await post('/login', { email, password: 'OldPass!234' })).status, 401);

  const verificationCookie = cookie(registration, 'cyberaware_verify');
  const verificationCode = readFileSync(path.join(dataDir, 'dev-verification-codes.log'), 'utf8').trim().split('\n').at(-1)!.split(' ').at(-1)!;
  assert.match(verificationCode, /^\d{8}$/);
  assert.equal((await post('/verify-email', { email, code: '00000000' }, verificationCookie)).status, 401);
  const verification = await post('/verify-email', { email, code: verificationCode }, verificationCookie);
  assert.equal(verification.status, 201);
  const verified = await verification.json() as { user: { email: string; emailVerified: boolean }; token: string };
  assert.equal(verified.user.email, email);
  assert.equal(verified.user.emailVerified, true);
  assert.ok(verified.token);
  assert.equal((await post('/verify-email', { email, code: verificationCode }, verificationCookie)).status, 401);

  assert.equal((await post('/login', { email, password: 'wrong' })).status, 401);
  const login = await post('/login', { email, password: 'OldPass!234' });
  assert.equal(login.status, 200);
  const sessionCookie = cookie(login, 'cyberaware_session');
  assert.equal((await fetch(`${base}/me`, { headers: { cookie: sessionCookie } })).status, 200);
  assert.equal((await post('/reset-password', { email, newPassword: 'NewPass!456' })).status, 401);

  const forgot = await post('/forgot-password', { email });
  assert.equal(forgot.status, 200);
  assert.equal(((await forgot.json()) as { deliveryMode: string }).deliveryMode, 'local');
  const resetCode = readFileSync(path.join(dataDir, 'dev-reset-codes.log'), 'utf8').trim().split('\n').at(-1)!.split(' ').at(-1)!;
  assert.match(resetCode, /^\d{8}$/);
  assert.equal((await fetch(`${base}/reset-password/status`)).status, 401);
  const confirmation = await post('/verify-reset-code', { email, code: resetCode });
  assert.equal(confirmation.status, 200);
  const resetCookie = cookie(confirmation, 'cyberaware_reset');
  assert.equal((await post('/reset-password', { email, newPassword: 'NewPass!456' }, resetCookie)).status, 200);
  assert.equal((await fetch(`${base}/reset-password/status`, { headers: { cookie: resetCookie } })).status, 401);
  assert.equal((await post('/reset-password', { email, newPassword: 'AgainPass!789' }, resetCookie)).status, 401);
  assert.equal((await post('/login', { email, password: 'OldPass!234' })).status, 401);
  assert.equal((await post('/login', { email, password: 'NewPass!456' })).status, 200);
  assert.equal((await fetch(`${base}/me`, { headers: { cookie: sessionCookie } })).status, 401);
  console.log('PASS: registration verification, login, session, one-time reset, old session invalidation');
} finally {
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  db.close();
  assert.ok(realpathSync(dataDir).startsWith(realpathSync(tmpdir()) + path.sep));
  rmSync(dataDir, { recursive: true, force: true });
}
