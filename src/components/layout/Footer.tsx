import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, PhoneCall, ExternalLink, Lock } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

export const Footer: React.FC = () => {
  const { setReportModalOpen } = useAppStore();

  return (
    <footer className="w-full flex justify-center bg-white border-t border-slate-100 shadow-[0_1px_8px_rgba(0,0,0,0.04)] mt-auto z-10">
      <div className="w-full max-w-[1280px] flex flex-col p-8 md:p-12 gap-10">
        {/* Top Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-[1184px] mx-auto w-full">
          {/* Col 1 */}
          <div className="flex flex-col gap-3">
            <Link to="/" className="flex flex-row items-center gap-2 group">
              <div className="w-6 h-6 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-[#004AC6]" />
              </div>
              <span className="text-[#0F172A] font-bold text-lg">
                CyberAware <span className="text-[#004AC6]">AI</span>
              </span>
            </Link>
            <p className="text-[#434655] text-[13px] leading-relaxed">
              Nền tảng trí tuệ nhân tạo hỗ trợ xác minh rủi ro, phát hiện lừa đảo trực tuyến và phổ biến kiến thức an toàn số cho cộng đồng người Việt.
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
                <Lock className="w-3 h-3 text-emerald-600" />
                Không yêu cầu OTP
              </span>
            </div>
          </div>

          {/* Col 2 */}
          <div className="flex flex-col gap-4">
            <h4 className="text-[#0F172A] font-semibold text-sm">Tra cứu & Đánh giá</h4>
            <ul className="flex flex-col gap-2">
              <li>
                <Link to="/kiem-tra" className="text-[#434655] text-[13px] hover:text-[#004AC6] hover:underline transition-colors">
                  Xác minh Website / URL
                </Link>
              </li>
              <li>
                <Link to="/kiem-tra" className="text-[#434655] text-[13px] hover:text-[#004AC6] hover:underline transition-colors">
                  Kiểm tra Số điện thoại & STK
                </Link>
              </li>
              <li>
                <button
                  onClick={() => setReportModalOpen(true)}
                  className="text-left text-[#434655] text-[13px] hover:text-[#004AC6] hover:underline transition-colors"
                >
                  Báo cáo trường hợp lừa đảo
                </button>
              </li>
              <li>
                <Link to="/canh-bao" className="text-[#434655] text-[13px] hover:text-[#004AC6] hover:underline transition-colors">
                  Bản đồ cảnh báo toàn quốc
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3 */}
          <div className="flex flex-col gap-4">
            <h4 className="text-[#0F172A] font-semibold text-sm">Nâng cao nhận thức</h4>
            <ul className="flex flex-col gap-2">
              <li>
                <Link to="/hoc-tap" className="text-[#434655] text-[13px] hover:text-[#004AC6] hover:underline transition-colors">
                  Khóa học tự vệ không gian mạng
                </Link>
              </li>
              <li>
                <Link to="/canh-bao" className="text-[#434655] text-[13px] hover:text-[#004AC6] hover:underline transition-colors">
                  Tình huống cảnh báo thời sự
                </Link>
              </li>
              <li>
                <Link to="/hoc-tap" className="text-[#434655] text-[13px] hover:text-[#004AC6] hover:underline transition-colors">
                  Cách nhận biết Video Deepfake AI
                </Link>
              </li>
              <li>
                <Link to="/hoc-tap" className="text-[#434655] text-[13px] hover:text-[#004AC6] hover:underline transition-colors">
                  Cẩm nang ứng cứu 15 phút đầu
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4 */}
          <div className="flex flex-col gap-4">
            <h4 className="text-[#0F172A] font-semibold text-sm">Thông tin & Hỗ trợ</h4>
            <ul className="flex flex-col gap-2">
              <li>
                <Link to="/gioi-thieu" className="text-[#434655] text-[13px] hover:text-[#004AC6] hover:underline transition-colors">
                  Về dự án CyberAware AI
                </Link>
              </li>
              <li>
                <Link to="/gioi-thieu" className="text-[#434655] text-[13px] hover:text-[#004AC6] hover:underline transition-colors">
                  Điều khoản sử dụng dữ liệu
                </Link>
              </li>
              <li>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 mt-1">
                  <div className="flex items-center gap-2 text-red-600 font-bold text-xs">
                    <PhoneCall className="w-3.5 h-3.5" />
                    <span>ĐƯỜNG DÂY NÓNG KHẨN CẤP</span>
                  </div>
                  <p className="text-slate-800 font-mono font-bold text-sm mt-1">
                    156 <span className="text-xs font-normal text-slate-500">(Miễn phí cước)</span>
                  </p>
                  <p className="text-slate-500 text-[11px] mt-0.5">Tổng đài tiếp nhận phản ánh cuộc gọi & tin nhắn rác, lừa đảo.</p>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Area */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-8 border-t border-gray-100 max-w-[1184px] mx-auto w-full">
          <span className="text-[#434655] text-[13px] text-center md:text-left">
            © 2026 CyberAware AI. Phát triển vì an toàn số cộng đồng Việt Nam.
          </span>
          <span className="text-[#565E74] font-medium text-xs text-center md:text-right tracking-wide max-w-xl">
            Hệ thống cung cấp điểm rủi ro tham khảo từ bộ quy tắc và báo cáo CyberAware đã duyệt; chưa kết nối cơ sở dữ liệu NCSC.
          </span>
        </div>
      </div>
    </footer>
  );
};
