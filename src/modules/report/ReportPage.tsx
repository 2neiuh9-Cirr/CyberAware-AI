import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock, ExternalLink, PlusCircle, RefreshCw, Search, ThumbsUp, X } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { api, json } from '../../api';
import type { ScamReport } from '../../types';

const reportTypes = [
  { id: '', label: 'Tất cả' }, { id: 'url', label: 'Link / Website' },
  { id: 'phone', label: 'Số điện thoại' }, { id: 'bank', label: 'Số tài khoản' },
  { id: 'sms', label: 'Tin nhắn' },
];
const typeLabel: Record<string, string> = { url: 'Website', phone: 'Điện thoại', bank: 'Tài khoản', sms: 'Tin nhắn' };
const statusLabel: Record<string, string> = { approved: 'Quản trị viên đã duyệt', unverified: 'Chưa xác minh', pending: 'Chờ duyệt', rejected: 'Đã từ chối' };

export const ReportPage: React.FC = () => {
  const { currentUser, voteReport, setReportModalOpen, refreshOverview } = useAppStore();
  const [reports, setReports] = useState<ScamReport[]>([]);
  const [scope, setScope] = useState('community');
  const [type, setType] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [detail, setDetail] = useState<ScamReport | null>(null);
  const [moderationReason, setModerationReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [votingId, setVotingId] = useState<string | null>(null);

  useEffect(() => {
    const refresh = () => setRevision(r => r + 1);
    window.addEventListener('cyberaware-reports-changed', refresh);
    return () => window.removeEventListener('cyberaware-reports-changed', refresh);
  }, []);
  useEffect(() => { setScope('community'); setPage(1); setReports([]); setDetail(null); }, [currentUser?.id]);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(''); setReports([]);
    const timer = setTimeout(() => {
      const params = new URLSearchParams({ page: String(page), pageSize: '10', q });
      if (type) params.set('type', type);
      if (scope === 'mine') params.set('mine', 'true');
      if (scope === 'pending') params.set('status', 'pending');
      if (scope === 'unverified') params.set('status', 'unverified');
      api<{ items: ScamReport[]; total: number }>(`/reports?${params}`, { signal: controller.signal })
        .then(data => { setReports(data.items); setTotal(data.total); })
        .catch(e => { if (!controller.signal.aborted) setError((e as Error).message); })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 200);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [scope, type, q, page, revision, currentUser?.id]);

  const open = async (id: string) => {
    setError('');
    try { setDetail(await api<ScamReport>(`/reports/${id}`)); setModerationReason(''); }
    catch (e) { setError((e as Error).message); }
  };
  const moderate = async (status: string) => {
    if (!detail) return;
    setSaving(true); setError('');
    try {
      const data = await api<{ report: ScamReport }>(`/admin/reports/${detail.id}/status`, json('PATCH', { status, reason: moderationReason }));
      setDetail(data.report); setRevision(r => r + 1); await refreshOverview();
    } catch (e) { setError((e as Error).message); } finally { setSaving(false); }
  };
  const toggleVote = async (id: string) => {
    setVotingId(id);
    try { await voteReport(id); } finally { setVotingId(null); }
  };

  return <div className="w-full max-w-[1280px] mx-auto px-4 md:px-12 py-8 md:py-12">
    <header className="mb-8 flex flex-col gap-6 border-b border-slate-200 pb-8 md:flex-row md:items-center md:justify-between">
      <div>
        <span className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700"><AlertTriangle className="h-4 w-4" /> MẠNG LƯỚI BÁO CÁO CỘNG ĐỒNG</span>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">Báo cáo Cảnh báo từ cộng đồng</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600 md:text-base">Báo cáo người dùng gửi sẽ qua kiểm duyệt trước khi công khai. Bạn có thể xem chi tiết và bình chọn các báo cáo đã duyệt.</p>
      </div>
      <button type="button" onClick={() => setReportModalOpen(true)} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-red-600/20 transition-colors hover:bg-red-700"><PlusCircle className="h-4 w-4" /> Gửi báo cáo mới</button>
    </header>

    <div className="mb-5 flex flex-wrap items-center gap-2" role="group" aria-label="Phạm vi báo cáo">
      {[{ id: 'community', label: 'Tất cả công khai' }, { id: 'unverified', label: 'Chưa xác minh' }, ...(currentUser ? [{ id: 'mine', label: 'Báo cáo của tôi' }] : []), ...(currentUser?.role === 'admin' ? [{ id: 'pending', label: 'Chờ kiểm duyệt' }] : [])].map(item =>
        <button key={item.id} type="button" onClick={() => { setScope(item.id); setPage(1); }} aria-pressed={scope === item.id} className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${scope === item.id ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}>{item.label}</button>)}
    </div>
    <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Loại báo cáo">{reportTypes.map(item =>
        <button key={item.id} type="button" onClick={() => { setType(item.id); setPage(1); }} aria-pressed={type === item.id} className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${type === item.id ? 'bg-[#004AC6] text-white shadow-sm' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}>{item.label}</button>)}</div>
      <div className="flex min-w-0 items-center gap-2"><div className="relative min-w-0 flex-1 lg:w-72"><Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input aria-label="Tìm báo cáo" value={q} onChange={e => { setQ(e.target.value); setPage(1); }} maxLength={200} placeholder="Tìm tên miền, số điện thoại, nội dung…" className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-[#004AC6]" /></div><button type="button" onClick={() => setRevision(r => r + 1)} aria-label="Tải lại báo cáo" title="Tải lại" className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 hover:bg-slate-50"><RefreshCw className="h-4 w-4" /></button></div>
    </div>

    {error && <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    {loading ? <p role="status" className="rounded-2xl border border-slate-200 bg-white p-8 text-slate-600">Đang tải báo cáo…</p> : reports.length === 0 ? <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-600"><Search className="mx-auto mb-3 h-7 w-7 text-slate-400" /><p className="font-semibold">Chưa có báo cáo phù hợp.</p><p className="mt-1 text-sm">Thử từ khóa hoặc bộ lọc khác.</p></div> :
      <div className="flex flex-col gap-4">{reports.map(report => <article key={report.id} className="flex flex-col justify-between gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md md:flex-row md:items-center md:p-6">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-red-100 px-2.5 py-0.5 text-xs font-bold uppercase text-red-800">{typeLabel[report.type] || report.type}</span>
            <span className="rounded-md bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">{report.category}</span>
            <span className="inline-flex items-center gap-1 text-xs text-slate-500"><Clock className="h-3 w-3" /> {new Date(report.reportedAt).toLocaleString('vi-VN')}</span>
            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${report.status === 'approved' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : report.status === 'rejected' ? 'border-red-200 bg-red-50 text-red-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>{report.status === 'approved' && <CheckCircle2 className="h-3 w-3" />}{statusLabel[report.status || 'pending']}</span>
          </div>
          <h2 className="mt-3 break-all text-base font-bold text-red-700 md:text-lg">{report.target}</h2>
          <p className="mt-2 break-words text-sm leading-relaxed text-slate-600">{report.description}</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2 md:justify-end">
          <button type="button" onClick={() => void open(report.id)} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">Xem chi tiết <ExternalLink className="h-3.5 w-3.5" /></button>
          {report.status === 'approved' && <button type="button" disabled={!currentUser || votingId === report.id} aria-pressed={!!report.votedByMe} onClick={() => void toggleVote(report.id)} title={!currentUser ? 'Đăng nhập để bình chọn' : report.votedByMe ? 'Nhấn để bỏ bình chọn' : 'Nhấn để bình chọn'} className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2.5 text-xs font-semibold hover:bg-blue-50 hover:text-[#004AC6] disabled:opacity-50 ${report.votedByMe ? 'border-blue-200 bg-blue-50 text-[#004AC6]' : 'border-slate-200 bg-slate-100 text-slate-700'}`}><ThumbsUp className="h-3.5 w-3.5" /> {report.votedByMe ? 'Bỏ bình chọn' : 'Bình chọn'} ({report.votes})</button>}
        </div>
      </article>)}</div>}
    <nav aria-label="Phân trang báo cáo" className="my-7 flex items-center justify-center gap-4 text-sm text-slate-600"><button type="button" disabled={page === 1 || loading} onClick={() => setPage(p => p - 1)} className="rounded-lg border border-slate-200 bg-white px-4 py-2 font-semibold disabled:opacity-40">← Trước</button><span>Trang {page} · {total} báo cáo</span><button type="button" disabled={page * 10 >= total || loading} onClick={() => setPage(p => p + 1)} className="rounded-lg border border-slate-200 bg-white px-4 py-2 font-semibold disabled:opacity-40">Sau →</button></nav>

    {detail && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><section role="dialog" aria-modal="true" aria-label="Chi tiết báo cáo" className="max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
      <div className="flex items-start justify-between gap-4"><div><span className="text-xs font-semibold text-red-700">{typeLabel[detail.type] || detail.type} · {detail.category}</span><h2 className="mt-2 break-all text-lg font-bold text-slate-900">{detail.target}</h2></div><button type="button" onClick={() => setDetail(null)} aria-label="Đóng chi tiết" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button></div>
      <p className="my-5 break-words text-sm leading-relaxed text-slate-700">{detail.description}</p><p className="text-sm font-semibold text-slate-700">Trạng thái: {statusLabel[detail.status || 'pending']}</p>
      {currentUser?.role === 'admin' && <div className="mt-6 border-t border-slate-200 pt-5"><label className="block text-sm font-semibold text-slate-700">Lý do kiểm duyệt<textarea maxLength={1000} value={moderationReason} onChange={e => setModerationReason(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 p-3 font-normal outline-none focus:ring-2 focus:ring-[#004AC6]" /></label><div className="mt-3 flex flex-wrap gap-2">{[['approved','Duyệt'],['rejected','Từ chối'],['pending','Chuyển chờ duyệt']].map(([status,label]) => <button key={status} type="button" disabled={saving || moderationReason.trim().length < 3} onClick={() => void moderate(status)} className="rounded-lg bg-[#004AC6] px-3 py-2 text-sm font-semibold text-white disabled:opacity-40">{label}</button>)}</div></div>}
      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
    </section></div>}
  </div>;
};
