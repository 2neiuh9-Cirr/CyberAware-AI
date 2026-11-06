export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export async function api<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, { ...options, credentials: 'same-origin', headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers }, signal: options.signal || AbortSignal.timeout(20_000) });
  } catch (error) {
    if (options.signal?.aborted) throw error;
    throw new Error('Không kết nối được máy chủ hoặc yêu cầu quá thời gian. Vui lòng thử lại.');
  }
  const data = await response.json().catch(() => ({ error: 'Phản hồi máy chủ không hợp lệ.' }));
  if (!response.ok) {
    if (response.status === 401 && !path.startsWith('/auth/')) window.dispatchEvent(new Event('cyberaware-session-expired'));
    throw new HttpError(response.status, data.error || 'Yêu cầu không thành công.');
  }
  return data as T;
}
export const json = (method: string, body?: unknown): RequestInit => ({ method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
