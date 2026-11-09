import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

process.env.AUTH_DATA_DIR = mkdtempSync(path.join(tmpdir(), 'cyberaware-risk-'));
process.env.GEMINI_API_KEY = '';
const { analyze, normalizeQuery, applyAiAssessment, applyGeminiWithFallback } = await import('../backend/analysis/analysis');

test('ordinary URLs and safety advice stay low risk', async () => {
  for (const input of ['https://vietcombank.com.vn/login', 'https://example.org/login', 'https://baochinhphu.vn/canh-bao-lua-dao']) {
    const result = await analyze('url', normalizeQuery('url', input), false);
    assert.ok(result.riskScore < 30, `${input}: ${result.riskScore}`);
  }
  for (const input of ['Không cung cấp OTP và không bấm vào đường link lạ.', 'Mã OTP của bạn là 123456. Không chia sẻ cho ai.', 'Tôi vừa chuyển tiền vào tài khoản hôm qua.']) {
    const result = await analyze('sms', normalizeQuery('sms', input), false);
    assert.ok(result.riskScore < 30, `${input}: ${result.riskScore}`);
  }
});

test('brand impersonation, executable download and credential requests rank high', async () => {
  for (const input of ['https://vietcombank.com.vn.attacker.invalid/login', 'https://fake.example/vneid.apk']) {
    const result = await analyze('url', normalizeQuery('url', input), false);
    assert.ok(result.riskScore >= 30, `${input}: ${result.riskScore}`);
  }
  for (const input of ['Vui lòng gửi mã OTP để nhận tiền hoàn thuế ngay.', 'Chuyển tiền vào tài khoản an toàn trong 2 giờ nếu không sẽ bị bắt.', 'Hãy cài đặt ứng dụng APK và cấp quyền trợ năng để xác minh.']) {
    const result = await analyze('sms', normalizeQuery('sms', input), false);
    assert.ok(result.riskScore >= 70, `${input}: ${result.riskScore}`);
  }
  const linked = await analyze('sms', normalizeQuery('sms', 'Vui lòng đăng nhập tại https://vietcombank.com.vn.attacker.invalid/login'), false);
  assert.ok(linked.riskScore >= 70);
});

test('unexpected prize link from the screenshot is high risk without treating the demo URL as a live threat', async () => {
  const message = 'Chúc mừng bạn là 1 trong 5 khách hàng may mắn trúng xe máy Honda SH 150i trị giá 98.000.000đ. Nhấn vào https://example.invalid/minh-hoa để hoàn tất thủ tục nhận xe!';
  const result = await analyze('sms', normalizeQuery('sms', message), false);
  assert.equal(result.level, 'NGUY_HIEM');
  assert.ok(result.riskScore >= 70, String(result.riskScore));
  assert.ok(result.flags.some(flag => flag.includes('trúng giải bất ngờ')));
  const ordinary = await analyze('sms', normalizeQuery('sms', 'Chúc mừng sinh nhật! Hẹn gặp bạn ngày mai.'), false);
  assert.ok(ordinary.riskScore < 30);
});

test('prize with tax payment from the quick sample is high risk in accented and unaccented Vietnamese', async () => {
  for (const message of [
    'Shopee: Quy khach may man trung 01 xe may SH. Vui long nop thue 2 trieu dong vao STK 098123...',
    'Shopee: Quý khách may mắn trúng 01 xe máy SH. Vui lòng nộp thuế 2 triệu đồng vào STK 098123...',
  ]) {
    const result = await analyze('sms', normalizeQuery('sms', message), false);
    assert.equal(result.level, 'NGUY_HIEM', `${message}: ${result.riskScore}`);
    assert.ok(result.flags.some(flag => flag.includes('nộp thuế hoặc phí')));
  }
  const normal = await analyze('sms', normalizeQuery('sms', 'Tôi đã nộp thuế thu nhập cá nhân hôm qua.'), false);
  assert.ok(normal.riskScore < 30);
});

test('AI can raise a new pattern only with evidence present in user input', async () => {
  const result = await analyze('sms', normalizeQuery('sms', 'Hãy chuyển khoản để kích hoạt hồ sơ nhận quà bí mật.'), false);
  const initialScore = result.riskScore;
  applyAiAssessment(result, { riskScore: 82, evidence: ['kích hoạt hồ sơ nhận quà'], reasoning: 'Yêu cầu thanh toán để nhận quyền lợi.', threatCategory: 'Thu phí trước', actionAdvice: 'Xác minh với tổ chức.' });
  assert.equal(result.riskScore, Math.max(initialScore, 82));
  assert.equal(result.aiStatus, 'available');
  assert.ok(result.source?.includes('+ai'));
  const unchanged = await analyze('sms', normalizeQuery('sms', 'Xin chào bạn.'), false);
  assert.throws(() => applyAiAssessment(unchanged, { riskScore: 90, evidence: ['nộp tiền'], reasoning: 'Bịa đặt', threatCategory: 'Khác', actionAdvice: 'Khác' }));
  assert.equal(unchanged.riskScore, 5);
  applyAiAssessment(result, { riskScore: 1, evidence: [], reasoning: 'Không thấy thêm.', threatCategory: 'Khác', actionAdvice: 'Kiểm tra lại.' });
  assert.ok(result.riskScore >= 82);
});

test('Gemini timeout and quota errors preserve the rule result', async () => {
  for (const error of [Object.assign(new Error('timed out'), { name: 'TimeoutError' }), Object.assign(new Error('quota exceeded'), { status: 429 })]) {
    const result = await analyze('sms', normalizeQuery('sms', 'Vui lòng gửi mã OTP ngay.'), false);
    const baseline = { score: result.riskScore, source: result.source, flags: [...result.flags] };
    const models: string[] = [];
    await applyGeminiWithFallback(result, 'gemini-3.6-flash', async model => { models.push(model); throw error; });
    assert.deepEqual(models, ['gemini-3.6-flash']);
    assert.equal(result.aiStatus, 'unavailable');
    assert.equal(result.riskScore, baseline.score);
    assert.equal(result.source, baseline.source);
    assert.deepEqual(result.flags, baseline.flags);
  }
});

test('Gemini retries a supported fallback model when the primary model is unavailable', async () => {
  const result = await analyze('sms', normalizeQuery('sms', 'Hãy chuyển khoản để kích hoạt hồ sơ nhận quà bí mật.'), false);
  const models: string[] = [];
  await applyGeminiWithFallback(result, 'gemini-3.6-flash', async model => {
    models.push(model);
    if (model === 'gemini-3.6-flash') throw Object.assign(new Error('unavailable'), { status: 503 });
    return { text: JSON.stringify({ riskScore: 82, evidence: ['kích hoạt hồ sơ nhận quà'], reasoning: 'Yêu cầu thanh toán để nhận quyền lợi.', threatCategory: 'Thu phí trước', actionAdvice: 'Xác minh với tổ chức.' }) };
  });
  assert.deepEqual(models, ['gemini-3.6-flash', 'gemini-3.1-flash-lite']);
  assert.equal(result.aiStatus, 'available');
  assert.ok(result.source?.includes('+ai'));
});
