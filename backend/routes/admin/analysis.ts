import type { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { db } from '../../database';
import { ApiError, textField } from '../../http';
import { stamp, n, admin, audit, json } from './shared';

export function registerAdminAnalysisRoutes(router: Router) {
  router.get('/analysis/settings', (_req, res) => {
    const configured = !!process.env.GEMINI_API_KEY?.trim();
    const enabled = db.prepare('SELECT ai_enabled FROM analysis_settings WHERE id = 1').get()?.ai_enabled === 1;
    res.json({ configured, enabled, active: configured && enabled, model: process.env.GEMINI_MODEL || 'gemini-3.6-flash' });
  });
  router.patch('/analysis/settings', (req, res) => {
    if (typeof req.body?.enabled !== 'boolean') throw new ApiError(400, 'enabled phải là true hoặc false.');
    if (req.body.enabled && !process.env.GEMINI_API_KEY?.trim()) throw new ApiError(409, 'Cần cấu hình GEMINI_API_KEY trước khi bật AI.');
    db.prepare('UPDATE analysis_settings SET ai_enabled = ? WHERE id = 1').run(req.body.enabled ? 1 : 0);
    audit(req, 'analysis.settings', 'analysis', '1', req.body.enabled ? 'enabled' : 'disabled');
    res.json({ configured: !!process.env.GEMINI_API_KEY?.trim(), enabled: req.body.enabled, active: !!process.env.GEMINI_API_KEY?.trim() && req.body.enabled, model: process.env.GEMINI_MODEL || 'gemini-3.6-flash' });
  });

  // Curated rule and warning corpus. Keep source and review status with every imported warning.
  router.get('/analysis/rules', (req, res) => {
    admin(req);
    const items = db.prepare('SELECT id,type,title,terms,weight,enabled,updated_at AS updatedAt FROM scam_rules ORDER BY type,id').all().map((row: any) => ({ ...row, terms: JSON.parse(row.terms) }));
    res.json({ items, total: items.length });
  });
  router.post('/analysis/rules', (req, res) => {
    const actor = admin(req);
    const id = textField(req.body?.id || randomUUID(), 'Mã quy tắc', 80);
    const type = ['sms', 'url', 'phone', 'bank', 'all'].includes(req.body?.type) ? req.body.type : null;
    if (!type) throw new ApiError(400, 'type không hợp lệ.');
    const title = textField(req.body?.title, 'Tên quy tắc', 160, 3);
    const terms = req.body?.terms;
    if (!Array.isArray(terms) || terms.length < 1 || terms.length > 100 || terms.some((term: unknown) => typeof term !== 'string' || term.trim().length < 2 || term.length > 120)) throw new ApiError(400, 'terms phải là danh sách 1–100 cụm từ.');
    const weight = Number(req.body?.weight);
    if (!Number.isInteger(weight) || weight < 1 || weight > 60) throw new ApiError(400, 'weight phải là số nguyên 1–60.');
    const updatedAt = stamp();
    try { db.prepare('INSERT INTO scam_rules (id,type,title,terms,weight,enabled,updated_at) VALUES (?,?,?,?,?,?,?)').run(id, type, title, JSON.stringify(terms.map((term: string) => term.trim())), weight, req.body.enabled === false ? 0 : 1, updatedAt); }
    catch { throw new ApiError(409, 'Mã quy tắc đã tồn tại.'); }
    audit(req, 'analysis.rule.create', 'analysis_rule', id, `${type}:${actor.id}`);
    res.status(201).json({ id, type, title, terms, weight, enabled: req.body.enabled !== false, updatedAt });
  });
  router.patch('/analysis/rules/:id', (req, res) => {
    admin(req);
    const existing = db.prepare('SELECT * FROM scam_rules WHERE id=?').get(req.params.id) as any;
    if (!existing) throw new ApiError(404, 'Không tìm thấy quy tắc.');
    const title = req.body.title === undefined ? existing.title : textField(req.body.title, 'Tên quy tắc', 160, 3);
    const terms = req.body.terms === undefined ? JSON.parse(existing.terms) : req.body.terms;
    if (!Array.isArray(terms) || terms.length < 1 || terms.length > 100 || terms.some((term: unknown) => typeof term !== 'string' || term.trim().length < 2 || term.length > 120)) throw new ApiError(400, 'terms phải là danh sách 1–100 cụm từ.');
    const weight = req.body.weight === undefined ? Number(existing.weight) : Number(req.body.weight);
    if (!Number.isInteger(weight) || weight < 1 || weight > 60) throw new ApiError(400, 'weight phải là số nguyên 1–60.');
    if (req.body.enabled !== undefined && typeof req.body.enabled !== 'boolean') throw new ApiError(400, 'enabled phải là true hoặc false.');
    const enabled = req.body.enabled === undefined ? Number(existing.enabled) : (req.body.enabled ? 1 : 0);
    const updatedAt = stamp();
    db.prepare('UPDATE scam_rules SET title=?,terms=?,weight=?,enabled=?,updated_at=? WHERE id=?').run(title, JSON.stringify(terms), weight, enabled, updatedAt, req.params.id);
    audit(req, 'analysis.rule.update', 'analysis_rule', req.params.id);
    res.json({ id: req.params.id, type: existing.type, title, terms, weight, enabled: !!enabled, updatedAt });
  });
  router.delete('/analysis/rules/:id', (req, res) => {
    admin(req);
    const changed = db.prepare('DELETE FROM scam_rules WHERE id=?').run(req.params.id).changes;
    if (!changed) throw new ApiError(404, 'Không tìm thấy quy tắc.');
    audit(req, 'analysis.rule.delete', 'analysis_rule', req.params.id);
    res.json({ success: true });
  });
  router.get('/analysis/intel', (req, res) => {
    admin(req);
    const items = db.prepare('SELECT id,title,category,summary,source_name AS sourceName,source_url AS sourceUrl,source_date AS sourceDate,terms,indicators,status,created_at AS createdAt FROM threat_intel ORDER BY source_date DESC,id').all().map((row: any) => ({ ...row, terms: JSON.parse(row.terms), indicators: JSON.parse(row.indicators) }));
    res.json({ items, total: items.length });
  });
  router.post('/analysis/intel', (req, res) => {
    admin(req);
    const id = textField(req.body?.id || randomUUID(), 'Mã cảnh báo', 100);
    const title = textField(req.body?.title, 'Tiêu đề', 200, 4);
    const category = textField(req.body?.category, 'Danh mục', 100, 2);
    const summary = textField(req.body?.summary, 'Tóm tắt', 2000, 10);
    const sourceName = textField(req.body?.sourceName, 'Nguồn', 200, 2);
    const sourceUrl = textField(req.body?.sourceUrl, 'URL nguồn', 1000);
    try { if (new URL(sourceUrl).protocol !== 'https:') throw new Error(); } catch { throw new ApiError(400, 'Nguồn phải là liên kết HTTPS hợp lệ.'); }
    const sourceDate = textField(req.body?.sourceDate, 'Ngày nguồn', 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(sourceDate)) throw new ApiError(400, 'sourceDate phải theo YYYY-MM-DD.');
    const terms = req.body?.terms ?? [];
    const indicators = req.body?.indicators ?? [];
    if (!Array.isArray(terms) || terms.length > 100 || terms.some((term: unknown) => typeof term !== 'string' || term.length < 2 || term.length > 120)) throw new ApiError(400, 'terms không hợp lệ.');
    if (!Array.isArray(indicators) || indicators.length > 100 || indicators.some((item: any) => !item || !['url','phone','bank'].includes(item.type) || typeof item.value !== 'string' || item.value.length < 3 || item.value.length > 2048)) throw new ApiError(400, 'indicators không hợp lệ.');
    try { db.prepare('INSERT INTO threat_intel (id,title,category,summary,source_name,source_url,source_date,terms,indicators,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)').run(id,title,category,summary,sourceName,sourceUrl,sourceDate,JSON.stringify(terms),JSON.stringify(indicators),'reviewed',stamp()); }
    catch { throw new ApiError(409, 'Mã cảnh báo đã tồn tại.'); }
    audit(req, 'analysis.intel.create', 'threat_intel', id, sourceUrl);
    res.status(201).json({ id, title, category, summary, sourceName, sourceUrl, sourceDate, terms, indicators, status: 'reviewed' });
  });
  router.patch('/analysis/intel/:id/status', (req, res) => {
    admin(req);
    if (!['reviewed','inactive'].includes(req.body?.status)) throw new ApiError(400, 'status phải là reviewed hoặc inactive.');
    const changed = db.prepare('UPDATE threat_intel SET status=? WHERE id=?').run(req.body.status, req.params.id).changes;
    if (!changed) throw new ApiError(404, 'Không tìm thấy cảnh báo.');
    audit(req, 'analysis.intel.status', 'threat_intel', req.params.id, req.body.status);
    res.json({ success: true, id: req.params.id, status: req.body.status });
  });

}
