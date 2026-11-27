import { ApiError } from '../http';
import { analyze, normalizeQuery } from './analysis';

// Giới hạn nội dung email trước khi chuyển sang bộ phân tích tin nhắn dùng chung.
const MAX_BODY = 4500;
const MAX_LINKS = 10;

function limitedText(value: unknown, max: number): string {
  if (typeof value !== 'string') return '';
  return value.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
}

// Bổ sung dấu hiệu riêng của email: người gửi, tên miền liên kết và lời yêu cầu chuyển tiền gấp.
export async function analyzeEmail(input: unknown, allowAi = false) {
  const mail = input && typeof input === 'object' ? input as Record<string, unknown> : {};
  const subject = limitedText(mail.subject, 300);
  const sender = limitedText(mail.sender, 300);
  const body = limitedText(mail.body, MAX_BODY);
  const links: string[] = Array.isArray(mail.links) ? mail.links.slice(0, MAX_LINKS)
    .filter((item: unknown): item is string => typeof item === 'string')
    .map((item: string) => limitedText(item, 500)) : [];
  if (!subject && !body && !links.length) throw new ApiError(400, 'Thư không có nội dung để kiểm tra.');
  const query = normalizeQuery('sms', `Chủ đề: ${subject}\n${body.slice(0, 3900)}\nLiên kết: ${links.join(' ')}`.slice(0, 5000));
  const result = await analyze('sms', query, false, allowAi);
  const flags = [...result.flags];
  let score = result.riskScore;

  // So tên miền liên kết với địa chỉ người gửi, không mở liên kết để xác minh.
  const senderAddress = sender.match(/<([^<>\s]+@[^<>\s]+)>/)?.[1] || sender.match(/[\w.+-]+@[\w.-]+/)?.[0] || '';
  const senderDomain = senderAddress.split('@')[1]?.toLowerCase();
  const domains = links.flatMap(link => { try { const url = new URL(link); return ['http:', 'https:'].includes(url.protocol) ? [url.hostname.toLowerCase()] : []; } catch { return []; } });
  const plainBody = body.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
  const asksForMoney = /\b(?:chuyen|gui|ck)\b.{0,55}\b\d+(?:[.,]\d+)?\s*(?:trieu|tr|nghin|ngan|k|vnd|dong)\b/.test(plainBody);
  const urgent = /\b(?:gap|nhanh|ngay|can tien|mai.{0,25}tra)\b/.test(plainBody);
  const safetyAdvice = /\b(?:khong|dung|canh bao|canh giac)\b.{0,55}\b(?:chuyen|gui|ck)\b/.test(plainBody);
  if (asksForMoney && urgent && !safetyAdvice) {
    score = Math.max(score, 45);
    if (!flags.some(flag => flag.includes('chuyển tiền gấp'))) flags.push('Thư nhờ chuyển tiền gấp; hãy gọi hoặc liên hệ người gửi qua kênh đã biết để xác minh trước khi chuyển.');
  }
  if (senderDomain && domains.length && domains.every(domain => domain !== senderDomain && !domain.endsWith(`.${senderDomain}`))) {
    score = Math.min(100, score + 10);
    flags.push('Tên miền trong liên kết khác tên miền người gửi; hãy xác minh đích đến trước khi mở.');
  }
  if (links.some(link => /^http:\/\//i.test(link))) {
    score = Math.min(100, score + 5);
    flags.push('Thư có liên kết HTTP không mã hóa.');
  }
  if (score >= 30) {
    const generic = flags.findIndex(flag => flag.startsWith('Chưa khớp dấu hiệu của bộ quy tắc hiện tại'));
    if (generic !== -1) flags.splice(generic, 1);
  }
  // Never return or persist message text, sender address or link URLs.
  return { riskScore: score, level: score >= 70 ? 'NGUY_HIEM' : score >= 30 ? 'CANH_GIAC' : 'CHUA_THAY_DAU_HIEU',
    flags: flags.slice(0, 6), recommendations: result.recommendations.slice(0, 3),
    aiStatus: result.aiStatus, aiReasoning: result.aiReasoning, actionAdvice: result.actionAdvice, limited: true };
}
