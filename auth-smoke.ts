import assert from 'node:assert/strict';
import express from 'express';
import { readFileSync } from 'node:fs';
import { AddressInfo } from 'node:net';

process.env.AUTH_DATA_DIR = 'data/auth-smoke';
process.env.APP_URL = 'http://127.0.0.1';
const { authRouter } = await import('./auth');
const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);
const server = app.listen(0, '127.0.0.1');
await new Promise<void>(resolve => server.once('listening', resolve));
const port = (server.address() as AddressInfo).port;
process.env.APP_URL = `http://127.0.0.1:${port}`;
const base = `http://127.0.0.1:${port}/api/auth`;
const email = `smoke-${Date.now()}@example.test`;

async function post(route: string, body: object, cookie?: string) {
  return fetch(`${base}${route}`, {
    method: 'POST', headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body),
  });
}

try {
  const registration = await post('/register', { fullname: 'Smoke User', email, password: 'OldPass!234' });
  assert.equal(registration.status, 201);
  const registered = await registration.json() as any;
  assert.equal(registered.success, true);
  assert.equal(registered.user.email, email);
  assert.ok(registered.token);
  assert.equal((await post('/login', { email, password: 'wrong' })).status, 401);
  const login = await post('/login', { email, password: 'OldPass!234' });
  assert.equal(login.status, 200);
  const sessionCookie = login.headers.getSetCookie().find(value => value.startsWith('cyberaware_session=') && !value.includes('Max-Age=0'))!.split(';')[0];
  assert.equal((await fetch(`${base}/me`, { headers: { cookie: sessionCookie } })).status, 200);
  assert.equal((await post('/reset-password', { email, newPassword: 'NewPass!456' })).status, 401);
  const forgot = await post('/forgot-password', { email });
  assert.equal(forgot.status, 200);
  assert.equal(((await forgot.json()) as any).deliveryMode, 'local');
  const code = readFileSync('data/auth-smoke/dev-reset-codes.log', 'utf8').trim().split('\n').at(-1)!.split(' ').at(-1)!;
  assert.match(code, /^\d{8}$/);
  const confirmation = await post('/verify-reset-code', { email, code });
  assert.equal(confirmation.status, 200);
  const resetCookie = confirmation.headers.getSetCookie().find(value => value.startsWith('cyberaware_reset='))!.split(';')[0];
  assert.equal((await fetch(`${base}/reset-password/status`, { headers: { cookie: resetCookie } })).status, 200);
  assert.equal((await post('/reset-password', { email, newPassword: 'NewPass!456' }, resetCookie)).status, 200);
  assert.equal((await fetch(`${base}/reset-password/status`, { headers: { cookie: resetCookie } })).status, 401);
  assert.equal((await post('/reset-password', { email, newPassword: 'AgainPass!789' }, resetCookie)).status, 401);
  assert.equal((await post('/login', { email, password: 'OldPass!234' })).status, 401);
  assert.equal((await post('/login', { email, password: 'NewPass!456' })).status, 200);
  assert.equal((await fetch(`${base}/me`, { headers: { cookie: sessionCookie } })).status, 401);
  console.log('PASS: register, login, session, email code verification, one-time reset, old session invalidation');
} finally {
  server.close();
}
