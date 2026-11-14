import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

process.env.AUTH_DATA_DIR = mkdtempSync(path.join(tmpdir(), 'cyberaware-risk-'));
process.env.GEMINI_API_KEY = '';
const { analyze, normalizeQuery, applyAiAssessment, applyGeminiWithFallback } = await import('../backend/analysis/analysis');
const { analyzeEmail } = await import('../backend/analysis/email');

test('urgent informal email asking for a transfer receives a caution even without AI', async () => {
  for (const body of [
    'Hoi t dang can tien gap, m chuyen giup t 5 trieu vao tai khoan t gui voi, mai t tra m nhe.',
    'Tôi cần tiền gấp, chuyển giúp tôi 5 triệu, mai tôi trả nhé.',
  ]) {
    const result = await analyzeEmail({ sender: 'Bạn quen <friend@example.test>', body }, false);
    assert.ok(result.riskScore >= 30, `${body}: ${result.riskScore}`);
    assert.equal(result.aiStatus, 'disabled');
    assert.ok(result.flags.some(flag => flag.includes('chuyển tiền gấp')));
    assert.ok(!result.flags.some(flag => flag.startsWith('Chưa khớp dấu hiệu')));
  }
  const advice = await analyzeEmail({ body: 'Cảnh báo: đừng chuyển 5 triệu ngay cho người lạ. Hãy tự xác minh.' }, false);
  assert.ok(advice.riskScore < 30, String(advice.riskScore));
});

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
    assert.deepEqual(models, ['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3.1-flash-lite']);
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
  assert.deepEqual(models, ['gemini-3.6-flash', 'gemini-3.5-flash']);
  assert.equal(result.aiStatus, 'available');
  assert.ok(result.source?.includes('+ai'));
});

test('Gemini retries malformed model output but not authentication errors', async () => {
  const query = normalizeQuery('sms', 'Hãy đọc mã khôi phục ví cho người hướng dẫn.');
  const recovered = await analyze('sms', query, false);
  const models: string[] = [];
  await applyGeminiWithFallback(recovered, 'gemini-3.6-flash', async model => {
    models.push(model);
    return { text: model === 'gemini-3.6-flash' ? '{' : JSON.stringify({ riskScore: 80, evidence: ['đọc mã khôi phục ví cho người hướng dẫn'], reasoning: 'Yêu cầu tiết lộ bí mật.', threatCategory: 'Chiếm đoạt ví', actionAdvice: 'Không chia sẻ mã.' }) };
  });
  assert.deepEqual(models, ['gemini-3.6-flash', 'gemini-3.5-flash']);
  assert.equal(recovered.aiStatus, 'available');
  const denied = await analyze('sms', query, false);
  const attempted: string[] = [];
  await applyGeminiWithFallback(denied, 'gemini-3.6-flash', async model => {
    attempted.push(model);
    throw Object.assign(new Error('invalid key'), { status: 401 });
  });
  assert.deepEqual(attempted, ['gemini-3.6-flash']);
  assert.equal(denied.aiStatus, 'unavailable');
});

test('new source-backed patterns require combined evidence and respect admin enable state', async () => {
  const { db } = await import('../backend/auth');
  const cases = [
    { id: 'sms-official-order-refund', message: 'Đơn hàng lỗi, cần hoàn tiền. Kết bạn Zalo và quét mã QR để xác minh lệnh hoàn tiền.', marker: 'hoàn/trả hàng qua kênh ngoài' },
    { id: 'sms-official-gift-qr', message: 'Bạn có quà tri ân bất ngờ. Quét mã QR để xác thực nhận quà.', marker: 'Quà hoặc voucher bất ngờ' },
    { id: 'sms-official-fake-captcha', message: 'CAPTCHA xác minh robot: nhấn Windows+R, Ctrl+V rồi Enter.', marker: 'CAPTCHA yêu cầu mở công cụ' },
  ];
  for (const item of cases) {
    const query = normalizeQuery('sms', item.message);
    const enabled = await analyze('sms', query, false);
    assert.ok(enabled.flags.some(flag => flag.includes(item.marker)), `${item.id}: missing flag`);
    db.prepare('UPDATE scam_rules SET enabled = 0 WHERE id = ?').run(item.id);
    try {
      const disabled = await analyze('sms', query, false);
      assert.ok(!disabled.flags.some(flag => flag.includes(item.marker)), `${item.id}: flag remained enabled`);
    } finally {
      db.prepare('UPDATE scam_rules SET enabled = 1 WHERE id = ?').run(item.id);
    }
  }
  for (const message of ['Tôi muốn trả hàng, hãy trao đổi với shop trong ứng dụng.', 'Hôm nay tôi dùng mã QR để nhận voucher tại cửa hàng.', 'CAPTCHA thông thường không yêu cầu chạy PowerShell.']) {
    const result = await analyze('sms', normalizeQuery('sms', message), false);
    assert.ok(result.riskScore < 30, `${message}: ${result.riskScore}`);
  }
});

test('independent AI assessment can raise an unmatched message without leaving a contradictory low-risk flag', async () => {
  const result = await analyze('sms', normalizeQuery('sms', 'Để hoàn tất hồ sơ, hãy đọc mã khôi phục ví cho người hướng dẫn trong cuộc gọi.'), false);
  const before = result.riskScore;
  applyAiAssessment(result, { riskScore: 78, evidence: ['hãy đọc mã khôi phục ví cho người hướng dẫn'], reasoning: 'Yêu cầu tiết lộ bí mật khôi phục ví trong cuộc gọi.', threatCategory: 'Chiếm đoạt ví', actionAdvice: 'Ngừng trao đổi và tự xác minh qua kênh chính thức.' });
  assert.ok(before < 78);
  assert.equal(result.riskScore, 78);
  assert.equal(result.level, 'NGUY_HIEM');
  assert.ok(result.source?.includes('+ai'));
  assert.ok(!result.flags.some(flag => flag.startsWith('Chưa khớp dấu hiệu')));
});

test('AI cannot replace stronger reviewed evidence with a reassuring explanation', async () => {
  const result = await analyze('sms', normalizeQuery('sms', 'Hãy chuyển tiền ngay để mở khóa hồ sơ.'), true);
  applyAiAssessment(result, { riskScore: 10, evidence: [], reasoning: 'Không có gì đáng lo.', threatCategory: 'Không rõ', actionAdvice: 'Có thể tiếp tục.' });
  assert.ok(result.riskScore >= 85);
  assert.equal(result.aiReasoning, undefined);
  assert.equal(result.actionAdvice, undefined);
  assert.equal(result.aiStatus, 'available');
});
