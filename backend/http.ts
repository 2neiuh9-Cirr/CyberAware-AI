import type { RequestHandler } from 'express';

// Lỗi có mã HTTP rõ ràng để middleware phản hồi đúng nguyên nhân cho client.
export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

// Chuẩn hóa và giới hạn độ dài trường văn bản từ request.
export const textField = (value: unknown, name: string, max: number, min = 1): string => {
  if (typeof value !== 'string' || value.trim().length < min || value.trim().length > max) throw new ApiError(400, `${name} phải dài từ ${min} đến ${max} ký tự.`);
  return value.trim();
};

// Đọc tham số phân trang dạng số nguyên dương, dùng giá trị mặc định nếu thiếu.
export function integer(value: unknown, fallback: number, max: number) {
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || !/^\d+$/.test(value) || Number(value) < 1 || Number(value) > max) throw new ApiError(400, `Tham số phân trang phải là số nguyên từ 1 đến ${max}.`);
  return Number(value);
}

// Giới hạn request theo IP trong từng cửa sổ thời gian; bộ đếm quá hạn được dọn định kỳ.
export function rateLimit(max: number, windowMs: number): RequestHandler {
  const entries = new Map<string, { count: number; until: number }>();
  const cleanup = setInterval(() => { for (const [key, value] of entries) if (value.until <= Date.now()) entries.delete(key); }, windowMs);
  cleanup.unref();
  return (req, res, next) => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    let entry = entries.get(key);
    if (!entry || entry.until <= now) { entry = { count: 0, until: now + windowMs }; entries.set(key, entry); }
    if (++entry.count > max) {
      res.set('Retry-After', String(Math.ceil((entry.until - now) / 1000)));
      res.status(429).json({ success: false, error: 'Quá nhiều yêu cầu. Vui lòng thử lại sau.' });
    } else next();
  };
}
