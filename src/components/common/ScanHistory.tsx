import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import { useAppStore } from '../../store/useAppStore';
import type { ScanResult } from '../../types';

type HistoryPage = { items: ScanResult[]; nextCursor: string | null };
const pageSize = 10;

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

  return <section className="mt-8 w-full max-w-4xl rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <h2 className="text-xl font-bold text-slate-900">Lịch sử quét của tôi</h2>
    {!currentUser ? <p className="mt-3 text-sm text-slate-600"><Link to="/dang-nhap" className="font-semibold text-[#004AC6] underline">Đăng nhập</Link> để lưu và xem lại kết quả quét.</p> : <>
      <p className="mt-2 text-sm text-slate-600">{personalStats?.scanCount ?? 0} lần quét đã lưu. Mỗi trang có tối đa 10 mục; cuộn trong khung để xem các mục tiếp theo. Chọn một mục để điền vào ô kiểm tra và phân tích lại.</p>
      {error && <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {busy && !currentPage ? <p role="status" className="py-5 text-sm text-slate-600">Đang tải lịch sử…</p> : currentPage?.items.length === 0 ? <p className="py-5 text-sm text-slate-600">Chưa có lịch sử quét.</p> : currentPage && <ul ref={listRef} aria-label={`Lịch sử quét trang ${page}`} tabIndex={0} className="mt-4 max-h-[320px] divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200 px-3 focus:outline-none focus:ring-2 focus:ring-[#004AC6]">
        {currentPage.items.map(scan => <li key={scan.id} className="flex min-h-16 items-center py-2"><button type="button" disabled={isScanning} onClick={() => onSelect(scan)} className="w-full min-w-0 rounded-lg px-2 py-1 text-left transition-colors hover:bg-blue-50 disabled:cursor-wait disabled:opacity-50"><span className="block text-xs text-slate-500">{new Date(scan.scannedAt).toLocaleString('vi-VN')} · {scan.type} · điểm lúc quét: {scan.riskScore}/100</span><span className="mt-1 block truncate text-sm font-medium text-[#004AC6]">{scan.query}</span></button></li>)}
      </ul>}
      {(currentPage || busy) && <nav aria-label="Phân trang lịch sử quét" className="mt-4 flex flex-wrap items-center justify-center gap-2 text-sm sm:gap-3">
        <button type="button" disabled={busy || page === 1} onClick={() => setPage(value => value - 1)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft className="h-4 w-4" /> Trước</button>
        <span aria-live="polite" className="min-w-24 rounded-lg bg-blue-50 px-3 py-2 text-center font-bold text-[#004AC6]">Trang {page} / {totalPages}</span>
        <button type="button" disabled={busy || !currentPage?.nextCursor} onClick={() => void next()} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">Sau <ChevronRight className="h-4 w-4" /></button>
      </nav>}
    </>}
  </section>;
};
