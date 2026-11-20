import { notify } from './components/common/toast';

export class HttpError extends Error {
  constructor(public status: number, message: string, public retryAfterSeconds?: number) { super(message); }
}
export async function api<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, { ...options, credentials: 'same-origin', headers: { ...(options.body && !(options.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}), ...options.headers }, signal: options.signal || AbortSignal.timeout(20_000) });
  } catch (error) {
    if (options.signal?.aborted && options.signal.reason?.name !== 'TimeoutError') throw error;
    const failure = new Error('Không kết nối được máy chủ hoặc yêu cầu quá thời gian. Vui lòng thử lại.');
    notify(failure.message, 'error');
    throw failure;
  }
  const data = await response.json().catch(() => ({ error: 'Phản hồi máy chủ không hợp lệ.' }));
  if (!response.ok) {
    if (response.status === 401 && !path.startsWith('/auth/')) window.dispatchEvent(new Event('cyberaware-session-expired'));
    const retryAfterSeconds = Number(response.headers.get('retry-after'));
    const failure = new HttpError(response.status, data.error || 'Yêu cầu không thành công.', Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0 ? retryAfterSeconds : undefined);
    if (!(response.status === 401 && path === '/me')) notify(failure.message, 'error');
    throw failure;
  }
  return data as T;
}
export const json = (method: string, body?: unknown): RequestInit => ({ method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
