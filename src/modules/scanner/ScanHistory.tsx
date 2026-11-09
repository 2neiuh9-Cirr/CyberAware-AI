import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, CreditCard, Globe2, History, MessageSquare, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import { useAppStore } from '../../store/useAppStore';
import type { ScanResult } from '../../types';

type HistoryPage = { items: ScanResult[]; nextCursor: string | null };
const pageSize = 10;
const scanTypeMeta = {
  url: { label: 'Website / URL', icon: Globe2 },
  sms: { label: 'Tin nhắn', icon: MessageSquare },
  phone: { label: 'Số điện thoại', icon: Phone },
  bank: { label: 'Tài khoản', icon: CreditCard },
};

export const ScanHistory: React.FC<{ onSelect: (scan: ScanResult) => void }> = ({ onSelect }) => {
  const { currentUser, isScanning, personalStats } = useAppStore();
  const [pages, setPages] = useState<HistoryPage[]>([]);
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const requestVersion = useRef(0);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const version = ++requestVersion.current;
    setPages([]);
    setPage(1);
    setError('');
    if (!currentUser) { setBusy(false); return; }
    const controller = new AbortController();
    setBusy(true);
    api<HistoryPage>(`/scans?limit=${pageSize}`, { signal: controller.signal })
      .then(data => { if (version === requestVersion.current) setPages([data]); })
      .catch(cause => { if (!controller.signal.aborted && version === requestVersion.current) setError((cause as Error).message); })
      .finally(() => { if (version === requestVersion.current) setBusy(false); });
    return () => { controller.abort(); requestVersion.current++; };
  }, [currentUser?.id, personalStats?.scanCount]);

  useEffect(() => { if (listRef.current) listRef.current.scrollTop = 0; }, [page]);

  const currentPage = pages[page - 1];
  const totalPages = Math.max(1, Math.ceil(Number(personalStats?.scanCount || 0) / pageSize), page + (currentPage?.nextCursor ? 1 : 0));
  const next = async () => {
    if (busy || !currentPage?.nextCursor) return;
    if (pages[page]) { setPage(page + 1); return; }
    const version = requestVersion.current;
    setBusy(true); setError('');
    try {
      const data = await api<HistoryPage>(`/scans?limit=${pageSize}&cursor=${encodeURIComponent(currentPage.nextCursor)}`);
      if (version !== requestVersion.current) return;
      setPages(previous => [...previous, data]);
      setPage(previous => previous + 1);
    } catch (cause) {
      if (version === requestVersion.current) setError((cause as Error).message);
    } finally {
      if (version === requestVersion.current) setBusy(false);
    }
  };

  return <section className="relative mx-auto mt-8 w-full max-w-[1024px] overflow-hidden rounded-[2rem] border border-blue-100 bg-white/95 p-5 shadow-[0_24px_70px_-38px_rgba(0,74,198,0.24)] ring-1 ring-white md:p-8">
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-400 via-[#004AC6] to-indigo-500" />
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-[#004AC6] ring-1 ring-blue-100"><History className="h-5 w-5" aria-hidden="true" /></div>
        <div>
          <h2 className="text-lg font-extrabold tracking-tight text-slate-900 md:text-xl">Lịch sử quét của tôi</h2>
          <p className="text-xs text-slate-500 md:text-sm">Xem lại nội dung và phân tích lại khi cần.</p>
        </div>
      </div>
      {currentUser && <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-bold text-[#004AC6]">{personalStats?.scanCount ?? 0} lượt đã lưu</span>}
    </div>
    {!currentUser ? <p className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600"><Link to="/dang-nhap" className="font-semibold text-[#004AC6] underline underline-offset-2">Đăng nhập</Link> để lưu và xem lại kết quả quét.</p> : <>
      <p className="mt-5 text-xs leading-5 text-slate-500 md:text-sm">Chọn một mục để điền vào ô kiểm tra và phân tích lại. Mỗi trang hiển thị tối đa 10 mục.</p>
      {error && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {busy && !currentPage ? <p role="status" className="mt-5 rounded-2xl bg-slate-50 p-6 text-sm text-slate-600">Đang tải lịch sử…</p> : currentPage?.items.length === 0 ? <p className="mt-5 rounded-2xl bg-slate-50 p-6 text-sm text-slate-600">Chưa có lịch sử quét.</p> : currentPage && <ul ref={listRef} aria-label={`Lịch sử quét trang ${page}`} tabIndex={0} className="mt-5 max-h-[380px] space-y-2 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50/70 p-2.5 focus:outline-none focus:ring-2 focus:ring-[#004AC6]">
        {currentPage.items.map(scan => {
          const meta = scanTypeMeta[scan.type];
          const Icon = meta.icon;
          const riskStyle = scan.riskScore >= 70 ? 'border-red-100 bg-red-50 text-red-700' : scan.riskScore >= 30 ? 'border-amber-100 bg-amber-50 text-amber-700' : 'border-slate-200 bg-slate-50 text-slate-600';
          return <li key={scan.id}>
            <button type="button" disabled={isScanning} onClick={() => onSelect(scan)} className="group flex w-full min-w-0 items-start gap-3 rounded-xl border border-slate-200/80 bg-white px-3 py-3 text-left shadow-sm transition-all hover:border-blue-200 hover:bg-blue-50/60 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004AC6] disabled:cursor-wait disabled:opacity-50 sm:items-center sm:px-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#004AC6] ring-1 ring-blue-100"><Icon className="h-4 w-4" aria-hidden="true" /></span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-medium text-slate-500"><span className="font-bold text-slate-600">{meta.label}</span><span aria-hidden="true">·</span><span>{new Date(scan.scannedAt).toLocaleString('vi-VN')}</span></span>
                <span className="mt-1 block truncate text-sm font-semibold text-slate-800 group-hover:text-[#004AC6]" title={scan.query}>{scan.query}</span>
              </span>
              <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-bold ${riskStyle}`}>{scan.riskScore}/100</span>
            </button>
          </li>;
        })}
      </ul>}
      {(currentPage || busy) && <nav aria-label="Phân trang lịch sử quét" className="mt-5 flex flex-wrap items-center justify-center gap-2 text-sm sm:gap-3">
        <button type="button" disabled={busy || page === 1} onClick={() => setPage(value => value - 1)} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 font-semibold text-slate-700 transition-colors hover:border-blue-200 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004AC6] disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft className="h-4 w-4" /> Trước</button>
        <span aria-live="polite" className="min-w-24 rounded-xl bg-blue-50 px-3 py-2 text-center font-bold text-[#004AC6] ring-1 ring-blue-100">Trang {page} / {totalPages}</span>
        <button type="button" disabled={busy || !currentPage?.nextCursor} onClick={() => void next()} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 font-semibold text-slate-700 transition-colors hover:border-blue-200 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004AC6] disabled:cursor-not-allowed disabled:opacity-40">Sau <ChevronRight className="h-4 w-4" /></button>
      </nav>}
    </>}
  </section>;
};
