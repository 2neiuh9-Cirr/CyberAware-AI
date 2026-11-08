import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Ban, CheckCircle2, Clock3, Eye, EyeOff, FileWarning, Pencil, RefreshCw, Search, ShieldCheck, Trash2, X } from 'lucide-react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { notify } from '../../components/common/toast';
import { api, json } from '../../api';
import { useAppStore } from '../../store/useAppStore';
import type { ScanType } from '../../types';
import { cachedAdminReports, invalidateAdminReports, prefetchAdminReports } from './adminReportsData';
import type { AdminReport, ReportPageData, ReportStatus } from './adminReportsData';

type Draft = Pick<AdminReport, 'type' | 'target' | 'category' | 'description'>;

const statusOptions: { value: ReportStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Tất cả' }, { value: 'pending', label: 'Chờ duyệt' },
  { value: 'approved', label: 'Đã duyệt' }, { value: 'unverified', label: 'Chưa xác minh' },
  { value: 'rejected', label: 'Đã từ chối' },
];
const typeOptions: { value: ScanType | ''; label: string }[] = [
  { value: '', label: 'Mọi loại báo cáo' }, { value: 'url', label: 'Website / URL' },
  { value: 'sms', label: 'Tin nhắn' }, { value: 'phone', label: 'Số điện thoại' },
  { value: 'bank', label: 'Tài khoản ngân hàng' },
];
const statusStyle: Record<ReportStatus, string> = {
  pending: 'border-amber-200 bg-amber-50 text-amber-700',
  approved: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  rejected: 'border-red-200 bg-red-50 text-red-700',
  unverified: 'border-blue-200 bg-blue-50 text-blue-700',
};
const fieldClass = 'mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-100';

