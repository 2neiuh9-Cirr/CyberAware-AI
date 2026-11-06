import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Radio,
  FileCode,
  Scan,
  CheckCircle,
  ExternalLink,
  ChevronRight,
  ArrowRight,
  Lock,
  Zap,
} from 'lucide-react';
import { Link } from 'react-router-dom';

type ShowcaseMode = 'sms' | 'url' | 'deepfake' | 'apk';

interface ModeDetail {
  id: ShowcaseMode;
  label: string;
  badge: string;
  badgeColor: string;
  icon: any;
  targetSubject: string;
  threatType: string;
  riskLevel: 'RẤT NGUY HIỂM' | 'RỦI RO CAO' | 'ĐE DỌA TÂM LÝ';
  riskScore: number;
  modeLabel: string;
  summary: string;
  indicators: string[];
  countermeasure: string;
}

const MODES: ModeDetail[] = [
  {
    id: 'sms',
    label: 'SMS giả mạo thương hiệu',
    badge: 'Nguy cơ lộ OTP',
    badgeColor: 'bg-red-50 text-red-600 border-red-200',
    icon: Radio,
    targetSubject: '[Ngân hàng] - Cảnh báo bảo mật 14:15 (minh họa)',
    threatType: 'Trạm phát sóng giả (Fake BTS Cell) mạo danh luồng ngân hàng',
    riskLevel: 'RẤT NGUY HIỂM',
    riskScore: 98,
    modeLabel: 'Mô phỏng',
    summary:
      'Ví dụ mô phỏng tin nhắn mạo danh ngân hàng, dùng cảnh báo giao dịch để dụ người nhận mở liên kết và cung cấp thông tin đăng nhập.',
    indicators: [
      'Người gửi tự xưng là ngân hàng nhưng chưa được xác minh qua kênh chính thức',
      'Đường dẫn minh họa: ngan-hang-xac-minh.example',
      'Tạo áp lực phải thao tác nhanh để người nhận không kịp kiểm tra',
    ],
    countermeasure:
      'Không mở liên kết lạ; tự mở ứng dụng ngân hàng hoặc gọi số trên thẻ/kênh chính thức.',
  },
  {
    id: 'url',
    label: 'Website Phishing (Giả lập SSL)',
    badge: 'Đánh cắp tài khoản',
    badgeColor: 'bg-amber-50 text-amber-600 border-amber-200',
    icon: FileCode,
    targetSubject: 'https://cong-dich-vu-xac-minh.example/cap-nhat',
    threatType: 'Tên miền Homograph Spoofing & Ký tự đồng hình',
    riskLevel: 'RẤT NGUY HIỂM',
    riskScore: 94,
    modeLabel: 'Mô phỏng',
    summary:
      'Ví dụ mô phỏng trang giả mạo dịch vụ công, dùng tên miền gây nhầm lẫn và yêu cầu người dùng nhập thông tin cá nhân.',
    indicators: [
      'Tên miền không khớp địa chỉ được công bố trên kênh chính thức',
      'Trang yêu cầu nhập thông tin định danh không cần thiết',
      'Nội dung thúc giục xác minh hoặc cập nhật ngay qua liên kết',
    ],
    countermeasure:
      'Tự tìm địa chỉ dịch vụ từ cổng thông tin chính thức; không dựa riêng vào HTTPS hay biểu tượng ổ khóa để xác minh.',
  },
  {
    id: 'deepfake',
    label: 'Cuộc gọi Deepfake AI',
    badge: 'Thao túng tâm lý',
    badgeColor: 'bg-purple-50 text-purple-600 border-purple-200',
    icon: Scan,
    targetSubject: 'Cuộc gọi video từ người tự xưng là cán bộ (minh họa)',
    threatType: 'Hoán đổi khuôn mặt thời gian thực & Nhân bản giọng nói AI',
    riskLevel: 'ĐE DỌA TÂM LÝ',
    riskScore: 91,
    modeLabel: 'Mô phỏng',
    summary:
      'Ví dụ mô phỏng cuộc gọi dùng hình ảnh/giọng nói giả mạo để gây áp lực, yêu cầu giữ bí mật hoặc chuyển tiền.',
    indicators: [
      'Người gọi đòi cung cấp thông tin nhạy cảm hoặc chuyển tiền để “xác minh”',
      'Yêu cầu giữ bí mật, không cho phép bạn tự kiểm tra với người thân/cơ quan',
      'Hình ảnh và giọng nói qua video không đủ để xác nhận danh tính',
    ],
    countermeasure:
      'Tạm dừng cuộc gọi, không chuyển tiền; tự liên hệ cơ quan hoặc người thân qua số liên lạc đã biết trước.',
  },
  {
    id: 'apk',
    label: 'Mã độc APK núp bóng',
    badge: 'Kiểm soát thiết bị',
    badgeColor: 'bg-blue-50 text-[#004AC6] border-blue-200',
    icon: Smartphone,
    targetSubject: 'DichVuCong_CapNhat.apk (tên tệp minh họa)',
    threatType: 'Mã độc Trojan đánh cắp mã OTP & Chiếm quyền Trợ năng',
    riskLevel: 'RẤT NGUY HIỂM',
    riskScore: 99,
    modeLabel: 'Mô phỏng',
    summary:
      'Ví dụ mô phỏng ứng dụng ngoài kho chính thức yêu cầu quyền truy cập rộng, có thể bị lợi dụng để đọc dữ liệu hoặc điều khiển thiết bị.',
    indicators: [
      'Yêu cầu quyền Android Accessibility Service (Đọc màn hình & Tự động chạm)',
      'Ứng dụng yêu cầu quyền Trợ năng hoặc quyền quản trị không phù hợp chức năng',
      'Được gửi qua liên kết/tệp cài đặt thay vì kho ứng dụng chính thức',
    ],
    countermeasure:
      'Không cài tệp lạ hoặc cấp quyền không cần thiết; nếu đã cài, ngắt kết nối và liên hệ ngân hàng nếu có nguy cơ lộ thông tin tài chính.',
  },
];

