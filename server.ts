import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { authRouter, refreshRememberedSession } from './backend/auth';
import { apiRouter, apiError } from './backend/api';
import { adminRouter } from './backend/admin';
import { chatRouter } from './backend/chat/chat';
import { siteTranslationRouter } from './backend/siteTranslation';
import { db } from './backend/database';
import { rateLimit } from './backend/http';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  if (process.env.TRUST_PROXY_HOPS) app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS));
  app.use('/api', (req, res, next) => {
    const started = Date.now();
    res.on('finish', () => {
      db.prepare('INSERT INTO admin_request_log (method,path,status,duration_ms,created_at) VALUES (?,?,?,?,?)').run(req.method, req.path, res.statusCode, Date.now() - started, new Date().toISOString());
      if (Math.random() < 0.01) db.prepare('DELETE FROM admin_request_log WHERE created_at < ?').run(new Date(Date.now() - 30 * 86400_000).toISOString());
    });
    res.set({ 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' });
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.headers.origin) {
      const expected = process.env.APP_URL ? new URL(process.env.APP_URL).origin : `${req.protocol}://${req.get('host')}`;
      if (req.headers.origin !== expected) return res.status(403).json({ success: false, error: 'Nguồn yêu cầu không hợp lệ.' });
    }
    next();
  });
  app.use(express.json({ limit: '512kb' }));
  app.use('/api', (req, res, next) => { refreshRememberedSession(req, res); next(); });
  const authLimits = new Map<string, ReturnType<typeof rateLimit>>();
  app.use('/api/auth', (req, res, next) => {
    if (req.method !== 'POST' || req.path === '/logout' || req.path === '/reset-password/cancel') return next();
    let limit = authLimits.get(req.path);
    if (!limit) { limit = rateLimit(req.path === '/forgot-password' ? 10 : 20, 15 * 60_000); authLimits.set(req.path, limit); }
    return limit(req, res, next);
  }, authRouter);
  app.use('/api/chat', chatRouter);
  app.use('/api/site-translate', siteTranslationRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api', apiRouter);
  app.use('/api', (_req, res) => res.status(404).json({ success: false, error: 'API không tồn tại.' }));
  app.use(apiError);
  return app;
}

export async function startServer() {
  const app = createApp();
  const root = path.dirname(fileURLToPath(import.meta.url));
  const requestedPort = Number(process.env.PORT) || 3000;
  const bindAddress = process.env.HOST || (process.env.NODE_ENV === 'production' ? '127.0.0.1' : '0.0.0.0');
  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(root, 'dist')));
    app.get('*', (_req, res) => res.sendFile(path.join(root, 'dist/index.html')));
  }
  const candidates = process.env.PORT || process.env.NODE_ENV === 'production' ? [requestedPort] : Array.from({ length: 20 }, (_, i) => requestedPort + i);
  for (const port of candidates) {
    try {
      const server = await new Promise<ReturnType<typeof app.listen>>((resolve, reject) => {
        const listening = app.listen(port, bindAddress);
        listening.once('listening', () => resolve(listening));
        listening.once('error', reject);
      });
      if (process.env.NODE_ENV !== 'production' && process.env.APP_URL?.match(/^http:\/\/localhost:\d+\/?$/)) process.env.APP_URL = `http://localhost:${port}`;
      console.log(`CyberAware AI: http://localhost:${port}${port !== requestedPort ? ` (cổng ${requestedPort} đang được sử dụng)` : ''}`);
      return server;
    } catch (error: any) {
      if (error.code !== 'EADDRINUSE' || process.env.PORT || process.env.NODE_ENV === 'production') throw error;
    }
  }
  throw new Error(`Không tìm được cổng trống từ ${requestedPort} đến ${candidates.at(-1)}.`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  startServer().catch(error => { console.error(error); process.exitCode = 1; });
}
