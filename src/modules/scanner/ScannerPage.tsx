import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Search,
  MessageSquare,
  Phone,
  CreditCard,
  QrCode,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Clock,
  Sparkles,
  ArrowRight,
  Upload,
  RefreshCw,
  FileCheck,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { RiskGauge } from '../../components/common/RiskGauge';
import { ScanType } from '../../types';
import { ScanHistory } from './ScanHistory';
import { ComingSoonDialog } from '../../components/common/ComingSoonDialog';
import { ScanProcessFlow } from './ScanProcessFlow';
import { scanExamples } from '../../data/scanExamples';

export const ScannerPage: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    runScan,
    isScanning,
    scanResult,
    clearScan,
    setReportModalOpen,
  } = useAppStore();

  const [qrFile, setQrFile] = useState<string | null>(null);
  const [comingSoonType, setComingSoonType] = useState<'phone' | 'bank' | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === 'phone' || activeTab === 'bank') {
      setComingSoonType(activeTab);
      return;
    }
    if (!searchQuery.trim()) return;
    runScan(searchQuery.trim(), activeTab);
  };

  const handleSampleClick = (val: string) => {
    if (activeTab === 'phone' || activeTab === 'bank') {
      setComingSoonType(activeTab);
      return;
    }
    setSearchQuery(val);
    runScan(val, activeTab);
  };

  const handleHistorySelect = (scan: import('../../types').ScanResult) => {
    if (scan.type === 'phone' || scan.type === 'bank') {
      setComingSoonType(scan.type);
      return;
    }
    setActiveTab(scan.type);
    setSearchQuery(scan.query);
    void runScan(scan.query, scan.type);
    document.getElementById('scanner-tool')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="w-full flex flex-col items-center py-8 md:py-12 px-4 md:px-12 max-w-[1280px] mx-auto">
      {/* Header */}
      <div className="flex flex-col items-center text-center max-w-2xl mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-[#004AC6] text-xs font-bold mb-3 border border-blue-100">
          <ShieldCheck className="w-4 h-4" />
          <span>HỆ THỐNG THẨM ĐỊNH ĐA TẦNG AI</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
          Kiểm tra & Xác minh lừa đảo trực tuyến
        </h1>
        <p className="text-slate-600 text-sm md:text-base mt-2">
          Kiểm tra dấu hiệu bằng bộ quy tắc và báo cáo đã được quản trị viên duyệt. Không xác minh chủ tài khoản ngân hàng, thuê bao hoặc kết luận an toàn.
        </p>
      </div>

      <ScanProcessFlow />
      <Link to="/#tien-ich-gmail" className="mb-7 inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-5 py-3 text-sm font-bold text-[#004AC6] hover:bg-blue-100">
        Kiểm tra thư ngay trong Gmail <ArrowRight className="h-4 w-4" />
      </Link>

      {/* Main Tool Container */}
      <div id="scanner-tool" className="relative flex w-full max-w-[1024px] scroll-mt-24 flex-col gap-6 overflow-hidden rounded-[2rem] border border-blue-100 bg-white/95 p-5 shadow-[0_24px_70px_-34px_rgba(0,74,198,0.32)] ring-1 ring-white md:p-8">
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#004AC6] via-cyan-400 to-indigo-500" />
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-[#004AC6] ring-1 ring-blue-100">
            <Search className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold tracking-tight text-slate-900 md:text-xl">Bắt đầu kiểm tra</h2>
            <p className="text-xs text-slate-500 md:text-sm">Chọn loại nội dung và nhập thông tin cần phân tích.</p>
          </div>
        </div>
        {/* Navigation Tabs */}
        <div className="grid grid-cols-2 gap-2.5 border-b border-slate-100 pb-5 lg:grid-cols-4">
          {[
            { id: 'url', label: 'Website / URL', icon: Search },
            { id: 'sms', label: 'Tin nhắn SMS / Chat', icon: MessageSquare },
            { id: 'phone', label: 'Số điện thoại', icon: Phone },
            { id: 'bank', label: 'Tài khoản ngân hàng', icon: CreditCard },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  if (tab.id === 'phone' || tab.id === 'bank') {
                    setComingSoonType(tab.id);
                    return;
                  }
                  setActiveTab(tab.id as ScanType);
                  clearScan();
                }}
                className={`flex min-h-12 min-w-0 items-center justify-center gap-2 rounded-xl border px-2 py-2.5 text-center text-xs font-semibold transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004AC6] focus-visible:ring-offset-2 lg:whitespace-nowrap lg:px-3 md:text-sm ${
                  isActive
                    ? 'border-blue-600 bg-gradient-to-r from-[#004AC6] to-blue-600 text-white shadow-[0_10px_22px_-10px_rgba(0,74,198,0.8)]'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-[#004AC6]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold uppercase tracking-[0.09em] text-slate-700">
              {activeTab === 'url'
                ? 'Nhập đường dẫn liên kết cần kiểm tra'
                : activeTab === 'sms'
                ? 'Dán nội dung tin nhắn hoặc email khả nghi'
                : activeTab === 'phone'
                ? 'Nhập số điện thoại gọi đến'
                : 'Nhập số tài khoản ngân hàng & tên chủ tài khoản'}
            </label>

            {activeTab === 'sms' ? (
              <textarea
                rows={4}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ví dụ: VCB Digibank: Phat hien tai khoan dang nhap tai thiet bi la. Truy cap link..."
                className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-sm leading-6 text-slate-900 shadow-inner shadow-slate-100 transition-all placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-100"
              />
            ) : (
              <div className="flex flex-col items-stretch rounded-2xl border border-slate-200 bg-slate-50/70 p-2 shadow-inner shadow-slate-100 transition-all focus-within:border-blue-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-100 sm:flex-row sm:items-center">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    activeTab === 'url'
                      ? 'https://nhan-qua-tri-an-tet2025.top'
                      : activeTab === 'phone'
                      ? '+84 987 654 321'
                      : '19038291028301 - TECHCOMBANK'
                  }
                  className="min-w-0 w-full flex-grow border-none bg-transparent px-3 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                />
                <button
                  type="submit"
                  disabled={isScanning || !searchQuery.trim()}
                  className="flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#004AC6] to-blue-600 px-6 py-3 text-sm font-bold text-white shadow-[0_8px_18px_-8px_rgba(0,74,198,0.8)] transition-all hover:from-blue-700 hover:to-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004AC6] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isScanning ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Đang quét...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Phân tích</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {activeTab === 'sms' && (
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isScanning || !searchQuery.trim()}
                  className="flex cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-r from-[#004AC6] to-blue-600 px-6 py-3 text-sm font-bold text-white shadow-[0_8px_18px_-8px_rgba(0,74,198,0.8)] transition-all hover:from-blue-700 hover:to-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004AC6] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isScanning ? 'Đang phân tích...' : 'Phân tích tin nhắn này'}
                </button>
              </div>
            )}
          </div>

          {/* Quick Samples */}
          <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-5 text-xs">
            <span className="mr-1 inline-flex items-center gap-1.5 font-semibold text-slate-500"><span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />Mẫu thử nhanh</span>
            {scanExamples[activeTab].map((sample, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSampleClick(sample)}
                className="max-w-full truncate rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-mono text-[11px] text-slate-600 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-[#004AC6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004AC6]"
              >
                {sample.length > 32 ? sample.slice(0, 32) + '...' : sample}
              </button>
            ))}
          </div>
        </form>

        {/* Scan Result Container */}
        {scanResult && (
          <div data-no-auto-translate className="mt-4 p-6 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col gap-5 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-200">
              <div>
                <span className="text-xs font-mono font-semibold text-slate-500 uppercase">Kết quả kiểm tra</span>
                <p className="text-base font-mono font-bold text-slate-900 break-all">{scanResult.query}</p>
              </div>
              <RiskGauge score={scanResult.riskScore} level={scanResult.level} size="lg" />
            </div>

            <p className="text-xs text-slate-500">Nguồn: {scanResult.source} • AI: {scanResult.aiStatus === 'available' ? 'Đã phân tích ngữ cảnh' : scanResult.aiStatus === 'unavailable' ? 'Tạm không khả dụng, dùng bộ quy tắc' : 'Chưa dùng cho lượt kiểm tra này'}. Điểm rủi ro không phải xác suất lừa đảo.</p>
            {scanResult.aiReasoning && (
              <div className="p-4 bg-blue-50/80 rounded-xl border border-blue-100 text-sm text-blue-900 flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-[#004AC6] shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Phân tích bổ sung của AI: </span>
                  <span>{scanResult.aiReasoning}</span>
                </div>
              </div>
            )}
            {!!scanResult.evidenceSources?.length && <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-950">
              <p className="font-semibold">Cảnh báo công khai có thủ đoạn tương đồng</p>
              <ul className="mt-2 space-y-1">{scanResult.evidenceSources.map(source => <li key={source.url}><a className="underline" href={source.url} target="_blank" rel="noreferrer">{source.title}</a> · {source.sourceName} ({source.date})</li>)}</ul>
              <p className="mt-2 text-xs">Đây là sự tương đồng về thủ đoạn, không xác nhận rằng nội dung/đối tượng cụ thể nằm trong danh sách đen.</p>
            </div>}

            {/* Multi-layer inspection checks */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-col gap-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase">Căn cứ đánh giá</span>
                <span className={`text-xs font-semibold ${scanResult.riskScore >= 70 ? 'text-red-600' : scanResult.riskScore >= 30 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {scanResult.source === 'rules+community' ? 'Có báo cáo cộng đồng đã duyệt' : 'Bộ quy tắc CyberAware'}
                </span>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-col gap-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase">Loại dấu hiệu</span>
                <span className="text-xs font-semibold text-slate-800">
                  {scanResult.threatCategory || (scanResult.riskScore >= 30 ? 'Xem chi tiết dấu hiệu bên dưới' : 'Chưa thấy dấu hiệu nổi bật')}
                </span>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-col gap-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase">Chỉ số tin cậy</span>
                <span className={`text-xs font-semibold ${scanResult.riskScore >= 70 ? 'text-red-600' : scanResult.riskScore >= 30 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {scanResult.riskScore}/100 điểm rủi ro tham khảo
                </span>
              </div>
            </div>

            {/* Flags */}
            <div className="flex flex-col gap-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Chi tiết dấu hiệu cảnh báo ({scanResult.flags.length})
              </h4>
              <div className="flex flex-col gap-2">
                {scanResult.flags.map((flag, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl text-xs md:text-sm flex items-start gap-2.5 ${
                      scanResult.riskScore >= 70
                        ? 'bg-red-50 text-red-900 border border-red-100'
                        : scanResult.riskScore >= 30 ? 'bg-amber-50 text-amber-900 border border-amber-100' : 'bg-emerald-50 text-emerald-900 border border-emerald-100'
                    }`}
                  >
                    {scanResult.riskScore >= 30 ? (
                      <AlertTriangle className={`w-4 h-4 ${scanResult.riskScore >= 70 ? 'text-red-600' : 'text-amber-600'} shrink-0 mt-0.5`} />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    )}
                    <span>{flag}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommendations */}
            <div className="flex flex-col gap-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Hướng dẫn hành động khuyên nghị
              </h4>
              <div className="flex flex-col gap-2">
                {scanResult.recommendations.map((rec, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs md:text-sm text-slate-700">
                    <span className="w-2 h-2 rounded-full bg-[#004AC6] mt-1.5 shrink-0" />
                    <span>{rec}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-200">
              <button
                onClick={() => setReportModalOpen(true)}
                className="text-xs font-semibold text-red-600 hover:text-red-700 flex items-center gap-1.5"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Gửi báo cáo tới quản trị viên CyberAware</span>
              </button>
              <button
                onClick={clearScan}
                className="py-1.5 px-4 bg-slate-200 hover:bg-slate-300 text-xs font-semibold rounded-lg text-slate-700"
              >
                Xóa kết quả
              </button>
            </div>
          </div>
        )}
      </div>
      <div data-no-auto-translate className="w-full"><ScanHistory onSelect={handleHistorySelect} /></div>
      <ComingSoonDialog
        open={comingSoonType !== null}
        description={`Tính năng kiểm tra ${comingSoonType === 'phone' ? 'số điện thoại' : 'tài khoản ngân hàng'} sẽ sớm ra mắt.`}
        onClose={() => setComingSoonType(null)}
      />
    </div>
  );
};
