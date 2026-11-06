import React from 'react';
import { useAppStore } from '../../store/useAppStore';
export const ThreatMetricsBar: React.FC = () => {
  const stats = useAppStore(s => s.overview);
  const metrics = [['Tổng lượt quét', stats?.totalScans], ['Lượt quét hôm nay (GMT+7)', stats?.totalScansToday], ['Báo cáo quản trị viên đã duyệt', stats?.verifiedReports], ['Thời gian xử lý trung bình (ms)', stats?.averageAnalysisTimeMs]];
  return <section className="w-full max-w-6xl mx-auto my-6 px-4"><div className="flex flex-wrap justify-between text-xs text-slate-500 mb-3"><span>Số liệu hoạt động CyberAware</span><span>{stats ? `Cập nhật: ${new Date(stats.updatedAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })} (GMT+7)` : 'Chưa có dữ liệu từ máy chủ'}</span></div><div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">{metrics.map(([label,value]) => <div key={String(label)} className="bg-white p-5 rounded-2xl border border-slate-200"><p className="text-3xl font-bold text-blue-700">{value ?? '—'}</p><p className="text-sm text-slate-600 mt-2">{label}</p></div>)}</div></section>;
};
