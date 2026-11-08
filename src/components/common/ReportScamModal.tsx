import React, { useState } from 'react';
import { X, AlertTriangle, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { ScanType } from '../../types';
import { notify } from './toast';

export const ReportScamModal: React.FC = () => {
  const { isReportModalOpen, setReportModalOpen, submitReport, error } = useAppStore();

  const [type, setType] = useState<ScanType>('url');
  const [target, setTarget] = useState('');
  const [category, setCategory] = useState('Giả mạo ngân hàng & OTP');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isReportModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!target.trim()) return;

    setIsSubmitting(true);
    const sent = await submitReport({
      type,
      target: target.trim(),
      category,
      description: description.trim() || 'Người dùng đóng góp cảnh báo lừa đảo mới phát hiện.',
    });
    setIsSubmitting(false);
    if (!sent) return;
    setSuccess(true);
    notify('Báo cáo đã được gửi và đang chờ duyệt.', 'success');
    setTimeout(() => {
      setSuccess(false);
      setTarget('');
      setDescription('');
      setReportModalOpen(false);
    }, 1400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
        onClick={() => setReportModalOpen(false)}
      />

      {/* Modal Dialog */}
      <div role="dialog" aria-modal="true" aria-label="Báo cáo trường hợp lừa đảo" className="relative z-10 max-h-[calc(100dvh-1.5rem)] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150 sm:p-6 md:p-8">
        <button
          onClick={() => setReportModalOpen(false)}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {success ? (
          <div className="flex flex-col items-center justify-center py-8 text-center gap-3">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Gửi báo cáo thành công!</h3>
            <p className="text-sm text-slate-600 max-w-sm">
              Báo cáo đã được lưu ở trạng thái chờ quản trị viên duyệt. Bạn có thể xem trong mục Báo cáo của tôi.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && <p role="alert" className="text-red-700">{error}</p>}
            <p className="text-xs text-slate-500">Cần đăng nhập để gửi. Không nhập mật khẩu, OTP hoặc thông tin riêng tư không cần thiết.</p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center text-red-600 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Báo cáo trường hợp lừa đảo</h3>
                <p className="text-xs text-slate-500">Giúp cộng đồng Việt Nam nhận diện và phòng tránh kịp thời</p>
              </div>
            </div>

            {/* Select Type */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700">Loại mục tiêu</label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  { id: 'url', label: 'Website / Link' },
                  { id: 'phone', label: 'Số điện thoại' },
                  { id: 'bank', label: 'STK Ngân hàng' },
                  { id: 'sms', label: 'Tin nhắn' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setType(item.id as ScanType)}
                    className={`py-2 px-1 text-xs font-semibold rounded-lg border transition-all text-center ${
                      type === item.id
                        ? 'bg-[#004AC6] text-white border-[#004AC6]'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Target Input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700">
                {type === 'url'
                  ? 'Đường dẫn link khả nghi (URL)'
                  : type === 'phone'
                  ? 'Số điện thoại gọi / nhắn lừa đảo'
                  : type === 'bank'
                  ? 'Số tài khoản & Tên ngân hàng nhận tiền'
                  : 'Nội dung tin nhắn / Đầu số SMS'}
              </label>
              <input
                type="text"
                required
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder={
                  type === 'url'
                    ? 'https://vcb-xac-thuc-online2026.com'
                    : type === 'phone'
                    ? '+84 987 654 321'
                    : type === 'bank'
                    ? '19038291028301 - TECHCOMBANK'
                    : 'Tin nhắn mạo danh thông báo trúng thưởng...'
                }
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#004AC6] focus:bg-white"
              />
            </div>

            {/* Category Select */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700">Hình thức lừa đảo</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#004AC6]"
              >
                <option value="Giả mạo ngân hàng & OTP">Giả mạo ngân hàng & OTP</option>
                <option value="Lừa đảo trúng thưởng tri ân">Lừa đảo trúng thưởng tri ân</option>
                <option value="Tuyển CTV việc nhẹ lương cao Shopee/TikTok">Tuyển CTV việc nhẹ lương cao Shopee/TikTok</option>
                <option value="Mạo danh Công an / Viện kiểm sát / Tòa án">Mạo danh Công an / Viện kiểm sát / Tòa án</option>
                <option value="Cuộc gọi Deepfake video & AI Voice">Cuộc gọi Deepfake video & AI Voice</option>
                <option value="Mạo danh cập nhật VNeID / Cổng dịch vụ công">Mạo danh cập nhật VNeID / Cổng dịch vụ công</option>
                <option value="Đầu tư tài chính / Tiền ảo / Sàn Forex lừa đảo">Đầu tư tài chính / Tiền ảo / Sàn Forex lừa đảo</option>
                <option value="Khác">Hình thức khác</option>
              </select>
            </div>

            {/* Description */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700">Mô tả chi tiết / Kịch bản kẻ gian tiếp cận</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ví dụ: Đối tượng gọi điện bảo tài khoản bị khóa trong 5 phút và gửi link yêu cầu điền OTP..."
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#004AC6] focus:bg-white resize-none"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReportModalOpen(false)}
                className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-xl transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-2.5 px-4 bg-[#004AC6] hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <span>Đang xử lý...</span>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Gửi báo cáo ngay</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
