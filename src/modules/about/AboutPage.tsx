import React from 'react';
import {
  ShieldCheck,
  Cpu,
  Lock,
  PhoneCall,
  Users,
  CheckCircle2,
  ExternalLink,
  Award,
} from 'lucide-react';

export const AboutPage: React.FC = () => {
  return (
    <div className="w-full flex flex-col items-center py-8 md:py-12 px-4 md:px-12 max-w-[1280px] mx-auto">
      {/* Hero */}
      <div className="flex flex-col items-center text-center max-w-3xl mb-12">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-[#004AC6] text-xs font-bold mb-3 border border-blue-200">
          <ShieldCheck className="w-4 h-4" />
          <span>VỀ DỰ ÁN CYBERAWARE AI</span>
        </div>
        <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 tracking-tight">
          Bảo vệ tương lai số cho mọi gia đình Việt Nam
        </h1>
        <p className="text-slate-600 text-sm md:text-base mt-3 leading-relaxed">
          CyberAware AI là sáng kiến công nghệ ứng dụng trí tuệ nhân tạo thế hệ mới (AI/LLM) nhằm hỗ trợ người dân thẩm định rủi ro tức thời, nâng cao nhận thức và ngăn chặn lừa đảo mạng trước khi thiệt hại xảy ra.
        </p>
      </div>

      {/* 3 Pillars Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mb-16">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm flex flex-col gap-4">
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-[#004AC6]">
            <Cpu className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Mô hình AI Đa tầng</h3>
          <p className="text-slate-600 text-sm leading-relaxed">
            Kết hợp bộ quy tắc phân tích đầu vào và báo cáo cộng đồng đã duyệt. Gemini có thể bổ sung giải thích khi được cấu hình. Hệ thống chưa kết nối danh sách đen của cơ quan chức năng.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm flex flex-col gap-4">
          <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Quyền riêng tư rõ ràng</h3>
          <p className="text-slate-600 text-sm leading-relaxed">
            Khi đăng nhập, hệ thống lưu nội dung kiểm tra và kết quả vào lịch sử tài khoản. Khách không được lưu nội dung kiểm tra trong lịch sử. Không nhập mật khẩu hoặc OTP; nếu bật Gemini, nội dung sau bước che một số mẫu bí mật sẽ được gửi để tạo phần giải thích.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm flex flex-col gap-4">
          <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Sức mạnh Cộng đồng</h3>
          <p className="text-slate-600 text-sm leading-relaxed">
            Báo cáo được lưu và chuyển tới quản trị viên kiểm duyệt trước khi công khai. Số liệu trên trang chủ được tính từ hoạt động thực tế của ứng dụng.
          </p>
        </div>
      </div>

      {/* Emergency Hotlines Directory */}
      <div className="w-full bg-slate-900 text-white rounded-3xl p-8 md:p-12 shadow-2xl flex flex-col gap-8 mb-16">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-red-400 text-xs font-bold uppercase tracking-wider">
            <PhoneCall className="w-4 h-4" />
            <span>DANH BẠ CỨU HỘ & TỔNG ĐÀI KHẨN CẤP QUỐC GIA</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
            Khi phát hiện bị lừa đảo hoặc nghi ngờ tấn công mạng
          </h2>
          <p className="text-slate-400 text-sm">
            Hãy liên hệ ngay với các cơ quan chuyên trách để được hướng dẫn phong tỏa tài khoản và thụ lý đơn trình báo.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col gap-2">
            <span className="text-xs text-slate-400 font-semibold uppercase">Bộ Thông tin và Truyền thông</span>
            <h4 className="text-xl font-bold text-emerald-400 font-mono">Tổng đài 156 / 5656</h4>
            <p className="text-xs text-slate-300">Tiếp nhận phản ánh cuộc gọi rác, cuộc gọi lừa đảo mạo danh cơ quan nhà nước.</p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col gap-2">
            <span className="text-xs text-slate-400 font-semibold uppercase">Cục An ninh mạng & PCTP Công nghệ cao (A05)</span>
            <h4 className="text-xl font-bold text-blue-400 font-mono">069 234 3640</h4>
            <p className="text-xs text-slate-300">Bộ Công An tiếp nhận tố giác tội phạm sử dụng công nghệ cao chiếm đoạt tài sản.</p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col gap-2">
            <span className="text-xs text-slate-400 font-semibold uppercase">Trung tâm Giám sát An toàn không gian mạng (NCSC)</span>
            <h4 className="text-xl font-bold text-amber-400 font-mono">canhbao.ncsc.gov.vn</h4>
            <p className="text-xs text-slate-300">Cổng tiếp nhận báo cáo trang web lừa đảo, tấn công mạng trên toàn quốc.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