export const CyberMobileShowcase: React.FC = () => {
  const [activeMode, setActiveMode] = useState<ShowcaseMode>('sms');
  const [isScanning, setIsScanning] = useState(false);
  const current = MODES.find((m) => m.id === activeMode) || MODES[0];

  // Trigger scan animation whenever mode changes
  useEffect(() => {
    setIsScanning(true);
    const timer = setTimeout(() => setIsScanning(false), 900);
    return () => clearTimeout(timer);
  }, [activeMode]);

  return (
    <section className="w-full bg-gradient-to-b from-white via-[#F8FAFC] to-[#F1F5F9] py-16 md:py-24 px-4 sm:px-6 lg:px-12 border-b border-slate-200/80 relative overflow-hidden">
      {/* Background Cyber Waves & Ambient Lights */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-blue-500/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute -left-20 top-1/3 w-80 h-80 bg-emerald-500/5 blur-[100px] rounded-full pointer-events-none" />

      <div className="max-w-[1240px] mx-auto w-full flex flex-col items-center relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl flex flex-col items-center mb-12 md:mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200/80 text-[#004AC6] text-xs font-bold tracking-wide uppercase mb-3">
            <span className="w-2 h-2 rounded-full bg-[#004AC6] animate-pulse" />
            <span>MÔ PHỎNG TƯƠNG TÁC</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Khám phá cách CyberAware AI <span className="text-[#004AC6]">nhận diện dấu hiệu lừa đảo</span>
          </h2>
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed mt-4 max-w-2xl">
            Chọn một tình huống mẫu để xem các dấu hiệu đáng ngờ và cách xử lý an toàn. Đây là nội dung minh họa; kết quả kiểm tra thật được tạo tại trang thẩm định.
          </p>

          {/* Interactive Mode Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mt-8 p-1.5 bg-slate-200/60 backdrop-blur-md rounded-2xl max-w-full">
            {MODES.map((mode) => {
              const Icon = mode.icon;
              const isActive = activeMode === mode.id;
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setActiveMode(mode.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'bg-white text-[#004AC6] shadow-sm scale-[1.02]'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#004AC6]' : 'text-slate-400'}`} />
                  <span>{mode.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Showcase Layout: Phone Device Mockup & Diagnostic Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center w-full">
          
          {/* Left/Center Column: Realistic Flagship Phone Mockup (5 cols) */}
          <div className="lg:col-span-5 flex justify-center relative">
            
            {/* Ambient Shadow & Radar Rings */}
            <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/10 via-emerald-500/10 to-indigo-500/10 rounded-[48px] blur-2xl -z-10" />

            {/* Mobile Device Chassis */}
            <div className="w-[310px] sm:w-[340px] bg-slate-900 rounded-[44px] p-3.5 shadow-2xl border-[5px] border-slate-800 relative overflow-hidden transition-all duration-300">
              
              {/* Device Notch / Dynamic Island */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 w-28 h-5 bg-black rounded-full z-40 flex items-center justify-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-700" />
                <span className="w-2 h-2 rounded-full bg-emerald-500/80 animate-pulse" />
              </div>

              {/* Laser Scan Beam Effect */}
              <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#22d3ee] z-30 pointer-events-none animate-scan-line" />

              {/* Device Screen Content */}
              <div className="bg-[#0B1528] rounded-[36px] pt-8 pb-5 px-4 text-white min-h-[580px] flex flex-col justify-between relative overflow-hidden">
                
                {/* Background gridlines for cyber feel */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />

                {/* Top Status inside Phone */}
                <div className="relative z-10 flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1 pb-3 border-b border-slate-800/80">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                    <span>CYBER SHIELD ACTIVE</span>
                  </div>
                  <span className="text-cyan-400 font-bold">{current.modeLabel}</span>
                </div>

                {/* Threat Simulation Card inside Phone */}
                <div className="relative z-10 flex flex-col gap-3 my-auto">
                  
                  {/* Alert Header Pill */}
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wider uppercase bg-red-500/20 text-red-400 border border-red-500/40">
                      <ShieldAlert className="w-3 h-3 text-red-400" />
                      {current.riskLevel}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      Điểm minh họa: <span className="text-red-400 font-bold">{current.riskScore}/100</span>
                    </span>
                  </div>

                  {/* Target Subject Box */}
                  <div className="p-3 bg-slate-900/90 rounded-2xl border border-slate-800 text-xs">
                    <span className="text-[10px] uppercase font-mono text-slate-400 block mb-1">
                      Mục tiêu đang thẩm định:
                    </span>
                    <p className="font-mono text-slate-200 text-[11px] break-all leading-tight">
                      {current.targetSubject}
                    </p>
                  </div>

                  {/* Threat Analysis Radar Gauge Graphic */}
                  <div className="p-4 bg-gradient-to-b from-slate-900/90 to-slate-950/90 rounded-2xl border border-red-500/30 flex flex-col items-center gap-3 relative overflow-hidden">
                    <div className="w-24 h-24 rounded-full border-2 border-red-500/40 relative flex items-center justify-center">
                      <div className="absolute inset-1 rounded-full border border-dashed border-red-400/50 animate-radar-spin" />
                      <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
                        <AlertTriangle className="w-8 h-8 text-red-400 animate-bounce" />
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-bold text-red-400 leading-tight">
                        {current.threatType}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Ví dụ mô phỏng, không phải kết quả quét thật
                      </p>
                    </div>
                  </div>

                  {/* Quick Action inside Phone */}
                  <div className="p-3 rounded-xl bg-red-950/40 border border-red-900/50 text-[11px] text-red-200 flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <p className="leading-tight">
                      Gợi ý an toàn: <span className="text-white font-bold">Dừng thao tác</span> và không chia sẻ mã OTP cho bất kỳ ai.
                    </p>
                  </div>
                </div>

                {/* Bottom Bar inside Phone */}
                <div className="relative z-10 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Lock className="w-3 h-3 text-emerald-400" /> Dữ liệu tình huống mẫu
                  </span>
                  <span className="text-cyan-400 font-semibold">Giao diện minh họa</span>
                </div>

              </div>

            </div>

            {/* Floating Telemetry Badge Left */}
            <div className="hidden sm:flex absolute -left-8 top-1/4 bg-white/95 backdrop-blur-md p-3.5 rounded-2xl shadow-xl border border-slate-200/80 flex-col gap-1 max-w-[190px] animate-cyber-float z-20">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-xs font-bold text-slate-900">Tình huống giả lập</span>
              </div>
              <p className="text-[11px] text-slate-600">
                Các thông tin hiển thị là ví dụ, không phải kết quả tra cứu trực tiếp.
              </p>
            </div>

            {/* Floating Telemetry Badge Right */}
            <div className="hidden sm:flex absolute -right-8 bottom-1/4 bg-white/95 backdrop-blur-md p-3.5 rounded-2xl shadow-xl border border-slate-200/80 flex-col gap-1 max-w-[200px] animate-cyber-float-reverse z-20">
              <div className="flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-xs font-bold text-slate-900">Dữ liệu minh họa</span>
              </div>
              <p className="text-[11px] text-slate-600">
                Không hiển thị danh sách số điện thoại, tài khoản hoặc website đang bị cảnh báo.
              </p>
            </div>

          </div>

          {/* Right Column: In-depth Technical Diagnostic Breakdown (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            
            {/* Header Badge */}
            <div className="flex flex-wrap items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${current.badgeColor}`}>
                {current.badge}
              </span>
              <span className="text-xs font-mono text-slate-500">
                Chế độ {current.modeLabel.toLowerCase()}
              </span>
            </div>

            {/* Title & Description */}
            <div className="space-y-2">
              <h3 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight leading-snug">
                {current.threatType}
              </h3>
              <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                {current.summary}
              </p>
            </div>

            {/* Key Indicators Checklist */}
            <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200/80 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#004AC6]" />
                Dấu hiệu trong tình huống mẫu
              </h4>
              <div className="space-y-3">
                {current.indicators.map((ind, idx) => (
                  <div key={idx} className="flex items-start gap-3 text-xs sm:text-sm text-slate-700">
                    <div className="w-5 h-5 rounded-full bg-red-50 text-red-600 flex items-center justify-center shrink-0 mt-0.5 font-bold text-[11px]">
                      {idx + 1}
                    </div>
                    <span className="leading-snug">{ind}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Protective Action Recommendation */}
            <div className="bg-emerald-50/70 rounded-2xl p-4 sm:p-5 border border-emerald-200 flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h5 className="text-sm font-bold text-emerald-900">
                  Biện pháp phòng ngừa khuyến nghị:
                </h5>
                <p className="text-xs sm:text-sm text-emerald-800 leading-relaxed">
                  {current.countermeasure}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                to="/kiem-tra"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#004AC6] hover:bg-blue-700 text-white font-bold text-sm shadow-sm transition-all hover:-translate-y-0.5 cursor-pointer"
              >
                <span>Thẩm định ngay nội dung của bạn</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/canh-bao"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white hover:bg-slate-100 text-slate-800 font-bold text-sm border border-slate-200 shadow-2xs transition-all cursor-pointer"
              >
                <span>Xem thư viện cảnh báo</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </Link>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
};
