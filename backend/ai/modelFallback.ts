// Lập danh sách model chính và model dự phòng riêng cho quét rủi ro/chat, loại tên trùng.
export function modelCandidates(primary: string, purpose: 'scan' | 'chat') {
  const backups = purpose === 'scan'
    ? ['gemini-3.1-flash-lite', 'gemini-3.5-flash']
    : ['gemini-3.5-flash-lite', 'gemini-3.6-flash'];
  return [...new Set([primary, ...backups])].slice(0, 3);
}

// Chỉ thử model khác với lỗi tạm thời, model không có sẵn hoặc phản hồi model không hợp lệ.
export function canTryAnotherModel(error: unknown) {
  const value = error as { status?: unknown; name?: unknown; message?: unknown } | null;
  const status = Number(value?.status);
  if ([408, 404, 429, 500, 501, 502, 503, 504].includes(status)) return true;
  const name = String(value?.name || '');
  const message = String(value?.message || '');
  return /timeout|abort|network|fetch|socket|econnreset|invalid-model-response/i.test(`${name} ${message}`);
}
