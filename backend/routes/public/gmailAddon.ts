import { createHash, timingSafeEqual } from 'node:crypto';
import type { Router } from 'express';
import { ApiError, rateLimit } from '../../http';
import { analyzeEmail } from '../../analysis/email';

const windows = new Map<string, { count: number; expires: number }>();

function authorized(provided: unknown): boolean {
  const secret = process.env.GMAIL_ADDON_API_KEY;
  if (!secret || secret.length < 32 || typeof provided !== 'string') return false;
  const a = createHash('sha256').update(provided).digest();
  const b = createHash('sha256').update(secret).digest();
  return timingSafeEqual(a, b);
}

function throttle(installId: unknown) {
  if (typeof installId !== 'string' || !/^[a-f0-9-]{36}$/.test(installId)) throw new ApiError(400, 'Mã cài đặt không hợp lệ.');
  const now = Date.now();
  const current = windows.get(installId);
  const next = !current || current.expires <= now ? { count: 1, expires: now + 60_000 } : { count: current.count + 1, expires: current.expires };
  windows.set(installId, next);
  if (next.count > 30) throw new ApiError(429, 'Đã vượt giới hạn quét. Vui lòng thử lại sau một phút.');
  if (windows.size > 5000) for (const [key, value] of windows) if (value.expires <= now) windows.delete(key);
}

export function registerGmailAddonRoutes(router: Router) {
  router.post('/gmail-addon/analyze', async (req, res, next) => {
    try {
      if (!authorized(req.get('x-cyberaware-addon-key'))) throw new ApiError(401, 'Add-on chưa được cấu hình.');
      throttle(req.get('x-cyberaware-install-id'));
      res.json(await analyzeEmail(req.body));
    } catch (error) { next(error); }
  });
  router.post('/gmail-extension/analyze', rateLimit(10, 60_000), async (req, res, next) => {
    try { res.json(await analyzeEmail(req.body)); }
    catch (error) { next(error); }
  });
}