export const AdminReportsPage: React.FC = () => {
  const userId = useAppStore(state => state.currentUser?.id ?? '');
  const [status, setStatus] = useState<ReportStatus | 'all'>('all');
  const [visibility, setVisibility] = useState<'all' | 'visible' | 'hidden'>('all');
  const [type, setType] = useState<ScanType | ''>('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [data, setData] = useState<ReportPageData | null>(() => cachedAdminReports(userId));
  const [loading, setLoading] = useState(() => !cachedAdminReports(userId));
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<AdminReport | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [nextStatus, setNextStatus] = useState<ReportStatus>('pending');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<AdminReport | null>(null);
  const refreshOverview = useAppStore(state => state.refreshOverview);
  const dirty = !!selected && !!draft && (selected.type !== draft.type || selected.target !== draft.target || selected.category !== draft.category || selected.description !== draft.description);

  useEffect(() => {
    const controller = new AbortController();
    const isDefault = page === 1 && status === 'all' && visibility === 'all' && !type && !query;
    setFetching(true); setError('');
    const fetchData = () => {
      const params = new URLSearchParams({ page: String(page), pageSize: '12', status, visibility, q: query });
      if (type) params.set('type', type);
      const request = isDefault ? prefetchAdminReports(userId, revision > 0) : api<ReportPageData>(`/admin/reports?${params}`, { signal: controller.signal });
      request
        .then(result => { if (!controller.signal.aborted) setData(result); })
        .catch(err => { if (!controller.signal.aborted) setError((err as Error).message); })
        .finally(() => { if (!controller.signal.aborted) { setLoading(false); setFetching(false); } });
    };
    const timer = query ? window.setTimeout(fetchData, 180) : undefined;
    if (!query) fetchData();
    return () => { clearTimeout(timer); controller.abort(); };
  }, [status, visibility, type, query, page, revision, userId]);

  const reload = useCallback(() => { invalidateAdminReports(); setRevision(value => value + 1); window.dispatchEvent(new Event('cyberaware-reports-changed')); void refreshOverview(); }, [refreshOverview]);
  const updateRow = useCallback((report: AdminReport) => setData(current => current ? { ...current, items: current.items.map(item => item.id === report.id ? report : item) } : current), []);
  const open = useCallback((item: AdminReport) => {
    setSelected(item); setDraft({ type: item.type, target: item.target, category: item.category, description: item.description });
    setNextStatus(item.status); setReason(item.reason || ''); setError('');
  }, []);
  const save = async () => {
    if (!selected || !draft || !dirty || busy) return;
    setBusy(true); setError('');
    try {
      const result = await api<{ report: AdminReport }>(`/admin/reports/${selected.id}`, json('PATCH', draft));
      updateRow(result.report);
      setSelected(result.report); setDraft({ type: result.report.type, target: result.report.target, category: result.report.category, description: result.report.description });
      setNextStatus(result.report.status); setReason(result.report.reason);
      reload(); notify('Đã lưu báo cáo. Nội dung thay đổi cần được duyệt lại.', 'success');
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  };
  const updateStatus = async () => {
    if (!selected || dirty || busy || reason.trim().length < 3) return;
    setBusy(true); setError('');
    try {
      await api(`/admin/reports/${selected.id}/status`, json('PATCH', { status: nextStatus, reason: reason.trim() }));
      const updated = { ...selected, status: nextStatus, reason: reason.trim() };
      updateRow(updated); setSelected(updated);
      reload(); notify('Đã cập nhật trạng thái báo cáo.', 'success');
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  };
  const setHidden = useCallback(async (item: AdminReport) => {
    if (busy) return;
    setBusy(true); setError('');
    try {
      const result = await api<{ report: AdminReport }>(`/admin/reports/${item.id}/visibility`, json('PATCH', { hidden: !item.hidden }));
      updateRow(result.report);
      if (selected?.id === item.id) setSelected(result.report);
      reload(); notify(result.report.hidden ? 'Đã ẩn báo cáo khỏi khu vực công khai.' : 'Đã bật hiển thị báo cáo.', 'success');
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }, [busy, selected?.id, reload, updateRow]);
  const remove = async () => {
    if (!pendingDelete || busy) return;
    setBusy(true); setError('');
    try {
      await api(`/admin/reports/${pendingDelete.id}`, { method: 'DELETE' });
      setData(current => current ? { ...current, items: current.items.filter(item => item.id !== pendingDelete.id), total: Math.max(0, current.total - 1) } : current);
      if (selected?.id === pendingDelete.id) { setSelected(null); setDraft(null); }
      setPendingDelete(null); reload(); notify('Đã xóa báo cáo.', 'success');
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  };

  const summary = data?.summary;
  const cards = [
    { label: 'Tổng báo cáo', value: summary?.total, icon: FileWarning, color: 'text-blue-700 bg-blue-50' },
    { label: 'Chờ kiểm duyệt', value: summary?.pending, icon: Clock3, color: 'text-amber-700 bg-amber-50' },
    { label: 'Đang công khai', value: summary?.approved, icon: ShieldCheck, color: 'text-emerald-700 bg-emerald-50' },
    { label: 'Đang ẩn', value: summary?.hidden, icon: EyeOff, color: 'text-slate-700 bg-slate-100' },
    { label: 'Đã từ chối', value: summary?.rejected, icon: Ban, color: 'text-red-700 bg-red-50' },
  ];
  const reportRows = useMemo(() => data?.items.map(item => <article key={item.id} className="grid gap-4 p-4 transition-colors duration-150 hover:bg-slate-50 sm:p-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
    <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${statusStyle[item.status]}`}>{statusOptions.find(option => option.value === item.status)?.label}</span>{item.hidden && <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700">Đã tắt hiển thị</span>}<span className="text-xs text-slate-500">{typeOptions.find(option => option.value === item.type)?.label} · {new Date(item.reportedAt).toLocaleString('vi-VN')}</span></div>
      <h2 className="mt-2 break-all text-sm font-bold text-slate-900 sm:text-base">{item.target}</h2><p className="mt-1 line-clamp-2 break-words text-sm leading-6 text-slate-600">{item.description}</p><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500"><span>Danh mục: {item.category}</span><span>Người gửi: {item.reporterName}</span><span>{item.votes} lượt bình chọn</span></div></div>
    <div className="flex flex-wrap gap-2 xl:justify-end"><button type="button" onClick={() => open(item)} className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 transition-colors hover:bg-blue-100"><Pencil className="h-3.5 w-3.5" /> Xem / sửa</button><button type="button" disabled={busy} onClick={() => void setHidden(item)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-50">{item.hidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}{item.hidden ? 'Bật lại' : 'Tắt / ẩn'}</button><button type="button" onClick={() => setPendingDelete(item)} className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 transition-colors hover:bg-red-100"><Trash2 className="h-3.5 w-3.5" /> Xóa</button></div>
  </article>), [data?.items, busy, open, setHidden]);

  return <AdminLayout>
    <div className="mx-auto w-full max-w-[1440px] space-y-7 px-4 py-8 sm:px-6 lg:px-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-blue-700"><ShieldCheck className="h-3.5 w-3.5" /> Kiểm duyệt cộng đồng</span>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900">Quản lý báo cáo lừa đảo</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Xem xét từng báo cáo, chỉnh sửa nội dung, thay đổi trạng thái và quyết định hiển thị công khai.</p>
        </div>
        <button type="button" onClick={reload} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"><RefreshCw className="h-4 w-4" /> Tải lại dữ liệu</button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {cards.map(card => <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-transform duration-200 ease-out hover:-translate-y-0.5 sm:p-5"><div className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.color}`}><card.icon className="h-5 w-5" /></div><div className="mt-4 text-2xl font-extrabold text-slate-900">{card.value ?? <span className="block h-7 w-12 animate-pulse rounded-md bg-slate-100" aria-label="Đang tải số liệu" />}</div><div className="mt-1 text-xs font-semibold text-slate-500">{card.label}</div></div>)}
      </div>

      <section className="relative min-h-[18rem] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" aria-label="Danh sách báo cáo" aria-busy={fetching}>
        <div className="border-b border-slate-200 p-4 sm:p-5">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Lọc trạng thái báo cáo">
            {statusOptions.map(item => <button key={item.value} type="button" onClick={() => { setStatus(item.value); setPage(1); }} aria-pressed={status === item.value} className={`rounded-lg px-3 py-2 text-xs font-bold transition-colors ${status === item.value ? 'bg-[#004AC6] text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>{item.label}</button>)}
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_180px]">
            <div className="relative"><Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input aria-label="Tìm báo cáo quản trị" value={query} onChange={event => { setQuery(event.target.value); setPage(1); }} maxLength={200} placeholder="Tìm nội dung, đối tượng, người gửi…" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-200" /></div>
            <select aria-label="Lọc loại báo cáo" value={type} onChange={event => { setType(event.target.value as ScanType | ''); setPage(1); }} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700">{typeOptions.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
            <select aria-label="Lọc trạng thái hiển thị" value={visibility} onChange={event => { setVisibility(event.target.value as typeof visibility); setPage(1); }} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700"><option value="all">Tất cả hiển thị</option><option value="visible">Đang bật</option><option value="hidden">Đã tắt / ẩn</option></select>
          </div>
        </div>
        {fetching && data && <div role="status" className="absolute inset-x-0 top-0 z-10 h-1 overflow-hidden bg-blue-100"><span className="sr-only">Đang cập nhật danh sách báo cáo…</span><span className="block h-full w-1/3 animate-pulse rounded-full bg-[#004AC6]" /></div>}
        {error && <p role="alert" className="m-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {loading && !data ? <p role="status" className="p-10 text-center text-sm text-slate-500">Đang tải báo cáo…</p> : !data?.items.length ? <div className="px-5 py-16 text-center"><FileWarning className="mx-auto h-9 w-9 text-slate-400" /><p className="mt-3 font-semibold text-slate-700">Không có báo cáo phù hợp</p><p className="mt-1 text-sm text-slate-500">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.</p></div> :
          <div className={`divide-y divide-slate-200 transition-opacity duration-200 ease-out ${fetching ? 'pointer-events-none opacity-70' : 'opacity-100'}`}>{reportRows}</div>}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-4 text-xs text-slate-500 sm:px-5"><span>{data?.total ?? 0} báo cáo phù hợp · Trang {page}/{Math.max(1, Math.ceil((data?.total ?? 0) / 12))}</span><div className="flex gap-2"><button type="button" disabled={page <= 1 || fetching} onClick={() => setPage(value => value - 1)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 font-semibold text-slate-700 disabled:opacity-40">Trước</button><button type="button" disabled={fetching || page * 12 >= (data?.total ?? 0)} onClick={() => setPage(value => value + 1)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 font-semibold text-slate-700 disabled:opacity-40">Sau</button></div></div>
      </section>
    </div>

    {selected && draft && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-3 animate-in fade-in duration-150 sm:p-5 motion-reduce:animate-none" onMouseDown={event => { if (event.target === event.currentTarget && !busy) { setSelected(null); setDraft(null); } }}><section role="dialog" aria-modal="true" aria-label="Chỉnh sửa báo cáo" className="max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200 ease-out motion-reduce:animate-none sm:p-7">
      <div className="flex items-start justify-between gap-3"><div><span className="text-xs font-bold uppercase tracking-widest text-blue-700">Hồ sơ báo cáo</span><h2 className="mt-1 text-xl font-extrabold text-slate-900">Xem và chỉnh sửa báo cáo</h2><p className="mt-1 text-xs text-slate-500">Người gửi: {selected.reporterName} · {selected.reporterEmail}</p></div><button type="button" onClick={() => { setSelected(null); setDraft(null); }} aria-label="Đóng chỉnh sửa báo cáo" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button></div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="text-xs font-bold text-slate-700">Loại báo cáo<select value={draft.type} onChange={event => setDraft({ ...draft, type: event.target.value as ScanType })} className={fieldClass}>{typeOptions.filter(item => item.value).map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label><label className="text-xs font-bold text-slate-700">Danh mục<input value={draft.category} maxLength={100} onChange={event => setDraft({ ...draft, category: event.target.value })} className={fieldClass} /></label></div>
      <label className="mt-4 block text-xs font-bold text-slate-700">Đối tượng được báo cáo<input value={draft.target} onChange={event => setDraft({ ...draft, target: event.target.value })} className={fieldClass} /></label>
      <label className="mt-4 block text-xs font-bold text-slate-700">Nội dung mô tả<textarea rows={5} maxLength={3000} value={draft.description} onChange={event => setDraft({ ...draft, description: event.target.value })} className={`${fieldClass} resize-y leading-6`} /></label>
      <p className="mt-2 text-xs text-amber-700">Khi sửa nội dung, báo cáo chuyển về Chờ duyệt và các lượt bình chọn cũ được xóa.</p>
      <div className="mt-4 flex flex-wrap gap-2"><button type="button" disabled={busy || !dirty} onClick={() => void save()} className="inline-flex items-center gap-2 rounded-xl bg-[#004AC6] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"><CheckCircle2 className="h-4 w-4" /> Lưu nội dung</button><button type="button" disabled={busy} onClick={() => void setHidden(selected)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm font-bold text-slate-700 disabled:opacity-50">{selected.hidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}{selected.hidden ? 'Bật hiển thị' : 'Tắt hiển thị'}</button></div>
      <div className="mt-6 border-t border-slate-200 pt-5"><h3 className="text-sm font-bold text-slate-900">Điều chỉnh trạng thái kiểm duyệt</h3><div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-xs font-bold text-slate-700">Trạng thái<select value={nextStatus} onChange={event => setNextStatus(event.target.value as ReportStatus)} className={fieldClass}>{statusOptions.filter(item => item.value !== 'all').map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label><label className="text-xs font-bold text-slate-700">Lý do kiểm duyệt<input value={reason} maxLength={1000} onChange={event => setReason(event.target.value)} placeholder="Ít nhất 3 ký tự" className={fieldClass} /></label></div>{dirty && <p className="mt-2 text-xs text-amber-700">Hãy lưu nội dung đã sửa trước khi đổi trạng thái.</p>}<button type="button" disabled={busy || dirty || reason.trim().length < 3} onClick={() => void updateStatus()} className="mt-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-bold text-blue-700 disabled:opacity-50">Cập nhật trạng thái</button></div>
      {error && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="mt-6 flex justify-end border-t border-slate-200 pt-4"><button type="button" onClick={() => setPendingDelete(selected)} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-red-700 hover:bg-red-50"><Trash2 className="h-4 w-4" /> Xóa vĩnh viễn báo cáo</button></div>
    </section></div>}
    {pendingDelete && <ConfirmDialog title="Xóa báo cáo vĩnh viễn?" description={`Báo cáo “${pendingDelete.target}” cùng lượt bình chọn và lịch sử kiểm duyệt sẽ bị xóa. Thao tác này không thể hoàn tác.`} confirmLabel="Xóa báo cáo" busy={busy} onConfirm={() => void remove()} onCancel={() => setPendingDelete(null)} />}
  </AdminLayout>;
};
