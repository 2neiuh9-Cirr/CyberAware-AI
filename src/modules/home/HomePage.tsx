import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Search,
  MessageSquare,
  Phone,
  CreditCard,
  Lock,
  ArrowRight,
  ExternalLink,
  AlertTriangle,
  FileText,
  Layers,
  Sparkles,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  PlayCircle,
  HelpCircle,
  ChevronRight,
  X,
} from 'lucide-react';
import { api } from '../../api';
import { useAppStore } from '../../store/useAppStore';
import { RiskGauge } from '../../components/common/RiskGauge';
import { ScanType } from '../../types';
import { CyberRadarShield } from '../../components/cyber/CyberRadarShield';
import { ThreatMetricsBar } from '../../components/cyber/ThreatMetricsBar';
import { CyberScanningOverlay } from '../../components/cyber/CyberScanningOverlay';
import { DeepfakeWaveformVisualizer } from '../../components/cyber/DeepfakeWaveformVisualizer';
import { CyberMobileShowcase } from './components/CyberMobileShowcase';
import { AiChatShowcase } from './components/AiChatShowcase';
import { FeaturedWarnings } from './components/FeaturedWarnings';
import { ComingSoonDialog } from '../../components/common/ComingSoonDialog';

export const HomePage: React.FC = () => {
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
    setSelectedScenario,
    scenarios: SCAM_SCENARIOS,
  } = useAppStore();

  const [inputVal, setInputVal] = useState(searchQuery);
  const [comingSoonType, setComingSoonType] = useState<'phone' | 'bank' | null>(null);
  const [videoOpen, setVideoOpen] = useState(false);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState('');
  const [featuredVideo, setFeaturedVideo] = useState<{ title: string; embedUrl: string; watchUrl: string } | null>(null);

  useEffect(() => {
    if (!videoOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setVideoOpen(false); };
    window.addEventListener('keydown', onKeyDown);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener('keydown', onKeyDown); };
  }, [videoOpen]);

  const openFeaturedVideo = async () => {
    setVideoOpen(true);
    setVideoLoading(true);
    setVideoError('');
    setFeaturedVideo(null);
    try {
      setFeaturedVideo(await api<{ title: string; embedUrl: string; watchUrl: string }>('/featured-video'));
    } catch (error) {
      setVideoError((error as Error).message);
    } finally {
      setVideoLoading(false);
    }
  };

  const handleTabChange = (tab: ScanType) => {
    if (tab === 'phone' || tab === 'bank') {
      setComingSoonType(tab);
      return;
    }
    setActiveTab(tab);
    setInputVal('');
    clearScan();
  };

  const handleScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === 'phone' || activeTab === 'bank') {
      setComingSoonType(activeTab);
      return;
    }
    if (!inputVal.trim()) return;
    runScan(inputVal.trim(), activeTab);
  };

  const handleSuggestionClick = (suggestion: string) => {
    if (activeTab === 'phone' || activeTab === 'bank') {
      setComingSoonType(activeTab);
      return;
    }
    setInputVal(suggestion);
    runScan(suggestion, activeTab);
  };

  const currentPlaceholder =
    activeTab === 'url'
      ? 'https://nhan-qua-tri-an-tet2025.top hoặc tên miền khả nghi...'
      : activeTab === 'sms'
      ? 'Dán nội dung tin nhắn SMS nhận được tại đây (yêu cầu OTP, trúng thưởng...)'
      : activeTab === 'phone'
      ? 'Nhập số điện thoại lạ gọi đến (+84 987...)'
      : 'Nhập số tài khoản ngân hàng kẻ gian yêu cầu chuyển tiền...';

  return (
    <div className="w-full flex flex-col items-center">
      {/* Hero & Quick Check Section */}
      <section className="relative w-full flex flex-col items-center pt-8 md:pt-12 pb-16 md:pb-24 px-4 md:px-12 lg:px-24 bg-gradient-to-b from-[#F8FAFC] via-[#F8F9FF] to-[#F1F5F9] overflow-hidden">
        {/* Subtle Ambient Graphic Accents */}
        <div className="absolute w-[720px] h-[360px] left-1/2 -translate-x-1/2 top-10 bg-[#004AC6]/5 blur-[36px] rounded-full z-0 pointer-events-none" />
        <div className="absolute w-[360px] h-[360px] -right-16 top-16 bg-[#68DBA9]/15 blur-[28px] rounded-full z-0 pointer-events-none" />
        <div className="absolute w-[280px] h-[280px] -left-16 bottom-10 bg-blue-400/10 blur-[28px] rounded-full z-0 pointer-events-none" />

        <div className="flex flex-col items-center max-w-[896px] w-full z-10">
          {/* Civic Trust Tag */}
          <div className="mb-6">
            <div className="flex flex-row items-center py-1.5 px-3.5 gap-2 bg-white shadow-sm border border-slate-100 rounded-full">
              <ShieldCheck className="w-4 h-4 text-[#004AC6]" />
              <span className="text-[#0F172A] font-bold text-xs uppercase tracking-wide">
                CÔNG CỤ NHẬN DIỆN DẤU HIỆU LỪA ĐẢO
              </span>
            </div>
          </div>

          {/* Heading 1 - Main Headline */}
          <div className="mb-4 md:mb-6 text-center max-w-[780px]">
            <h1 className="text-[#0F172A] font-extrabold text-3xl sm:text-4xl md:text-5xl leading-tight tracking-tight mb-4">
              Nhận diện & phòng tránh lừa đảo trực tuyến với <span className="text-[#004AC6]">CyberAware AI</span>
            </h1>
            <p className="text-[#434655] text-sm md:text-base leading-relaxed max-w-[672px] mx-auto">
              Bảo vệ bản thân và gia đình trước các đường dẫn độc hại, tin nhắn lừa đảo mạo danh ngân hàng số, giả mạo sàn thương mại điện tử và thủ đoạn thao túng tâm lý tinh vi.
            </p>
          </div>

          {/* Interactive Dynamic Cyber Radar & Shield Illustration */}
          <CyberRadarShield />

          {/* Quick Check Tool Box */}
          <div className="w-full bg-white rounded-2xl shadow-xl shadow-black/5 border border-slate-100/80 p-5 md:p-8 flex flex-col gap-5 relative">
            {/* Live Engine Status Indicator */}
            <div className="flex items-center justify-between text-xs font-mono text-slate-500 px-1 border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-semibold text-slate-700">KIỂM TRA DẤU HIỆU RỦI RO</span>
              </div>
              <span className="text-[#004AC6] font-semibold hidden sm:inline">KẾT QUẢ THAM KHẢO</span>
            </div>

            {/* Interactive Tabs */}
            <div className="grid grid-cols-2 gap-2 lg:flex lg:flex-row lg:items-center lg:overflow-x-auto lg:pb-1">
              <button
                type="button"
                onClick={() => handleTabChange('url')}
                className={`flex min-w-0 flex-row items-center justify-center py-2.5 px-2 lg:px-5 gap-2 rounded-xl text-center text-xs sm:text-sm font-semibold transition-all lg:whitespace-nowrap cursor-pointer ${
                  activeTab === 'url'
                    ? 'bg-[#004AC6] text-white shadow-sm'
                    : 'bg-[#F1F5F9] text-[#434655] hover:bg-slate-200/80'
                }`}
              >
                <Search className="w-4 h-4" />
                <span>Kiểm tra đường dẫn</span>
              </button>

              <button
                type="button"
                onClick={() => handleTabChange('sms')}
                className={`flex min-w-0 flex-row items-center justify-center py-2.5 px-2 lg:px-5 gap-2 rounded-xl text-center text-xs sm:text-sm font-semibold transition-all lg:whitespace-nowrap cursor-pointer ${
                  activeTab === 'sms'
                    ? 'bg-[#004AC6] text-white shadow-sm'
                    : 'bg-[#F1F5F9] text-[#434655] hover:bg-slate-200/80'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>Kiểm tra tin nhắn</span>
              </button>

              <button
                type="button"
                onClick={() => handleTabChange('phone')}
                className={`flex min-w-0 flex-row items-center justify-center py-2.5 px-2 lg:px-5 gap-2 rounded-xl text-center text-xs sm:text-sm font-semibold transition-all lg:whitespace-nowrap cursor-pointer ${
                  activeTab === 'phone'
                    ? 'bg-[#004AC6] text-white shadow-sm'
                    : 'bg-[#F1F5F9] text-[#434655] hover:bg-slate-200/80'
                }`}
              >
                <Phone className="w-4 h-4" />
                <span>Số điện thoại</span>
              </button>

              <button
                type="button"
                onClick={() => handleTabChange('bank')}
                className={`flex min-w-0 flex-row items-center justify-center py-2.5 px-2 lg:px-5 gap-2 rounded-xl text-center text-xs sm:text-sm font-semibold transition-all lg:whitespace-nowrap cursor-pointer ${
                  activeTab === 'bank'
                    ? 'bg-[#004AC6] text-white shadow-sm'
                    : 'bg-[#F1F5F9] text-[#434655] hover:bg-slate-200/80'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>Tài khoản ngân hàng</span>
              </button>
            </div>

            {/* Dynamic AI Scanning Laser Overlay */}
            {/* Input Form */}
            <form onSubmit={handleScanSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center bg-[#F1F5F9] rounded-xl p-2 gap-2 border border-slate-200/60 focus-within:ring-2 focus-within:ring-[#004AC6] focus-within:bg-white transition-all">
                <div className="px-3 hidden sm:flex items-center">
                  <Search className="w-5 h-5 text-[#004AC6]" />
                </div>
                <input
                  id="search-input-box"
                  type="text"
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  placeholder={currentPlaceholder}
                  className="min-w-0 w-full bg-transparent border-none outline-none flex-grow text-slate-900 placeholder:text-slate-400 text-sm py-2.5 px-3 sm:px-2"
                />
                <button
                  type="submit"
                  disabled={isScanning || !inputVal.trim()}
                  className="flex flex-row justify-center items-center py-3 px-6 gap-2 bg-[#004AC6] hover:bg-blue-700 active:scale-98 disabled:opacity-50 text-white rounded-lg shadow-md font-semibold text-sm transition-all cursor-pointer shrink-0"
                >
                  {isScanning ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Đang phân tích...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4 text-white" />
                      <span>Kiểm tra ngay</span>
                    </>
                  )}
                </button>
              </div>

              {/* Suggestions */}
              <div className="flex flex-row flex-wrap items-center gap-2 w-full text-xs">
                <span className="text-[#565E74] font-medium text-[13px]">Gợi ý kiểm tra:</span>
                <button
                  type="button"
                  onClick={() => handleSuggestionClick('vcb-digibank-xac-thuc-2025.com')}
                  className="bg-[#F1F5F9] hover:bg-blue-50 hover:text-[#004AC6] rounded-md py-1 px-2.5 text-[#0F172A] font-mono font-medium transition-colors cursor-pointer border border-slate-200/50"
                >
                  vcb-digibank-xac-thuc-2025.com
                </button>
                <button
                  type="button"
                  onClick={() => handleSuggestionClick('shopee-thuong-tet-sieusale.cc')}
                  className="bg-[#F1F5F9] hover:bg-blue-50 hover:text-[#004AC6] rounded-md py-1 px-2.5 text-[#0F172A] font-mono font-medium transition-colors cursor-pointer border border-slate-200/50"
                >
                  shopee-thuong-tet-sieusale.cc
                </button>
                <button
                  type="button"
                  onClick={() => handleSuggestionClick('https://vietcombank.com.vn')}
                  className="bg-[#F1F5F9] hover:bg-emerald-50 hover:text-emerald-700 rounded-md py-1 px-2.5 text-[#0F172A] font-mono font-medium transition-colors cursor-pointer border border-slate-200/50"
                >
                  vietcombank.com.vn (Chính chủ)
                </button>
              </div>

              {/* Security Privacy Guarantee */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pt-4 w-full border-t border-gray-100">
                <div className="flex flex-row items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0" />
                  <span className="text-[#434655] text-[13px]">
                    Không nhập OTP/mật khẩu. Lịch sử được lưu khi đăng nhập; nếu bật Gemini, nội dung sau bước che một số mẫu bí mật được gửi để giải thích.
                  </span>
                </div>
                <div className="bg-[#F1F5F9] rounded py-1 px-2.5 shrink-0 flex items-center gap-1.5">
                  <Lock className="w-3 h-3 text-[#565E74]" />
                  <span className="text-[#565E74] font-medium text-xs">Lưu lịch sử khi đăng nhập</span>
                </div>
              </div>
            </form>

            {/* LIVE SCAN RESULT CARD */}
            {scanResult && (
              <div className="mt-2 p-5 md:p-6 bg-slate-50/90 rounded-xl border border-slate-200 flex flex-col gap-5 animate-in fade-in slide-in-from-top-4 duration-200">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-200">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-mono font-semibold text-slate-500 uppercase tracking-wide">
                      Mục tiêu tra cứu:
                    </span>
                    <span className="text-base font-mono font-bold text-slate-900 break-all">
                      {scanResult.query}
                    </span>
                  </div>
                  <RiskGauge score={scanResult.riskScore} level={scanResult.level} size="md" />
                </div>

                {/* AI Reasoning */}
                {scanResult.aiReasoning && (
                  <div className="p-3.5 bg-blue-50/80 rounded-xl border border-blue-100 text-xs md:text-sm text-blue-900 flex items-start gap-2.5">
                    <Sparkles className="w-4 h-4 text-[#004AC6] shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Nhận định AI chuyên sâu: </span>
                      <span>{scanResult.aiReasoning}</span>
                    </div>
                  </div>
                )}
                {!!scanResult.evidenceSources?.length && <div className="rounded-lg border border-blue-100 bg-blue-50 p-3.5 text-xs md:text-sm text-blue-950">
                  <p className="font-semibold">Cảnh báo công khai có thủ đoạn tương đồng</p>
                  <ul className="mt-2 space-y-1">{scanResult.evidenceSources.map(source => <li key={source.url}><a className="underline" href={source.url} target="_blank" rel="noreferrer">{source.title}</a> · {source.sourceName} ({source.date})</li>)}</ul>
                  <p className="mt-2 text-xs">Tương đồng về thủ đoạn không xác nhận đối tượng cụ thể nằm trong danh sách đen.</p>
                </div>}

                {/* Detected Flags */}
                <div className="flex flex-col gap-2">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Dấu hiệu rủi ro nhận diện ({scanResult.flags.length})
                  </h4>
                  <div className="flex flex-col gap-2">
                    {scanResult.flags.map((flag, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg text-xs md:text-sm flex items-start gap-2.5 ${
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
                    Khuyến nghị an toàn tức thời
                  </h4>
                  <div className="flex flex-col gap-1.5">
                    {scanResult.recommendations.map((rec, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs md:text-sm text-slate-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#004AC6] mt-1.5 shrink-0" />
                        <span>{rec}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200 text-xs text-slate-500">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 font-mono">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      Thời gian xử lý: {scanResult.analysisTimeMs}ms
                    </span>
                    <span>•</span>
                    <span>Nguồn: {scanResult.source} • AI: {scanResult.aiStatus}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setReportModalOpen(true)}
                      className="text-red-600 hover:text-red-700 font-semibold flex items-center gap-1 transition-colors"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Báo cáo link này</span>
                    </button>
                    <button
                      onClick={clearScan}
                      className="px-3 py-1 bg-slate-200 hover:bg-slate-300 rounded-md font-semibold text-slate-700 transition-colors"
                    >
                      Đóng
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Explicit Note Under Tool */}
          <div className="mt-4 flex flex-row items-center gap-1.5 text-center">
            <HelpCircle className="w-3.5 h-3.5 text-[#565E74] shrink-0" />
            <span className="text-[#565E74] text-[13px]">
              Nếu đăng nhập, nội dung kiểm tra và kết quả được lưu vào lịch sử tài khoản. Không nhập mật khẩu, OTP hoặc thông tin bí mật.
            </span>
          </div>
        </div>
      </section>

      {/* Live Cyber Threat Intelligence Metrics Bar (VTrust-style Real-Time Radar) */}
      <ThreatMetricsBar />

      {/* How It Works Section (3 Steps with Cyber Connectors) */}
      <section className="w-full bg-white flex flex-col items-center py-16 md:py-20 px-4 md:px-12 border-b border-slate-100 relative">
        <div className="max-w-[1184px] w-full flex flex-col items-center gap-12 md:gap-16 relative">
          {/* Section Header */}
          <div className="flex flex-col items-center gap-2.5 max-w-[672px] text-center">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#004AC6] animate-pulse" />
              <span className="text-[#004AC6] font-bold text-xs uppercase tracking-wider">
                QUY TRÌNH VẬN HÀNH TỰ ĐỘNG
              </span>
            </div>
            <h2 className="text-[#0F172A] font-bold text-2xl md:text-4xl tracking-tight">
              Quy trình thẩm định chỉ trong 3 bước
            </h2>
            <p className="text-[#434655] text-sm md:text-base mt-1">
              Hệ thống dùng bộ quy tắc nhận diện và báo cáo cộng đồng đã duyệt; Gemini có thể bổ sung giải thích khi được cấu hình.
            </p>
          </div>

          {/* Steps Grid with Animated Data Flow Lines */}
          <div role="region" aria-label="Ba bước thẩm định" tabIndex={0} className="no-scrollbar relative grid w-full grid-flow-col auto-cols-[calc(100%_-_2.5rem)] gap-5 overflow-x-auto overscroll-x-contain scroll-smooth snap-x snap-mandatory pb-2 pt-1 md:grid-flow-row md:auto-cols-auto md:grid-cols-3 md:gap-8 md:overflow-visible md:snap-none md:pb-0 md:pt-0">
            
            {/* Step 1 */}
            <div className="group relative flex h-full min-w-0 snap-start flex-col items-start gap-5 rounded-2xl border border-slate-200/70 bg-[#F8FAFC] p-6 transition-all duration-300 hover:border-[#004AC6]/40 hover:shadow-lg md:p-8">
              <div className="relative">
                <div className="w-14 h-14 bg-[#EFF6FF] rounded-xl flex items-center justify-center mb-2 group-hover:scale-105 transition-transform duration-200">
                  <FileText className="w-6 h-6 text-[#004AC6]" />
                </div>
                <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#004AC6]/20 border border-[#004AC6] animate-ping" />
              </div>
              <span className="text-[#004AC6] font-mono font-bold text-xs uppercase tracking-wider">
                BƯỚC 01 // TIẾP NHẬN
              </span>
              <div className="flex flex-col gap-2">
                <h3 className="text-[#0F172A] font-bold text-lg group-hover:text-[#004AC6] transition-colors">
                  Dán đường dẫn hoặc tin nhắn
                </h3>
                <p className="text-[#434655] text-sm leading-relaxed">
                  Nhập liên kết đáng ngờ, số điện thoại lạ hoặc đoạn văn bản tin nhắn yêu cầu mã OTP, thông báo nhận tiền trúng thưởng.
                </p>
              </div>
              <div className="mt-auto pt-6 flex items-center gap-2">
                <button
                  onClick={() => {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                    const el = document.getElementById('search-input-box');
                    if (el) el.focus();
                  }}
                  className="text-[#004AC6] font-semibold text-xs tracking-wide flex items-center gap-1.5 hover:underline cursor-pointer"
                >
                  <span>Trải nghiệm thử</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>

            {/* Step 2 */}
            <div className="group relative flex h-full min-w-0 snap-start flex-col items-start gap-5 rounded-2xl border border-slate-200/70 bg-[#F8FAFC] p-6 transition-all duration-300 hover:border-[#004AC6]/40 hover:shadow-lg md:p-8">
              <div className="relative">
                <div className="w-14 h-14 bg-[#E5EEFF] rounded-xl flex items-center justify-center mb-2 group-hover:scale-105 transition-transform duration-200">
                  <Layers className="w-6 h-6 text-[#004AC6]" />
                </div>
                <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#004AC6]/20 border border-[#004AC6] animate-ping" />
              </div>
              <span className="text-[#004AC6] font-mono font-bold text-xs uppercase tracking-wider">
                BƯỚC 02 // PHÂN TÍCH RỦI RO
              </span>
              <div className="flex flex-col gap-2">
                <h3 className="text-[#0F172A] font-bold text-lg group-hover:text-[#004AC6] transition-colors">
                  Phân tích dấu hiệu
                </h3>
                <p className="text-[#434655] text-sm leading-relaxed">
                  Bộ quy tắc nhận diện dấu hiệu đáng ngờ và đối chiếu báo cáo cộng đồng đã duyệt. Kết quả chỉ mang tính tham khảo.
                </p>
              </div>
              <div className="mt-auto pt-6 flex items-center gap-2">
                <Link
                  to="/gioi-thieu"
                  className="text-[#004AC6] font-semibold text-xs tracking-wide flex items-center gap-1.5 hover:underline"
                >
                  <span>Xem cách AI hoạt động</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>

            {/* Step 3 */}
            <div className="group relative flex h-full min-w-0 snap-start flex-col items-start gap-5 rounded-2xl border border-slate-200/70 bg-[#F8FAFC] p-6 transition-all duration-300 hover:border-emerald-500/40 hover:shadow-lg md:p-8">
              <div className="relative">
                <div className="w-14 h-14 bg-[#D1FAE5] rounded-xl flex items-center justify-center mb-2 group-hover:scale-105 transition-transform duration-200">
                  <ShieldCheck className="w-8 h-8 text-[#059669]" />
                </div>
                <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500/20 border border-emerald-500 animate-ping" />
              </div>
              <span className="text-[#059669] font-mono font-bold text-xs uppercase tracking-wider">
                BƯỚC 03 // BẢO VỆ
              </span>
              <div className="flex flex-col gap-2">
                <h3 className="text-[#0F172A] font-bold text-lg group-hover:text-[#059669] transition-colors">
                  Nhận khuyến nghị bảo vệ
                </h3>
                <p className="text-[#434655] text-sm leading-relaxed">
                  Cảnh báo mức độ rủi ro, phân tích chi tiết thủ đoạn và hướng dẫn hành động cụ thể để bảo vệ tài sản, thông tin cá nhân.
                </p>
              </div>
              <div className="mt-auto pt-6 flex items-center gap-2">
                <Link
                  to="/canh-bao"
                  className="text-[#059669] font-semibold text-xs tracking-wide flex items-center gap-1.5 hover:underline"
                >
                  <span>Mẫu báo cáo</span>
                  <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </Link>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Interactive illustrative threat analysis showcase */}
      <CyberMobileShowcase />

      {/* Common Scams Section */}
      <section className="relative isolate w-full overflow-hidden bg-[linear-gradient(160deg,#F8FAFF_0%,#EEF4FB_52%,#F8FAFC_100%)] flex flex-col items-center py-16 md:py-24 px-4 md:px-12" aria-labelledby="common-scams-title">
        <div aria-hidden="true" className="pointer-events-none absolute -top-32 right-[-10%] h-96 w-96 rounded-full bg-blue-200/35 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-40 left-[-8%] h-96 w-96 rounded-full bg-rose-100/60 blur-3xl" />
        <div className="relative max-w-[1184px] w-full flex flex-col gap-9 md:gap-11">
          {/* Header */}
          <div className="flex flex-col lg:flex-row justify-between lg:items-end gap-6 w-full">
            <div className="flex flex-col items-start max-w-[720px]">
              <span className="inline-flex items-center gap-2 rounded-full border border-rose-200/80 bg-white/80 px-3 py-1.5 text-rose-600 shadow-sm text-[11px] font-bold uppercase tracking-[0.14em]">
                <span aria-hidden="true" className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-50" /><span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500" /></span>
                Cảnh báo thường trực
              </span>
              <h2 id="common-scams-title" className="mt-5 text-[#0F172A] font-extrabold text-3xl md:text-[40px] leading-[1.15] tracking-tight">
                Các hình thức lừa đảo phổ biến <span className="text-[#004AC6]">cần cảnh giác</span>
              </h2>
              <p className="mt-4 max-w-[650px] text-[#475569] text-sm md:text-base leading-relaxed">
                Các thủ đoạn tội phạm mạng liên tục thay đổi hình thức tiếp cận, nắm vững các dấu hiệu mấu chốt để không rơi vào cạm bẫy.
              </p>
            </div>
            <Link
              to="/canh-bao"
              className="group inline-flex w-fit shrink-0 items-center gap-2 rounded-full border border-blue-200 bg-white/85 px-4 py-2.5 text-[#004AC6] font-semibold text-sm shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-300 hover:bg-white hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              <span>Xem biểu đồ cảnh báo dữ liệu toàn quốc</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          {/* Common scam cards */}
          <div
            role="region"
            aria-label="Các hình thức lừa đảo phổ biến"
            tabIndex={0}
            className="no-scrollbar grid w-full grid-flow-col grid-rows-1 auto-cols-[calc(100%_-_2.5rem)] gap-5 overflow-x-auto overscroll-x-contain scroll-smooth snap-x snap-mandatory pb-2 pt-1 sm:grid-flow-row sm:grid-rows-none sm:auto-cols-auto sm:grid-cols-2 sm:overflow-visible sm:snap-none sm:pb-0 sm:pt-0 lg:grid-cols-4 lg:gap-6"
          >
            {SCAM_SCENARIOS.slice(0, 4).map((scam, index) => (
              <div
                key={scam.id}
                className="group relative flex h-full min-w-0 snap-start flex-col overflow-hidden rounded-[22px] border border-white/90 bg-white/95 p-5 lg:p-6 shadow-[0_8px_28px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70 transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_44px_rgba(15,23,42,0.13)] focus-within:-translate-y-1 focus-within:ring-blue-300"
              >
                <div aria-hidden="true" className={`absolute inset-x-0 top-0 h-1 transition-all duration-300 group-hover:h-1.5 ${scam.badgeColor === 'red' ? 'bg-gradient-to-r from-rose-500 to-orange-400' : scam.badgeColor === 'amber' ? 'bg-gradient-to-r from-amber-400 to-orange-400' : 'bg-gradient-to-r from-blue-600 to-cyan-400'}`} />
                <div className="flex flex-1 flex-col">
                  <div className="mb-5 flex items-start justify-between gap-3">
                    <div
                      className={`w-12 h-12 rounded-2xl flex shrink-0 items-center justify-center ring-1 ring-inset transition-transform duration-300 group-hover:rotate-[-5deg] group-hover:scale-110 ${
                        scam.badgeColor === 'red'
                          ? 'bg-rose-50 text-rose-600 ring-rose-100'
                          : scam.badgeColor === 'amber'
                          ? 'bg-amber-50 text-amber-600 ring-amber-100'
                          : 'bg-blue-50 text-[#004AC6] ring-blue-100'
                      }`}
                    >
                      {scam.iconType === 'bank' && <CreditCard className="w-5 h-5" />}
                      {scam.iconType === 'gift' && <Sparkles className="w-5 h-5" />}
                      {scam.iconType === 'job' && <FileText className="w-5 h-5" />}
                      {scam.iconType === 'police' && <ShieldCheck className="w-5 h-5" />}
                    </div>
                    <span aria-hidden="true" className="pt-1 text-xs font-bold tracking-[0.15em] text-slate-300">0{index + 1}</span>
                  </div>

                  <span className={`mb-3 w-fit max-w-full rounded-full px-2.5 py-1 text-[11px] font-bold leading-tight ${scam.badgeColor === 'red' ? 'bg-rose-50 text-rose-700' : scam.badgeColor === 'amber' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'}`}>
                    {scam.category}
                  </span>
                  <h3 className="min-h-[3.25rem] text-[#0F172A] font-bold text-lg leading-snug transition-colors group-hover:text-[#004AC6]">
                    {scam.title}
                  </h3>
                  <p className="mt-3 text-[#475569] text-[13px] leading-relaxed line-clamp-3">
                    {scam.summary}
                  </p>

                  <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50/80 p-3.5 transition-colors duration-300 group-hover:border-blue-100 group-hover:bg-blue-50/40">
                    <span className="text-[#64748B] font-bold text-[11px] uppercase tracking-wider block mb-1.5">
                      Dấu hiệu nhận diện:
                    </span>
                    <span className="text-[#0F172A] font-medium text-[13px] leading-relaxed">
                      {scam.signs}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedScenario(scam)}
                  className="mt-6 flex w-full cursor-pointer items-center justify-between rounded-xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-[#004AC6] text-sm font-semibold transition-all duration-300 hover:border-[#004AC6] hover:bg-[#004AC6] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                >
                  <span>Xem chi tiết kịch bản</span>
                  <ChevronRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <FeaturedWarnings />

      <AiChatShowcase />

      {/* Community Learning Hub */}
      <section className="w-full bg-white flex flex-col items-center py-16 md:py-20 px-4 md:px-12 border-b border-slate-100">
        <div className="max-w-[1184px] w-full bg-gradient-to-r from-[#0F172A] via-[#1E293B] to-[#0F172A] rounded-[24px] shadow-2xl p-8 md:p-14 relative overflow-hidden flex flex-col lg:flex-row justify-between items-center gap-10 md:gap-12">
          {/* Background aesthetic ring */}
          <div className="absolute w-[384px] h-[384px] -right-20 -bottom-20 bg-[#004AC6]/25 blur-[36px] rounded-full z-0 pointer-events-none" />

          {/* Left Content */}
          <div className="flex flex-col gap-4 max-w-[626px] z-10">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-full py-1 px-3 w-fit border border-white/10">
              <Sparkles className="w-4 h-4 text-[#85F8C4]" />
              <span className="text-[#85F8C4] font-bold text-xs tracking-wide uppercase">
                KHÓA HỌC TIÊU BIỂU
              </span>
            </div>

            <h2 className="text-white font-bold text-2xl md:text-4xl tracking-tight mt-2">
              Góc học tập kỹ năng tự vệ số CyberAware
            </h2>

            <p className="text-[#CBDBF5] text-sm md:text-base leading-relaxed mt-1">
              Các khóa đào tạo vi mô (Micro-learning) kéo dài 5-10 phút, được biên soạn dễ hiểu với ví dụ thực tiễn dành riêng cho người cao tuổi, phụ huynh và sinh viên học sinh. Tự bảo vệ ví điện tử và thông tin danh tính.
            </p>

            {/* Features Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3.5 gap-x-8 mt-3">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#059669] shrink-0" />
                <span className="text-white text-sm">Phòng thủ lừa đảo qua mạng xã hội</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#059669] shrink-0" />
                <span className="text-white text-sm">Cách nhận biết Video Deepfake AI</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#059669] shrink-0" />
                <span className="text-white text-sm">Bảo mật tài khoản ngân hàng số</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#059669] shrink-0" />
                <span className="text-white text-sm">Xử lý khủng hoảng khi lỡ click link độc</span>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex flex-row flex-wrap gap-4 mt-6">
              <Link
                to="/hoc-tap"
                className="flex items-center justify-center gap-2 py-3 px-8 bg-[#004AC6] hover:bg-blue-600 active:scale-98 text-white font-semibold text-sm rounded-xl shadow-[0_10px_15px_-3px_rgba(0,74,198,0.4)] transition-all"
              >
                <PlayCircle className="w-4 h-4" />
                <span>Khám phá khóa học</span>
              </Link>
              <a
                href="/cam-nang-an-toan-so-cyberaware.pdf"
                download="cam-nang-an-toan-so-cyberaware.pdf"
                className="flex items-center justify-center gap-2 py-3 px-6 bg-white/10 backdrop-blur-sm text-white font-semibold text-sm rounded-xl hover:bg-white/20 transition-colors border border-white/10 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Tải cẩm nang an toàn PDF</span>
              </a>
            </div>
          </div>

          {/* Visual Learning Card Right */}
          <div className="w-full max-w-[384px] bg-white rounded-2xl p-6 shadow-2xl z-10 flex flex-col gap-2 border border-slate-100">
            <div className="flex justify-between items-center w-full mb-1">
              <span className="text-[#004AC6] font-bold text-xs tracking-wide uppercase">
                BÀI HỌC TUẦN NÀY
              </span>
              <div className="bg-[#D1FAE5] rounded px-2 py-0.5">
                <span className="text-[#059669] font-bold text-xs tracking-wide">
                  MỚI CẬP NHẬT
                </span>
              </div>
            </div>

            {/* Video Thumbnail with Visual Graphic */}
            <button type="button" onClick={() => void openFeaturedVideo()} aria-label="Xem video nhận biết cuộc gọi mạo danh bằng giọng nói AI" className="w-full h-[184px] bg-slate-900 rounded-xl overflow-hidden relative mb-2 group cursor-pointer text-left">
              <img
                src="https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=800&q=80"
                alt="Video thumbnail"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-90"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-[#004AC6]/90 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <PlayCircle className="w-6 h-6 ml-0.5" />
                </div>
              </div>
              <div className="absolute bottom-2 right-2 bg-[#0F172A]/80 backdrop-blur-sm rounded px-2 py-1">
                <span className="text-white font-mono font-medium text-xs">04 PHÚT - 3 BÀI TẬP</span>
              </div>
            </button>

            <h4 className="text-[#0F172A] font-bold text-lg leading-snug">
              Nhận biết cuộc gọi mạo danh bằng giọng nói AI
            </h4>
            <p className="text-[#434655] text-[13px] leading-relaxed mb-3">
              Hướng dẫn cách đặt câu hỏi thử thách kiểm tra khi có người thân gọi xin chuyển tiền gấp.
            </p>

            {/* Progress Bar */}
            <div className="w-full h-2 bg-[#F1F5F9] rounded-full overflow-hidden mb-2">
              <div className="h-full bg-[#004AC6] w-[75%] rounded-full" />
            </div>
            <div className="flex justify-between items-center w-full">
              <span className="text-[#565E74] font-semibold text-xs">3.450 người đã học</span>
              <span className="text-[#565E74] font-semibold text-xs">Đánh giá: 4.9/5 ⭐</span>
            </div>
          </div>
        </div>
      </section>

      {videoOpen && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/85 p-3 backdrop-blur-sm sm:p-6" onMouseDown={event => { if (event.target === event.currentTarget) setVideoOpen(false); }}>
        <section role="dialog" aria-modal="true" aria-label="Video bài học tuần này" className="max-h-[90dvh] w-full max-w-5xl overflow-hidden rounded-2xl border border-white/15 bg-slate-900 shadow-2xl">
          <div className="flex items-start justify-between gap-4 px-4 py-4 sm:px-6">
            <div><span className="text-xs font-bold uppercase tracking-wide text-emerald-300">Video bài học tuần này</span><h2 className="mt-1 text-base font-bold text-white sm:text-xl">{featuredVideo?.title || 'Nhận biết cuộc gọi mạo danh bằng giọng nói AI'}</h2></div>
            <button type="button" onClick={() => setVideoOpen(false)} aria-label="Đóng video" className="shrink-0 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"><X className="h-5 w-5" /></button>
          </div>
          <div className="aspect-video max-h-[calc(90dvh-8rem)] w-full bg-black">
            {videoLoading ? <div role="status" className="flex h-full items-center justify-center text-sm text-white">Đang tải video…</div> : videoError ? <div role="alert" className="flex h-full items-center justify-center px-6 text-center text-sm text-white">{videoError}</div> : featuredVideo && <iframe className="h-full w-full" src={featuredVideo.embedUrl} title={featuredVideo.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen />}
          </div>
        </section>
      </div>}

      {/* Community Support & Report Banner */}
      <section className="w-full bg-[#F8FAFC] flex flex-col items-center py-12 md:py-16 px-4 md:px-12">
        <div className="max-w-[1184px] w-full bg-[#F1F5F9] rounded-2xl p-6 md:p-10 flex flex-col md:flex-row justify-between items-center gap-6 border border-slate-200/80">
          <div className="flex min-w-0 flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-5">
            <div className="w-14 h-14 bg-[#FEF3C7] rounded-full flex items-center justify-center shrink-0">
              <AlertTriangle className="w-7 h-7 text-[#D97706]" />
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="text-[#0F172A] font-bold text-xl">
                Bạn vừa phát hiện một đường link hoặc số điện thoại lừa đảo mới?
              </h3>
              <p className="text-[#434655] text-sm">
                Hãy gửi báo cáo cho CyberAware AI để hỗ trợ cộng đồng ngăn chặn kịp thời các mối đe dọa.
              </p>
            </div>
          </div>

          <button
            onClick={() => setReportModalOpen(true)}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#0F172A] px-4 py-3 text-center text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#1E293B] active:scale-98 cursor-pointer sm:w-auto sm:shrink-0 sm:px-6"
          >
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>Báo cáo lừa đảo ngay</span>
          </button>
        </div>
      </section>
      <ComingSoonDialog
        open={comingSoonType !== null}
        description={`Tính năng kiểm tra ${comingSoonType === 'phone' ? 'số điện thoại' : 'tài khoản ngân hàng'} sẽ sớm ra mắt.`}
        onClose={() => setComingSoonType(null)}
      />
    </div>
  );
};
