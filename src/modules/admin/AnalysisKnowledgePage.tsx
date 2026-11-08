import React, { useEffect, useState } from 'react';
import { api, json } from '../../api';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { notify } from '../../components/common/toast';

type Rule = { id: string; type: string; title: string; terms: string[]; weight: number; enabled: boolean | number };
type Intel = { id: string; title: string; category: string; summary: string; sourceName: string; sourceUrl: string; sourceDate: string; terms: string[]; status: string };
const PAGE_SIZE = 10;

function Pagination({ page, total, onPageChange, label }: { page: number; total: number; onPageChange: (page: number) => void; label: string }) {
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  return <nav aria-label={`Phân trang ${label}`} className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-white px-5 py-3 text-sm">
    <span className="text-slate-500">{total ? `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} / ${total}` : '0 mục'}</span>
    <div className="flex items-center gap-2">
      <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-40">Trước</button>
      <span aria-live="polite" className="min-w-20 text-center font-semibold text-slate-700">Trang {page}/{pageCount}</span>
      <button type="button" disabled={page >= pageCount} onClick={() => onPageChange(page + 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-40">Sau</button>
    </div>
  </nav>;
}

export const AnalysisKnowledgePage: React.FC = () => {
  const [rules, setRules] = useState<Rule[]>([]);
  const [intel, setIntel] = useState<Intel[]>([]);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const showSaved = (message: string) => { setSaved(message); notify(message, 'success'); };
  const [busy, setBusy] = useState(false);
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [showIntelForm, setShowIntelForm] = useState(false);
  const [selectedRuleIds, setSelectedRuleIds] = useState<string[]>([]);
  const [selectedIntelIds, setSelectedIntelIds] = useState<string[]>([]);
  const [rulePage, setRulePage] = useState(1);
  const [intelPage, setIntelPage] = useState(1);
  const visibleRules = rules.slice((rulePage - 1) * PAGE_SIZE, rulePage * PAGE_SIZE);
  const visibleIntel = intel.slice((intelPage - 1) * PAGE_SIZE, intelPage * PAGE_SIZE);
  useEffect(() => { setRulePage(page => Math.min(page, Math.max(1, Math.ceil(rules.length / PAGE_SIZE)))); }, [rules.length]);
  useEffect(() => { setIntelPage(page => Math.min(page, Math.max(1, Math.ceil(intel.length / PAGE_SIZE)))); }, [intel.length]);
  const [ruleForm, setRuleForm] = useState({ title: '', type: 'sms', terms: '', weight: '15' });
  const [intelForm, setIntelForm] = useState({ title: '', category: '', summary: '', sourceName: '', sourceUrl: '', sourceDate: new Date().toISOString().slice(0, 10), terms: '', indicatorType: '', indicatorValue: '' });
  const load = async () => {
    try {
      const [r, i] = await Promise.all([api<{items: Rule[]}>('/admin/analysis/rules'), api<{items: Intel[]}>('/admin/analysis/intel')]);
      setRules(r.items); setIntel(i.items); setError('');
    } catch (cause) { setError((cause as Error).message); }
  };
  useEffect(() => { void load(); }, []);
  const toggleRule = async (rule: Rule) => {
    try { await api(`/admin/analysis/rules/${encodeURIComponent(rule.id)}`, json('PATCH', { enabled: !rule.enabled })); await load(); notify('Đã cập nhật quy tắc.', 'success'); }
    catch (cause) { setError((cause as Error).message); }
  };
  const toggleIntel = async (item: Intel) => {
    try { await api(`/admin/analysis/intel/${encodeURIComponent(item.id)}/status`, json('PATCH', { status: item.status === 'reviewed' ? 'inactive' : 'reviewed' })); await load(); notify('Đã cập nhật cảnh báo.', 'success'); }
    catch (cause) { setError((cause as Error).message); }
  };
  const updateSelectedRules = async (enabled: boolean) => {
    setBusy(true); setError('');
    try {
      await Promise.all(selectedRuleIds.map(id => api(`/admin/analysis/rules/${encodeURIComponent(id)}`, json('PATCH', { enabled }))));
      setSelectedRuleIds([]); showSaved(enabled ? 'Đã bật các quy tắc đã chọn.' : 'Đã tắt các quy tắc đã chọn.'); await load();
    } catch (cause) { setError((cause as Error).message); } finally { setBusy(false); }
  };
  const updateSelectedIntel = async (reviewed: boolean) => {
    setBusy(true); setError('');
    try {
      await Promise.all(selectedIntelIds.map(id => api(`/admin/analysis/intel/${encodeURIComponent(id)}/status`, json('PATCH', { status: reviewed ? 'reviewed' : 'inactive' }))));
      setSelectedIntelIds([]); showSaved(reviewed ? 'Đã hiện các cảnh báo đã chọn.' : 'Đã ẩn các cảnh báo đã chọn.'); await load();
    } catch (cause) { setError((cause as Error).message); } finally { setBusy(false); }
  };
  const addRule = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await api('/admin/analysis/rules', json('POST', { title: ruleForm.title, type: ruleForm.type, terms: ruleForm.terms.split('\n').map(x => x.trim()).filter(Boolean), weight: Number(ruleForm.weight) }));
      setRuleForm({ ...ruleForm, title: '', terms: '' }); setShowRuleForm(false); showSaved('Đã thêm quy tắc.'); await load();
    } catch (cause) { setError((cause as Error).message); }
  };
  const addIntel = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const indicators = intelForm.indicatorType && intelForm.indicatorValue.trim() ? [{ type: intelForm.indicatorType, value: intelForm.indicatorValue.trim() }] : [];
      await api('/admin/analysis/intel', json('POST', { ...intelForm, terms: intelForm.terms.split('\n').map(x => x.trim()).filter(Boolean), indicators }));
      setIntelForm({ ...intelForm, title: '', category: '', summary: '', sourceName: '', sourceUrl: '', terms: '', indicatorValue: '' }); setShowIntelForm(false); showSaved('Đã lưu cảnh báo có nguồn.'); await load();
    } catch (cause) { setError((cause as Error).message); }
  };
  const field = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm';
  const modalField = 'mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200';
  return <AdminLayout>
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 py-8 sm:px-6 lg:px-10">
      <header className="flex flex-col justify-between gap-5 border-b border-slate-200 pb-6 lg:flex-row lg:items-end">
        <div><p className="text-xs font-semibold uppercase tracking-wider text-blue-700">Quản trị dữ liệu đánh giá</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Quản lý quy tắc &amp; cảnh báo</h1><p className="mt-2 max-w-3xl text-sm text-slate-600">Quản lý quy tắc nhận diện, mẫu thủ đoạn và cảnh báo công khai có nguồn.</p></div>
        <div className="flex flex-wrap gap-2"><button type="button" onClick={() => { setError(''); setShowRuleForm(true); }} className="inline-flex items-center gap-2 rounded-lg bg-[#004AC6] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"><span className="material-symbols-outlined text-lg">add</span>Thêm quy tắc từ khóa</button><button type="button" onClick={() => { setError(''); setShowIntelForm(true); }} className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-[#004AC6] hover:bg-blue-100"><span className="material-symbols-outlined text-lg">add_link</span>Thêm cảnh báo có nguồn</button></div>
      </header>
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}{saved && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{saved}</p>}
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="flex h-[800px] min-w-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="border-b border-slate-100 p-5"><div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-bold text-slate-900">Quy tắc đang lưu</h2><p className="mt-1 text-xs text-slate-500">{rules.length} quy tắc · các thay đổi áp dụng cho lượt phân tích tiếp theo</p></div><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">{rules.length}</span></div></div>
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 bg-slate-50 px-5 py-3"><label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" className="accent-[#004AC6]" checked={visibleRules.length > 0 && visibleRules.every(x => selectedRuleIds.includes(x.id))} onChange={e => setSelectedRuleIds(current => e.target.checked ? [...new Set([...current, ...visibleRules.map(x => x.id)])] : current.filter(id => !visibleRules.some(x => x.id === id)))}/>Chọn trang này</label>{selectedRuleIds.length > 0 && <><span className="text-xs text-slate-500">Đã chọn {selectedRuleIds.length}</span><button disabled={busy} onClick={() => void updateSelectedRules(true)} className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-50">Bật đã chọn</button><button disabled={busy} onClick={() => void updateSelectedRules(false)} className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-50">Tắt đã chọn</button></>}</div>
          <div className="min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto">{visibleRules.map(rule => <div key={rule.id} className="flex items-start gap-3 px-5 py-4 hover:bg-slate-50"><input aria-label={`Chọn quy tắc ${rule.title}`} type="checkbox" className="mt-1 accent-[#004AC6]" checked={selectedRuleIds.includes(rule.id)} onChange={e => setSelectedRuleIds(current => e.target.checked ? [...current, rule.id] : current.filter(id => id !== rule.id))}/><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold text-slate-900">{rule.title}</h3><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">{rule.type}</span><span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${rule.enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{rule.enabled ? 'Đang bật' : 'Đang tắt'}</span></div><p className="mt-1 text-xs text-slate-500">Trọng số +{rule.weight} · {rule.terms.slice(0, 6).join(' · ')}{rule.terms.length > 6 ? ' …' : ''}</p></div><button type="button" disabled={busy} onClick={() => void toggleRule(rule)} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50">{rule.enabled ? 'Tắt' : 'Bật'}</button></div>)}{!rules.length && <p className="p-6 text-center text-sm text-slate-500">Chưa có quy tắc.</p>}</div>
          <Pagination page={rulePage} total={rules.length} onPageChange={setRulePage} label="quy tắc" />
        </section>
        <section className="flex h-[800px] min-w-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="border-b border-slate-100 p-5"><div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-bold text-slate-900">Cảnh báo công khai</h2><p className="mt-1 text-xs text-slate-500">Thông tin có nguồn, lưu để tham khảo thủ đoạn và chỉ dấu cụ thể</p></div><span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">{intel.length}</span></div></div>
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 bg-slate-50 px-5 py-3"><label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" className="accent-[#004AC6]" checked={visibleIntel.length > 0 && visibleIntel.every(x => selectedIntelIds.includes(x.id))} onChange={e => setSelectedIntelIds(current => e.target.checked ? [...new Set([...current, ...visibleIntel.map(x => x.id)])] : current.filter(id => !visibleIntel.some(x => x.id === id)))}/>Chọn trang này</label>{selectedIntelIds.length > 0 && <><span className="text-xs text-slate-500">Đã chọn {selectedIntelIds.length}</span><button disabled={busy} onClick={() => void updateSelectedIntel(true)} className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-50">Hiện đã chọn</button><button disabled={busy} onClick={() => void updateSelectedIntel(false)} className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-50">Ẩn đã chọn</button></>}</div>
          <div className="min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto">{visibleIntel.map(item => <div key={item.id} className="flex items-start gap-3 px-5 py-4 hover:bg-slate-50"><input aria-label={`Chọn cảnh báo ${item.title}`} type="checkbox" className="mt-1 accent-[#004AC6]" checked={selectedIntelIds.includes(item.id)} onChange={e => setSelectedIntelIds(current => e.target.checked ? [...current, item.id] : current.filter(id => id !== item.id))}/><div className="min-w-0 flex-1"><a className="text-sm font-semibold text-blue-800 hover:underline" href={item.sourceUrl} target="_blank" rel="noreferrer">{item.title}</a><p className="mt-1 text-xs text-slate-500">{item.category} · {item.sourceName} · {item.sourceDate}</p><p className="mt-1 text-xs text-slate-500">{item.terms.slice(0, 5).join(' · ') || 'Không có từ khóa đối chiếu'}</p></div><div className="flex flex-col items-end gap-2"><span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${item.status === 'reviewed' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{item.status === 'reviewed' ? 'Đang hiện' : 'Đang ẩn'}</span><button type="button" disabled={busy} onClick={() => void toggleIntel(item)} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50">{item.status === 'reviewed' ? 'Ẩn' : 'Hiện'}</button></div></div>)}{!intel.length && <p className="p-6 text-center text-sm text-slate-500">Chưa có cảnh báo công khai.</p>}</div>
          <Pagination page={intelPage} total={intel.length} onPageChange={setIntelPage} label="cảnh báo" />
        </section>
      </div>
    </div>
    {showRuleForm && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs" onMouseDown={event => { if (event.target === event.currentTarget && !busy) setShowRuleForm(false); }}><form onSubmit={addRule} className="max-h-[90vh] w-full max-w-xl space-y-4 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"><div><h2 className="text-lg font-bold text-slate-900">Thêm quy tắc từ khóa</h2><p className="mt-1 text-sm text-slate-500">Các cụm từ được dùng trong bước chấm điểm rủi ro.</p></div><label className="block text-sm font-semibold text-slate-700">Tên quy tắc<input required minLength={3} maxLength={160} className={modalField} value={ruleForm.title} onChange={e => setRuleForm({...ruleForm,title:e.target.value})}/></label><div className="grid gap-3 sm:grid-cols-2"><label className="block text-sm font-semibold text-slate-700">Loại nội dung<select className={modalField} value={ruleForm.type} onChange={e => setRuleForm({...ruleForm,type:e.target.value})}><option value="sms">Tin nhắn</option><option value="url">URL</option><option value="all">Tất cả</option></select></label><label className="block text-sm font-semibold text-slate-700">Trọng số<input className={modalField} type="number" min="1" max="60" value={ruleForm.weight} onChange={e => setRuleForm({...ruleForm,weight:e.target.value})}/></label></div><label className="block text-sm font-semibold text-slate-700">Cụm từ nhận diện<textarea required className={modalField} rows={5} placeholder="Mỗi cụm từ một dòng" value={ruleForm.terms} onChange={e => setRuleForm({...ruleForm,terms:e.target.value})}/></label>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}<div className="flex justify-end gap-3"><button type="button" onClick={() => setShowRuleForm(false)} className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">Hủy</button><button type="submit" disabled={busy} className="rounded-lg bg-[#004AC6] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Lưu quy tắc</button></div></form></div>}
    {showIntelForm && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs" onMouseDown={event => { if (event.target === event.currentTarget && !busy) setShowIntelForm(false); }}><form onSubmit={addIntel} className="max-h-[90vh] w-full max-w-2xl space-y-4 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"><div><h2 className="text-lg font-bold text-slate-900">Thêm cảnh báo có nguồn</h2><p className="mt-1 text-sm text-slate-500">Lưu thủ đoạn cùng nguồn công khai để quản trị viên kiểm tra lại.</p></div><label className="block text-sm font-semibold text-slate-700">Tiêu đề<input required className={modalField} value={intelForm.title} onChange={e => setIntelForm({...intelForm,title:e.target.value})}/></label><div className="grid gap-3 sm:grid-cols-2"><label className="block text-sm font-semibold text-slate-700">Danh mục<input required className={modalField} value={intelForm.category} onChange={e => setIntelForm({...intelForm,category:e.target.value})}/></label><label className="block text-sm font-semibold text-slate-700">Ngày cảnh báo<input required type="date" className={modalField} value={intelForm.sourceDate} onChange={e => setIntelForm({...intelForm,sourceDate:e.target.value})}/></label></div><label className="block text-sm font-semibold text-slate-700">Tóm tắt thủ đoạn<textarea required rows={3} className={modalField} value={intelForm.summary} onChange={e => setIntelForm({...intelForm,summary:e.target.value})}/></label><div className="grid gap-3 sm:grid-cols-2"><label className="block text-sm font-semibold text-slate-700">Tên nguồn<input required className={modalField} value={intelForm.sourceName} onChange={e => setIntelForm({...intelForm,sourceName:e.target.value})}/></label><label className="block text-sm font-semibold text-slate-700">URL nguồn HTTPS<input required type="url" className={modalField} value={intelForm.sourceUrl} onChange={e => setIntelForm({...intelForm,sourceUrl:e.target.value})}/></label></div><label className="block text-sm font-semibold text-slate-700">Từ khóa thủ đoạn<textarea rows={3} className={modalField} placeholder="Mỗi cụm từ một dòng" value={intelForm.terms} onChange={e => setIntelForm({...intelForm,terms:e.target.value})}/></label><div className="grid gap-3 sm:grid-cols-2"><label className="block text-sm font-semibold text-slate-700">Loại chỉ dấu chính xác<select className={modalField} value={intelForm.indicatorType} onChange={e => setIntelForm({...intelForm,indicatorType:e.target.value})}><option value="">Không có</option><option value="url">Tên miền/URL</option><option value="phone">Số điện thoại</option><option value="bank">Tài khoản ngân hàng</option></select></label><label className="block text-sm font-semibold text-slate-700">Giá trị chỉ dấu<input className={modalField} placeholder="Chỉ nhập nếu nguồn nêu chính xác" value={intelForm.indicatorValue} onChange={e => setIntelForm({...intelForm,indicatorValue:e.target.value})}/></label></div><p className="text-xs text-slate-500">Chỉ dấu cụ thể chỉ được đối chiếu chính xác khi có trong nguồn được lưu kèm.</p>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}<div className="flex justify-end gap-3"><button type="button" onClick={() => setShowIntelForm(false)} className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">Hủy</button><button type="submit" disabled={busy} className="rounded-lg bg-[#004AC6] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Lưu cảnh báo</button></div></form></div>}
  </AdminLayout>;
};
