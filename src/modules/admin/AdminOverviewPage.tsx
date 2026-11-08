import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { api, json } from '../../api';
import { notify } from '../../components/common/toast';

export const AdminOverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [overview, setOverview] = useState<{ users: number; activeUsers: number; scansLast30Days: number; highRiskScansLast30Days: number; courses: number; questions: number; reportsPending: number } | null>(null);
  const [audit, setAudit] = useState<Array<{ id: string; actorName: string; action: string; targetId: string; detail: string; createdAt: string }>>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [threats, setThreats] = useState<Array<{ category: string; count: number; percent: number }>>([]);
  const [health, setHealth] = useState<{ api: string; database: string; uptimeSeconds: number; aiConfigured: boolean } | null>(null);
  const [settings, setSettings] = useState<{ configured: boolean; enabled: boolean; active: boolean; model: string } | null>(null);
  const [togglingAi, setTogglingAi] = useState(false);
  const [logs, setLogs] = useState<Array<{ id: number; method: string; path: string; status: number; durationMs: number; createdAt: string }> | null>(null);
  const [showAllAudit, setShowAllAudit] = useState(false);

  const showToast = (msg: string) => notify(msg, 'success');
  const load = async () => {
    try {
      const [numbers, events, topThreats, service, ai] = await Promise.all([
        api<typeof overview>('/admin/overview'),
        api<{ items: typeof audit; total: number }>('/admin/audit-events?pageSize=100'),
        api<{ items: typeof threats }>('/admin/threats/summary'),
        api<typeof health>('/admin/system/health'),
        api<typeof settings>('/admin/analysis/settings'),
      ]);
      setOverview(numbers); setAudit(events.items); setAuditTotal(events.total); setThreats(topThreats.items); setHealth(service); setSettings(ai); setError('');
    } catch (cause) { setError((cause as Error).message); }
  };
  useEffect(() => { void load(); }, []);
  const toggleAi = async () => {
    if (!settings || togglingAi) return;
    setTogglingAi(true); setError('');
    try { const next = await api<typeof settings>('/admin/analysis/settings', json('PATCH', { enabled: !settings.enabled })); setSettings(next); showToast(next?.enabled ? 'Đã bật phân tích AI.' : 'Đã tắt phân tích AI.'); }
    catch (cause) { setError((cause as Error).message); }
    finally { setTogglingAi(false); }
  };
  const loadLogs = async () => {
    try { const result = await api<{ items: NonNullable<typeof logs> }>('/admin/system/request-logs?pageSize=50'); setLogs(result.items); setError(''); }
    catch (cause) { setError((cause as Error).message); }
  };
  const toggleAudit = async () => {
    if (showAllAudit) { setShowAllAudit(false); return; }
    try {
      const all = [...audit];
      for (let page = 2; all.length < auditTotal; page++) {
        const next = await api<{ items: typeof audit }>(`/admin/audit-events?pageSize=100&page=${page}`);
        all.push(...next.items);
      }
      setAudit(all); setShowAllAudit(true);
    } catch (cause) { setError((cause as Error).message); }
  };

  return (
    <AdminLayout>
      <div className="relative w-full overflow-hidden">
        {/* Subtle Ambient Glow Element */}
        <div className="absolute -top-24 right-12 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 py-8 flex flex-col gap-8">
          {error && <p role="alert" className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</p>}
          
          {/* Top Action & Header Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-2">
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  {health?.api === 'ok' && health?.database === 'ok' ? 'Máy chủ và cơ sở dữ liệu đang hoạt động' : 'Đang kiểm tra tình trạng hệ thống'}
                </span>
                <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded">
                  CyberAware AI
                </span>
              </div>
              <div className="flex items-baseline gap-3 mt-1">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                  Tổng quan quản trị an ninh &amp; Kiểm duyệt mối đe dọa
                </h1>
              </div>
              <p className="text-sm text-slate-600 max-w-3xl">
                Theo dõi lưu lượng an toàn thông tin, kiểm soát nội dung đào tạo và dữ liệu tình huống mối đe dọa lừa đảo mạng quốc gia.
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <button
                onClick={() => navigate('/quan-tri-ngan-hang-cau-hoi')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white hover:bg-slate-50 text-slate-800 text-sm font-semibold border border-slate-200 shadow-xs transition-all hover:-translate-y-0.5 cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px] text-[#004AC6]">quiz</span>
                <span>Tạo câu hỏi trắc nghiệm</span>
              </button>
              <button
                onClick={() => navigate('/quan-tri-khoa-hoc')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#004AC6] hover:bg-blue-700 text-white text-sm font-semibold shadow-sm transition-all hover:-translate-y-0.5 cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">add_circle</span>
                <span>Thêm khóa học mới</span>
              </button>
            </div>
          </div>

          {/* Core 4 Useful Metric Cards */}
          <div role="region" aria-label="Thống kê quản trị" tabIndex={0} className="no-scrollbar grid w-full grid-flow-col grid-rows-2 auto-cols-[calc(100%_-_2.5rem)] gap-5 overflow-x-auto overscroll-x-contain scroll-smooth snap-x snap-mandatory pb-2 sm:grid-flow-row sm:grid-rows-none sm:auto-cols-auto sm:grid-cols-2 sm:overflow-visible sm:snap-none sm:pb-0 xl:grid-cols-4">
            {/* Metric 1 */}
            <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between relative overflow-hidden transition-all hover:shadow-md">
              <div className="flex items-start justify-between">
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Người dùng kích hoạt</span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-3xl font-bold text-slate-900">{overview?.activeUsers ?? '—'}</span>
                  </div>
                </div>
                <div className="w-11 h-11 rounded-lg bg-blue-50 flex items-center justify-center text-[#004AC6]">
                  <span className="material-symbols-outlined text-[24px]">group</span>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">Tài khoản công dân</span>
                <span className="text-slate-900 font-semibold">{overview?.users ?? '—'} tài khoản tổng cộng</span>
              </div>
            </div>

            {/* Metric 2 */}
            <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between relative overflow-hidden transition-all hover:shadow-md">
              <div className="flex items-start justify-between">
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Khóa học đang phát hành</span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-3xl font-bold text-slate-900">{overview?.courses ?? '—'}</span>
                    <span className="text-xs text-slate-500">khóa học</span>
                  </div>
                </div>
                <div className="w-11 h-11 rounded-lg bg-blue-50 flex items-center justify-center text-[#004AC6]">
                  <span className="material-symbols-outlined text-[24px]">school</span>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">Nội dung đào tạo</span>
                <span className="text-emerald-600 font-semibold">Đang mở cho học viên</span>
              </div>
            </div>

            {/* Metric 3 */}
            <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between relative overflow-hidden transition-all hover:shadow-md">
              <div className="flex items-start justify-between">
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Ngân hàng trắc nghiệm</span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-3xl font-bold text-slate-900">{overview?.questions ?? '—'}</span>
                    <span className="text-xs text-slate-500">câu hỏi</span>
                  </div>
                </div>
                <div className="w-11 h-11 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
                  <span className="material-symbols-outlined text-[24px]">quiz</span>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">Hình thức diễn tập</span>
                <span className="text-slate-900 font-semibold">Tình huống thực tế</span>
              </div>
            </div>

            {/* Metric 4 */}
            <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between relative overflow-hidden transition-all hover:shadow-md">
              <div className="flex items-start justify-between">
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Lượt kiểm tra 30 ngày</span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-3xl font-bold text-slate-900">{overview?.scansLast30Days ?? '—'}</span>
                  </div>
                </div>
                <div className="w-11 h-11 rounded-lg bg-red-50 flex items-center justify-center text-red-600">
                  <span className="material-symbols-outlined text-[24px]">policy</span>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">Nguy cơ phát hiện</span>
                <span className="text-red-600 font-semibold">{overview?.highRiskScansLast30Days ?? '—'} lượt rủi ro cao</span>
              </div>
            </div>
          </div>

          {/* Main Visualized Content Split */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Column: Recent Admin Audit Log (7 cols) */}
            <div className="lg:col-span-7 bg-white rounded-xl p-6 lg:p-7 border border-slate-200/80 shadow-xs flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-[#004AC6]">
                    <span className="material-symbols-outlined text-[20px]">history</span>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Hoạt động quản trị gần đây</h2>
                    <p className="text-xs text-slate-500">Nhật ký kiểm tra và điều chỉnh phân quyền hệ thống</p>
                  </div>
                </div>
                <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded">
                  Thời gian thực
                </span>
              </div>

              <div className="flex flex-col gap-3">
                {(showAllAudit ? audit : audit.slice(0, 3)).map(event => (
                  <div key={event.id} className="p-4 rounded-lg bg-slate-50 hover:bg-slate-100/70 border border-slate-100 transition-colors flex items-start gap-4">
                    <div className="w-9 h-9 rounded-full bg-blue-100 text-[#004AC6] flex items-center justify-center shrink-0 mt-0.5"><span className="material-symbols-outlined text-[18px]">history</span></div>
                    <div className="flex-1 min-w-0"><div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1"><p className="text-sm font-semibold text-slate-900 truncate">{event.action}</p><span className="text-xs text-slate-500 whitespace-nowrap">{new Date(event.createdAt).toLocaleString('vi-VN')}</span></div><p className="text-xs text-slate-600 mt-1">{event.detail || event.targetId}</p><div className="flex flex-wrap items-center gap-3 mt-2 text-xs"><span className="font-mono text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs">{event.targetId.slice(0, 16)}</span><span className="text-slate-500">Thực hiện bởi: {event.actorName || 'Quản trị viên'}</span></div></div>
                  </div>
                ))}
                {!audit.length && <p className="text-sm text-slate-500">Chưa có hoạt động quản trị.</p>}
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-slate-100 text-xs">
                <span className="text-slate-500">Hiển thị {showAllAudit ? audit.length : Math.min(3, audit.length)} trong {auditTotal} bản ghi</span>
                <button
                  type="button"
                  onClick={() => void toggleAudit()}
                  className="font-semibold text-[#004AC6] hover:text-blue-700 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <span>{showAllAudit ? 'Thu gọn nhật ký' : 'Xem toàn bộ nhật ký'}</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
              </div>
            </div>

            {/* Right Column: Top Reported Scam Types (5 cols) */}
            <div className="lg:col-span-5 bg-white rounded-xl p-6 lg:p-7 border border-slate-200/80 shadow-xs flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                    <span className="material-symbols-outlined text-[20px]">warning</span>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Top 4 dạng lừa đảo &amp; Phishing bùng phát tuần qua</h2>
                    <p className="text-xs text-slate-500">Phân loại từ các báo cáo đã duyệt trong 7 ngày</p>
                  </div>
                </div>
              </div>

              {/* Clean Metric Bars */}
              <div className="flex flex-col gap-4">
                {threats.map((threat, index) => (
                  <div key={threat.category} className="flex flex-col gap-2 p-3.5 rounded-lg bg-slate-50 border border-slate-100"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><span className={'w-2.5 h-2.5 rounded-full shrink-0 ' + (['bg-red-600','bg-amber-500','bg-[#004AC6]','bg-slate-600'][index] || 'bg-slate-500')} /><span className="text-sm font-semibold text-slate-900">{threat.category}</span></div><span className="text-lg font-bold text-slate-900">{threat.percent}%</span></div><div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden"><div className="h-full bg-[#004AC6] rounded-full transition-all duration-500" style={{ width: String(threat.percent) + '%' }} /></div><div className="text-xs text-slate-500">{threat.count} báo cáo đã duyệt</div></div>
                ))}
                {!threats.length && <p className="text-sm text-slate-500">Chưa có báo cáo đã duyệt trong 7 ngày qua.</p>}
              </div>

              {/* Bottom Summary Box inside card */}
              <div className="p-4 rounded-lg bg-blue-50/60 border border-blue-100 flex items-start gap-3 mt-auto">
                <span className="material-symbols-outlined text-[#004AC6] text-[20px] shrink-0 mt-0.5">verified_user</span>
                <p className="text-xs text-slate-700 leading-relaxed">
                  Thống kê này dựa trên báo cáo đã được quản trị viên duyệt; số liệu sẽ thay đổi khi có báo cáo mới.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Platform Health & Infrastructure Note */}
          <div className="p-5 bg-white rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[20px]">cloud_done</span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Trạng thái máy chủ và phân tích AI</h3>
                <p className="text-xs text-slate-500">
                  API: {health?.api || 'Đang kiểm tra'} • Cơ sở dữ liệu: {health?.database || 'Đang kiểm tra'} • Thời gian hoạt động: {health ? Math.floor(health.uptimeSeconds / 60) : '—'} phút
                </p>
                <p className="mt-1 text-xs text-slate-500">{settings ? settings.active ? `Gemini đang được bật (${settings.model}).` : settings.configured ? 'Đã có khóa Gemini; AI đang tắt.' : 'Chưa cấu hình GEMINI_API_KEY; các lượt quét dùng bộ quy tắc.' : 'Đang tải trạng thái Gemini…'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void loadLogs()}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors cursor-pointer"
              >
                Xem nhật ký API
              </button>
              <button
                type="button"
                onClick={() => void toggleAi()}
                disabled={!settings || togglingAi || (!settings.configured && !settings.enabled)}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
              >
                {togglingAi ? 'Đang cập nhật…' : settings?.enabled ? 'Tắt AI' : 'Bật AI'}
              </button>
            </div>
          </div>

        </div>
      </div>

      {logs && <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs" onMouseDown={event => { if (event.target === event.currentTarget) setLogs(null); }}><div role="dialog" aria-modal="true" aria-label="Nhật ký yêu cầu API gần đây" className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-xl border border-slate-200 max-h-[80vh] overflow-auto"><div className="flex justify-between items-center mb-4"><h2 className="text-lg font-bold">Nhật ký yêu cầu API gần đây</h2><button type="button" aria-label="Đóng nhật ký API" onClick={() => setLogs(null)} className="text-slate-500"><span className="material-symbols-outlined">close</span></button></div><div className="space-y-2">{logs.map(log => <div key={log.id} className="p-3 rounded-lg bg-slate-50 border border-slate-100 flex flex-wrap gap-3 text-xs"><strong>{log.method}</strong><span className="font-mono">{log.path}</span><span className={log.status >= 400 ? 'text-red-600' : 'text-emerald-600'}>{log.status}</span><span>{log.durationMs} ms</span><span className="ml-auto">{new Date(log.createdAt).toLocaleString('vi-VN')}</span></div>)}{!logs.length && <p className="text-sm text-slate-500">Chưa có yêu cầu nào được ghi nhận.</p>}</div></div></div>}

    </AdminLayout>
  );
};
