import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api';
import { useAppStore } from '../../store/useAppStore';
import type { ScanResult } from '../../types';

type Certificate = { id: string; courseId: string; courseTitle: string; code: string; issuedAt: string };
const date = (value: string) => new Date(value).toLocaleString('vi-VN');
const riskLabel = (scan: ScanResult) => scan.level === 'NGUY_HIEM' ? 'Nguy hiểm' : scan.level === 'CANH_GIAC' ? 'Cần cảnh giác' : 'Ít rủi ro';
const riskColor = (scan: ScanResult) => scan.level === 'NGUY_HIEM' ? 'text-rose-700 bg-rose-50 border-rose-200' : scan.level === 'CANH_GIAC' ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-emerald-700 bg-emerald-50 border-emerald-200';

export const UserDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, personalStats, scanHistory, courses, completedCourseIds, lessonProgress, openScan, refreshPersonal } = useAppStore();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [certificateError, setCertificateError] = useState('');
  useEffect(() => {
    if (!currentUser) return;
    let active = true;
    refreshPersonal().catch(() => {});
    api<{ items: Certificate[] }>('/me/certificates').then(data => { if (active) setCertificates(data.items); }).catch(error => { if (active) setCertificateError((error as Error).message); });
    return () => { active = false; };
  }, [currentUser?.id]);
  const viewScan = async (scan: ScanResult) => {
    if (!scan.id) return;
    await openScan(scan.id);
    navigate('/kiem-tra');
  };
  const activeCourse = courses.find(course => !completedCourseIds.includes(course.id) && lessonProgress.some(progress => progress.courseId === course.id));
  const courseProgress = activeCourse ? Math.round(100 * lessonProgress.filter(progress => progress.courseId === activeCourse.id).length / Math.max(1, activeCourse.modules.length)) : 0;
  const recentThreats = scanHistory.filter(scan => scan.level === 'NGUY_HIEM' || scan.level === 'CANH_GIAC').slice(0, 3);
  const stats = personalStats as { scansLast30Days?: number; scanCount?: number; scanCountsByType?: Record<string, number>; highRiskScansLast30Days?: number } | null;
  return <div className="w-full bg-[#F8FAFC] min-h-screen pt-20 pb-16">
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-6">
        <nav className="flex min-w-0 flex-wrap items-center gap-2 text-xs sm:text-sm text-slate-500 font-medium"><Link to="/" className="hover:text-[#004AC6]">Trang chủ</Link><span className="material-symbols-outlined text-base">chevron_right</span><span className="text-slate-900 font-semibold">Tổng quan an ninh cá nhân</span></nav>
        <span className="font-mono text-xs text-slate-500">Dữ liệu tài khoản của bạn</span>
      </div>
      <div className="bg-white rounded-2xl p-6 lg:p-8 shadow-xs border border-slate-200/80 relative overflow-hidden mb-8">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-100/50 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex items-center gap-5 min-w-0">
            {currentUser?.avatar ? <img className="w-18 h-18 sm:w-20 sm:h-20 rounded-full object-cover border-2 border-white ring-2 ring-slate-100" src={currentUser.avatar} alt="Ảnh đại diện" /> : <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-full bg-blue-50 text-[#004AC6] flex items-center justify-center text-3xl font-bold">{currentUser?.name?.charAt(0).toUpperCase() || 'B'}</div>}
            <div className="min-w-0"><h1 className="text-xl sm:text-2xl font-bold text-slate-900 break-words">Xin chào, {currentUser?.name || 'bạn'}!</h1><p className="text-sm text-slate-600 mt-1 break-all">{currentUser?.email}</p><p className="text-xs text-slate-500 mt-1 break-all">ID: {currentUser?.id}</p></div>
          </div>
          <div className="flex w-full flex-wrap gap-3 lg:w-auto"><Link to="/kiem-tra" className="inline-flex min-w-0 flex-1 items-center justify-center gap-2 rounded-xl bg-[#004AC6] px-3 py-2.5 text-center text-sm font-semibold text-white hover:bg-[#003EA8] sm:flex-none sm:px-5"><span className="material-symbols-outlined text-lg">search_check</span>Kiểm tra nội dung mới</Link><Link to="/cai-dat" className="shrink-0 rounded-xl border border-slate-200 bg-slate-100 p-2.5 text-slate-700 hover:bg-slate-200" title="Cài đặt tài khoản"><span className="material-symbols-outlined">settings</span></Link></div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200/80"><span className="material-symbols-outlined text-[#004AC6] bg-blue-50 rounded-xl p-2">security</span><p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-5">Tổng lượt quét an ninh • 30 ngày qua</p><p className="text-3xl font-extrabold text-slate-900 mt-1">{stats?.scansLast30Days ?? '—'}</p><p className="text-xs text-slate-600 mt-4">URL: {stats?.scanCountsByType?.url ?? 0} · Tin nhắn: {stats?.scanCountsByType?.sms ?? 0} · Số điện thoại: {stats?.scanCountsByType?.phone ?? 0} · Ngân hàng: {stats?.scanCountsByType?.bank ?? 0}</p></div>
        <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200/80"><span className="material-symbols-outlined text-rose-600 bg-rose-50 rounded-xl p-2">warning</span><p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-5">Lượt quét rủi ro cao • 30 ngày qua</p><p className="text-3xl font-extrabold text-slate-900 mt-1">{stats?.highRiskScansLast30Days ?? '—'}</p><p className="text-xs text-slate-600 mt-4">Dựa trên kết quả các nội dung bạn đã chủ động kiểm tra.</p></div>
        <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200/80"><span className="material-symbols-outlined text-emerald-600 bg-emerald-50 rounded-xl p-2">workspace_premium</span><p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-5">Tiến độ học tập</p><p className="text-3xl font-extrabold text-slate-900 mt-1">{completedCourseIds.length}<span className="text-base text-slate-400">/{courses.length}</span></p><p className="text-xs text-slate-600 mt-4">Khóa học đã hoàn thành · {certificates.length} chứng chỉ đã cấp</p></div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7 space-y-8">
          <section className="bg-white rounded-2xl p-6 lg:p-7 shadow-xs border border-slate-200/80">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2"><span className="material-symbols-outlined text-[#004AC6]">model_training</span>Học tập đang tiếp tục</h2>
            {activeCourse ? <div className="mt-5 bg-slate-50 border border-slate-200 rounded-xl p-5"><h3 className="font-bold text-slate-900">{activeCourse.title}</h3><p className="text-sm text-slate-600 mt-2">{activeCourse.description}</p><div className="flex justify-between text-xs mt-4 mb-1"><span>Tiến độ bài học</span><span>{courseProgress}%</span></div><div className="h-2 rounded-full bg-slate-200"><div className="h-full rounded-full bg-[#004AC6]" style={{ width: `${courseProgress}%` }} /></div></div> : <p className="text-sm text-slate-600 mt-4">Chưa có khóa học đang học dở. Chọn một chủ đề để bắt đầu.</p>}
            <Link to="/hoc-tap" className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#004AC6] text-white text-sm font-semibold hover:bg-[#003EA8]">{activeCourse ? 'Tiếp tục học' : 'Khám phá bài học'}<span className="material-symbols-outlined text-base">arrow_forward</span></Link>
          </section>
          <section className="bg-white rounded-2xl p-6 lg:p-7 shadow-xs border border-slate-200/80"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2"><span className="material-symbols-outlined text-rose-600">warning</span>Kết quả cần chú ý gần đây</h2><span className="text-xs font-semibold text-rose-700 bg-rose-50 rounded-full px-3 py-1">{stats?.highRiskScansLast30Days ?? 0} rủi ro cao</span></div><div className="space-y-3 mt-5">{recentThreats.length ? recentThreats.map(scan => <div key={scan.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-4"><div className="min-w-0 flex-1"><p className="font-semibold text-sm text-slate-900 truncate">{scan.query}</p><p className="text-xs text-slate-500 mt-1">{date(scan.scannedAt)} · Điểm rủi ro {scan.riskScore}/100</p></div><button type="button" onClick={() => viewScan(scan)} className="shrink-0 text-xs font-semibold text-[#004AC6] hover:underline">Xem chi tiết</button></div>) : <p className="text-sm text-slate-600">Chưa có kết quả cần chú ý trong lịch sử quét.</p>}</div></section>
        </div>
        <div className="lg:col-span-5 space-y-8">
          <section className="bg-white rounded-2xl p-6 lg:p-7 shadow-xs border border-slate-200/80"><h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2"><span className="material-symbols-outlined text-[#004AC6]">history</span>Tra cứu gần đây</h2><div className="space-y-3 mt-5">{scanHistory.slice(0, 3).map(scan => <button key={scan.id} type="button" onClick={() => viewScan(scan)} className="w-full text-left p-4 rounded-xl bg-slate-50 border border-slate-100 hover:bg-blue-50 transition-colors"><div className="flex items-center justify-between gap-2"><span className={`text-xs font-semibold rounded-full border px-2 py-0.5 ${riskColor(scan)}`}>{riskLabel(scan)}</span><span className="text-xs text-slate-500">{date(scan.scannedAt)}</span></div><p className="font-mono text-xs font-bold text-slate-900 truncate mt-3">{scan.query}</p><p className="text-xs text-slate-600 mt-1 line-clamp-2">{scan.title}</p><p className="text-xs text-slate-500 mt-2">Điểm rủi ro: {scan.riskScore}/100</p></button>)}{!scanHistory.length && <p className="text-sm text-slate-600">Bạn chưa thực hiện tra cứu nào.</p>}</div><Link to="/kiem-tra" className="mt-5 block p-3 rounded-xl bg-slate-100 hover:bg-blue-50 text-sm font-semibold text-[#004AC6]">Xem lịch sử tra cứu ({stats?.scanCount ?? 0} mục) →</Link></section>
          <div className="bg-blue-50/90 border border-blue-200/80 rounded-2xl p-6"><h3 className="font-bold text-slate-900 flex items-center gap-2"><span className="material-symbols-outlined text-[#004AC6]">lightbulb</span>Mẹo an toàn</h3><p className="text-sm text-slate-700 mt-2">Không chia sẻ mã xác thực hoặc mật khẩu cho bất kỳ ai, kể cả người tự xưng là nhân viên hỗ trợ.</p><Link to="/hoc-tap" className="text-xs font-bold text-[#004AC6] mt-3 inline-block hover:underline">Xem bài học →</Link></div>
        </div>
      </div>
      <section className="mt-8 bg-white rounded-2xl p-6 lg:p-7 shadow-xs border border-slate-200/80"><h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2"><span className="material-symbols-outlined text-[#004AC6]">workspace_premium</span>Chứng chỉ số đã đạt</h2>{certificateError && <p className="text-sm text-rose-600 mt-3">{certificateError}</p>}{certificates.length ? <div className="grid sm:grid-cols-2 gap-3 mt-4">{certificates.map(item => <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="font-bold text-slate-900">{item.courseTitle}</p><p className="text-xs text-slate-600 mt-2">Mã chứng chỉ: <span className="font-mono">{item.code}</span></p><p className="text-xs text-slate-500 mt-1">Cấp ngày {date(item.issuedAt)}</p></div>)}</div> : !certificateError && <p className="text-sm text-slate-600 mt-3">Chưa có chứng chỉ. Hoàn thành bài học và đạt bài kiểm tra để nhận chứng chỉ.</p>}</section>
    </div>
  </div>;
};
