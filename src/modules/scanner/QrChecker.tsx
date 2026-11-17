import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { QrCode, Upload } from 'lucide-react';
import { api, json } from '../../api';
import { readQrFromImage } from './qrImage';
import { parseVietQr } from './vietQr';
import { bankNameForBin } from './bankNames';

type UrlReputation = {
  url: string;
  overall: { level: 'NGUY_HIEM' | 'CANH_GIAC' | 'CHUA_XAC_MINH'; source: 'google' | 'cyberAware' | 'none' };
  google: { status: 'matched' | 'not_listed' | 'unavailable'; threatTypes: string[] };
  cyberAware: { riskScore: number; title: string; flags: string[] };
};

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_IMAGE_PIXELS = 24_000_000;
const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

function checkableUrl(value: string): string | null {
  try {
    const url = new URL(value.trim());
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || !url.hostname.includes('.')) return null;
    // The existing URL reputation endpoint also removes query and fragment to avoid sending private tokens.
    url.search = '';
    url.hash = '';
    return url.href;
  } catch {
    return null;
  }
}

export function QrChecker() {
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [reading, setReading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [reputation, setReputation] = useState<UrlReputation | null>(null);
  const requestId = useRef(0);
  const controller = useRef<AbortController | null>(null);

  useEffect(() => () => { requestId.current++; controller.current?.abort(); }, []);

  async function handleImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    const id = ++requestId.current;
    controller.current?.abort();
    setContent('');
    setError('');
    setReputation(null);
    setChecking(false);
    if (!file) return;
    if (!IMAGE_TYPES.has(file.type)) { setError('Hãy chọn ảnh PNG, JPG hoặc WebP.'); return; }
    if (file.size > MAX_IMAGE_BYTES) { setError('Ảnh cần nhỏ hơn 5 MB.'); return; }

    setReading(true);
    let bitmap: ImageBitmap | undefined;
    try {
      try { bitmap = await createImageBitmap(file); }
      catch { throw new Error('Không thể mở ảnh. Hãy thử tệp PNG, JPG hoặc WebP khác.'); }
      if (bitmap.width * bitmap.height > MAX_IMAGE_PIXELS) throw new Error('Kích thước ảnh quá lớn. Hãy chọn ảnh nhỏ hơn.');
      const { default: jsQR } = await import('jsqr');
      const result = await readQrFromImage(bitmap, jsQR);
      if (!result) throw new Error('Không đọc được mã QR trong ảnh. Hãy thử ảnh có mã lớn, rõ và đủ bốn góc.');
      if (id === requestId.current) setContent(result);
    } catch (cause) {
      if (id === requestId.current) setError(cause instanceof Error ? cause.message : 'Không thể đọc ảnh QR.');
    } finally {
      bitmap?.close();
      if (id === requestId.current) setReading(false);
    }
  }

  async function checkUrl(url: string) {
    const id = requestId.current;
    const activeController = new AbortController();
    controller.current = activeController;
    setChecking(true);
    setError('');
    setReputation(null);
    try {
      const result = await api<UrlReputation>('/url-reputation', { ...json('POST', { url }), signal: activeController.signal });
      if (id === requestId.current) setReputation(result);
    } catch (cause) {
      if (id === requestId.current && !activeController.signal.aborted) {
        setError(cause instanceof Error ? cause.message : 'Không thể kiểm tra liên kết.');
      }
    } finally {
      if (controller.current === activeController) controller.current = null;
      if (id === requestId.current) setChecking(false);
    }
  }

  function clear() {
    requestId.current++;
    controller.current?.abort();
    setContent('');
    setError('');
    setReading(false);
    setChecking(false);
    setReputation(null);
  }

  const url = content ? checkableUrl(content) : null;
  const vietQr = content ? parseVietQr(content) : null;
  const displayUrl = url ? new URL(url) : null;
  const containsPrivateUrlParts = !!url && (content.includes('?') || content.includes('#'));
  const dangerous = reputation?.overall.level === 'NGUY_HIEM';

  return (
    <section className="w-full max-w-[1024px] rounded-2xl border border-blue-100 bg-white p-5 shadow-sm md:p-8" aria-labelledby="qr-check-title">
      <div className="flex items-center gap-3">
        <QrCode className="h-6 w-6 text-[#004AC6]" aria-hidden="true" />
        <h2 id="qr-check-title" className="text-xl font-bold text-slate-900">Kiểm tra mã QR trước khi mở</h2>
      </div>
      <p className="mt-2 text-sm text-slate-600">Chọn ảnh hoặc ảnh chụp màn hình có QR. Ảnh được giải mã trên thiết bị, không tải lên máy chủ và không lưu vào lịch sử.</p>
      <label htmlFor="qr-image" className="mt-5 flex cursor-pointer items-center gap-2 text-sm font-semibold text-[#004AC6]">
        <Upload className="h-4 w-4" aria-hidden="true" /> Chọn ảnh QR
      </label>
      <input id="qr-image" type="file" accept="image/png,image/jpeg,image/webp" onChange={handleImage} disabled={reading} className="mt-2 block w-full text-sm text-slate-700" />
      <p className="mt-1 text-xs text-slate-500">PNG, JPG hoặc WebP; tối đa 5 MB. Chỉ đọc một mã mỗi lần; nếu ảnh có nhiều QR, hãy cắt riêng mã cần kiểm tra. Không tự mở đường dẫn trong mã.</p>

      {reading && <p role="status" className="mt-4 text-sm text-slate-600">Đang đọc ảnh QR…</p>}
      {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}

      {content && (
        <div className="mt-5 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-bold text-slate-900">Nội dung được giải mã</p>
          {vietQr && (
            <div className="space-y-1 rounded-lg border border-blue-100 bg-white p-3 text-sm text-slate-800">
              <p className="font-semibold">QR chuyển khoản VietQR</p>
              <p>Ngân hàng: <strong>{bankNameForBin(vietQr.bankBin) ?? 'Chưa có tên trong danh sách'}</strong> (BIN {vietQr.bankBin})</p>
              <p>Số tài khoản trong mã: <strong className="break-all">{vietQr.account}</strong></p>
              <p>Tên trong mã QR: <strong>{vietQr.nameInQr ?? 'Mã này không chứa tên người nhận'}</strong></p>
              <p>Số tiền: <strong>{vietQr.amount ? `${vietQr.amount} ${vietQr.currency}` : 'Không ghi trong mã'}</strong></p>
              <p>Loại dịch vụ: {vietQr.service || 'Không ghi trong mã'}</p>
              {!vietQr.crcValid && <p className="font-semibold text-red-700">Dữ liệu QR có lỗi kiểm tra toàn vẹn. Không dùng để chuyển tiền.</p>}
              <p className="text-amber-900">Tên ngân hàng được suy ra từ BIN; tên trong QR, nếu có, do bên tạo mã khai báo. Cả hai không xác minh chủ tài khoản. Hãy kiểm tra tên người nhận trong ứng dụng ngân hàng trước khi xác nhận.</p>
            </div>
          )}
          <details className="text-sm text-slate-700"><summary className="cursor-pointer">Xem nội dung gốc</summary><pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-all font-sans text-sm text-slate-800">{content}</pre></details>
          {url && displayUrl ? (
            <>
              <p className="break-all text-sm text-slate-700">Đường dẫn trong QR: <strong>{content.trim()}</strong></p>
              <p className="text-sm text-slate-700">Tên miền: <strong>{displayUrl.hostname}</strong></p>
              {containsPrivateUrlParts && <p className="text-xs text-amber-800">Phần sau dấu ? hoặc # không được gửi đi để tránh lộ mã truy cập. Việc bỏ phần này có thể làm sót một số cảnh báo.</p>}
              <button type="button" onClick={() => void checkUrl(url)} disabled={checking} className="rounded-lg bg-[#004AC6] px-4 py-2 text-sm font-bold text-white disabled:opacity-60">
                {checking ? 'Đang kiểm tra…' : 'Kiểm tra liên kết bằng Google và CyberAware'}
              </button>
            </>
          ) : !vietQr ? (
            <p className="text-sm text-amber-900">QR này không chứa URL HTTP/HTTPS có thể tra cứu. Hãy đối chiếu nội dung với nguồn chính thức; CyberAware không xác minh chủ tài khoản ngân hàng hoặc người nhận tiền.</p>
          ) : null}
          <button type="button" onClick={clear} className="block text-sm font-semibold text-slate-600 underline">Xóa nội dung QR</button>
        </div>
      )}

      {reputation && (
        <div className={`mt-5 space-y-3 rounded-xl border p-4 ${dangerous ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'}`} aria-live="polite">
          <h3 className={`font-bold ${dangerous ? 'text-red-900' : 'text-amber-950'}`}>
            {dangerous ? 'Cảnh báo nguy hiểm' : reputation.overall.level === 'CANH_GIAC' ? 'Cần cảnh giác' : 'Chưa xác minh an toàn'}
          </h3>
          <p className="text-sm text-slate-800">
            {reputation.google.status === 'matched'
              ? `Google Safe Browsing ghi nhận mối đe dọa: ${reputation.google.threatTypes.join(', ')}.`
              : reputation.google.status === 'not_listed'
                ? 'Google chưa ghi nhận liên kết này trong danh sách nguy hiểm; đây không phải xác nhận an toàn.'
                : 'Chưa lấy được kết quả từ Google; không thể kết luận an toàn.'}
          </p>
          <p className="break-all text-xs text-slate-700">Địa chỉ đã đối chiếu: {reputation.url}</p>
          {reputation.google.status === 'matched' && <p className="text-xs text-slate-700">Advisory provided by Google. <a className="underline" href="https://safebrowsing.google.com/" target="_blank" rel="noreferrer">Tìm hiểu về Safe Browsing</a></p>}
          <p className="text-sm text-slate-800">Quy tắc CyberAware: {reputation.cyberAware.title} ({reputation.cyberAware.riskScore}/100). Điểm thấp không phủ định cảnh báo Google.</p>
          {reputation.cyberAware.flags.length > 0 && <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">{reputation.cyberAware.flags.slice(0, 3).map(flag => <li key={flag}>{flag}</li>)}</ul>}
          <p className="text-xs text-slate-600">Kết quả có thể cảnh báo nhầm hoặc bỏ sót. Tự xác minh bằng kênh chính thức trước khi nhập thông tin hoặc chuyển tiền.</p>
        </div>
      )}
    </section>
  );
}
