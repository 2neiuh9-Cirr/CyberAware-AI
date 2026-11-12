import 'dotenv/config';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

if (!process.env.GEMINI_API_KEY?.trim()) {
  console.error('GEMINI_API_KEY is not configured.');
  process.exitCode = 2;
} else {
  // Isolate the verification scan from the application's normal SQLite data.
  process.env.AUTH_DATA_DIR = mkdtempSync(path.join(tmpdir(), 'cyberaware-gemini-live-'));
  const { analyze, normalizeQuery } = await import('../../backend/analysis/analysis');
  const result = await analyze('sms', normalizeQuery('sms', 'Chúc mừng sinh nhật! Hẹn gặp bạn ngày mai.'), false);
  const novel = await analyze('sms', normalizeQuery('sms', 'Để hoàn tất hồ sơ, hãy đọc mã khôi phục ví cho người hướng dẫn trong cuộc gọi.'), false);
  console.log(JSON.stringify({
    checkedAt: new Date().toISOString(),
    configuredModel: process.env.GEMINI_MODEL || 'gemini-3.6-flash',
    aiStatus: result.aiStatus,
    source: result.source,
    analysisTimeMs: result.analysisTimeMs,
    benignRiskScore: result.riskScore,
    novelRiskScore: novel.riskScore,
    novelAiStatus: novel.aiStatus,
  }));
  if (result.aiStatus !== 'available' || novel.aiStatus !== 'available' || result.riskScore >= 30 || novel.riskScore < 30) process.exitCode = 1;
}
