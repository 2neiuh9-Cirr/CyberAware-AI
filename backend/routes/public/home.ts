import type { Router } from 'express';
import { db } from '../../database';
import { now } from './shared';

export function registerHomeRoutes(router: Router) {
  router.get('/health', (_req, res) => { db.prepare('SELECT 1').get(); res.json({ status: 'ok', database: 'ok', timestamp: now() }); });
  router.get('/public-warnings/featured', (_req, res) => {
    // Keep the home page editorially small and link only to vetted public sources.
    const featuredIds = [
      'vn-20261105-alert-11', 'vn-20261105-alert-20', 'vn-20261105-alert-14',
      'vn-20261105-alert-08', 'vn-20261105-alert-17', 'vn-20261105-alert-13',
      'vn-20261105-alert-19',
    ];
    const rows = db.prepare(`SELECT id,title,category,summary,source_name AS sourceName,
      source_url AS sourceUrl,source_date AS sourceDate FROM threat_intel
      WHERE status = 'reviewed' AND id IN (${featuredIds.map(() => '?').join(',')})`).all(...featuredIds);
    const trustedHosts = new Set(['baochinhphu.vn', 'thanglong.baochinhphu.vn', 'bocongan.gov.vn', 'www.bocongan.gov.vn', 'mps.gov.vn', 'www.mps.gov.vn']);
    const items = rows.filter((row: any) => {
      try { const url = new URL(row.sourceUrl); return url.protocol === 'https:' && trustedHosts.has(url.hostname); }
      catch { return false; }
    }).sort((a: any, b: any) => featuredIds.indexOf(a.id) - featuredIds.indexOf(b.id));
    res.json({ items });
  });
  router.get('/featured-video', (_req, res) => {
    res.json({
      provider: 'youtube',
      videoId: '7KeIXo0G0ws',
      title: "Cuộc gọi từ 'người thân' hóa ác mộng: Chiêu lừa đảo bằng A.I khiến nhiều người trắng tay | VTV Times",
      embedUrl: 'https://www.youtube.com/embed/7KeIXo0G0ws',
      watchUrl: 'https://www.youtube.com/watch?v=7KeIXo0G0ws',
    });
  });
}
