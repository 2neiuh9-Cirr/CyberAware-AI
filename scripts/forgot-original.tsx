import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();

  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);
  const [requestError, setRequestError] = useState('');
  const [requestSubmitted, setRequestSubmitted] = useState(false);
  const [deliveryMode, setDeliveryMode] = useState<'email' | 'local'>('email');
  const [resetLinkReady, setResetLinkReady] = useState(false);

  // Step 3 state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const checkResetLink = async () => {
    try {
      const response = await fetch('/api/auth/reset-password/status', { credentials: 'same-origin' });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Liên kết khôi phục không hợp lệ hoặc đã hết hạn.');
      setResetLinkReady(true);
      setRequestError('');
      setActiveStep(3);
    } catch (error) {
      setResetLinkReady(false);
      setRequestError(error instanceof Error ? error.message : 'Không thể xác minh liên kết khôi phục.');
    }
  };

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('reset') === 'ready') void checkResetLink();
  }, []);

  // Password criteria for Step 3
  const hasLength = newPassword.length >= 8;
  const hasUpperAndLower = /[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);

  let score = 0;
  if (hasLength) score++;
  if (hasUpperAndLower) score++;
  if (hasNumber) score++;
  if (hasSpecial) score++;

  let strengthPercent = '10%';
  let strengthColor = 'bg-red-500';
  let strengthText = 'Rất yếu (10%)';
  let strengthTextColor = 'text-red-600';

  if (newPassword.length > 0) {
    if (score <= 1) {
      strengthPercent = '25%';
      strengthColor = 'bg-red-500';
      strengthText = 'Yếu (25%)';
      strengthTextColor = 'text-red-600';
    } else if (score === 2) {
      strengthPercent = '50%';
      strengthColor = 'bg-amber-500';
      strengthText = 'Trung bình (50%)';
      strengthTextColor = 'text-amber-600';
    } else if (score === 3) {
      strengthPercent = '75%';
      strengthColor = 'bg-[#004AC6]';
      strengthText = 'Khá mạnh (75%)';
      strengthTextColor = 'text-[#004AC6]';
    } else {
      strengthPercent = '100%';
      strengthColor = 'bg-emerald-500';
      strengthText = 'Rất mạnh (100%)';
      strengthTextColor = 'text-emerald-600';
    }
  }

  const handleSendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryEmail) return;

    setIsSending(true);
    setRequestError('');
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: recoveryEmail }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Không thể gửi yêu cầu khôi phục.');
      setDeliveryMode(data.deliveryMode === 'local' ? 'local' : 'email');
      setRequestSubmitted(true);
      setActiveStep(2);
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : 'Không thể kết nối máy chủ. Vui lòng thử lại.');
    } finally {
      setIsSending(false);
    }
  };

  const handleResend = async () => {
    setResendStatus('sending');
    setRequestError('');
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: recoveryEmail }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Không thể gửi lại liên kết.');
      setDeliveryMode(data.deliveryMode === 'local' ? 'local' : 'email');
      setResendStatus('sent');
    } catch (error) {
      setResendStatus('error');
      setRequestError(error instanceof Error ? error.message : 'Không thể kết nối máy chủ. Vui lòng thử lại.');
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordError('Mật khẩu xác nhận không trùng khớp. Vui lòng kiểm tra lại.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('Mật khẩu phải có ít nhất 8 ký tự.');
      return;
    }

    setPasswordError('');
    setIsUpdating(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ email: recoveryEmail, newPassword }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Không thể đặt lại mật khẩu.');
      setResetLinkReady(false);
      setUpdateSuccess(true);
      setTimeout(() => navigate('/dang-nhap'), 1500);
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : 'Không thể kết nối máy chủ. Vui lòng thử lại.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="w-full flex-grow flex flex-col justify-center items-center p-4 sm:p-6 bg-[#F8FAFC]">
      <div className="flex flex-col w-full max-w-[1200px] mx-auto py-4 sm:py-8">
        {/* Top Navigation & Return Link */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6 sm:mb-8 px-2 sm:px-4">
          <Link
            to="/dang-nhap"
            className="inline-flex items-center gap-2 text-[#004AC6] font-semibold text-sm hover:text-blue-700 transition-colors"
          >
            <span className="material-symbols-outlined text-lg">arrow_back</span>
            <span>Quay lại màn hình Đăng nhập</span>
          </Link>
          <div className="flex items-center gap-2 bg-blue-50/80 px-3.5 py-1.5 rounded-full text-slate-600 font-mono text-xs border border-blue-100">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Hệ thống bảo vệ CyberAware AI • SSL 256-bit</span>
          </div>
        </div>

        {/* Main Asymmetric Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Interactive Step Container */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            {/* Interactive Step Controller / Progress Tab */}
            <div className="bg-white rounded-2xl p-2 shadow-sm border border-slate-200/80 flex items-center justify-between gap-1 overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveStep(1)}
                className={`flex-1 py-2.5 px-3 rounded-xl text-center transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeStep === 1
                    ? 'bg-[#004AC6] text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                  activeStep === 1 ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  1
                </span>
                <span className="text-xs sm:text-sm font-semibold whitespace-nowrap">Gửi yêu cầu</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveStep(2)}
                disabled={!requestSubmitted}
                className={`flex-1 py-2.5 px-3 rounded-xl text-center transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeStep === 2
                    ? 'bg-[#004AC6] text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                  activeStep === 2 ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  2
                </span>
                <span className="text-xs sm:text-sm font-semibold whitespace-nowrap">Kiểm tra hộp thư</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveStep(3)}
                disabled={!resetLinkReady}
                className={`flex-1 py-2.5 px-3 rounded-xl text-center transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeStep === 3
                    ? 'bg-[#004AC6] text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                  activeStep === 3 ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  3
                </span>
                <span className="text-xs sm:text-sm font-semibold whitespace-nowrap">Mật khẩu mới</span>
              </button>
            </div>

            {/* State 1: Request Password Reset Form */}
            {activeStep === 1 && (
              <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200/80 flex flex-col transition-all animate-in fade-in duration-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-[#004AC6]">
                    <span className="material-symbols-outlined text-2xl">lock_reset</span>
                  </div>
                  <span className="text-xs text-[#004AC6] font-bold uppercase tracking-wider">
                    Xác thực người dùng
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight mb-2">
                  Khôi phục mật khẩu
                </h1>
                <p className="text-sm text-slate-600 mb-8 leading-relaxed">
                  Nhập địa chỉ email liên kết với tài khoản của bạn để nhận liên kết đặt lại mật khẩu an toàn theo quy chuẩn bảo mật công dân số.
                </p>

                <form className="flex flex-col gap-5" onSubmit={handleSendLink}>
                  {requestError && <p role="alert" className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">{requestError}</p>}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-[#0F172A] uppercase tracking-wide flex items-center justify-between" htmlFor="recoveryEmail">
                      <span>Địa chỉ Email</span>
                      <span className="text-slate-400 font-normal lowercase">Bắt buộc</span>
                    </label>
                    <div className="relative flex items-center">
                      <span className="material-symbols-outlined absolute left-3.5 text-slate-400 pointer-events-none text-xl">
                        alternate_email
                      </span>
                      <input
                        className="w-full h-13 pl-11 pr-4 rounded-xl bg-slate-50 text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#004AC6] border border-slate-200 transition-all shadow-xs"
                        id="recoveryEmail"
                        placeholder="vidu@chinhquyen.vn hoặc canhan@gmail.com"
                        required
                        type="email"
                        value={recoveryEmail}
                        onChange={(e) => setRecoveryEmail(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-4 flex items-start gap-3 border border-slate-100">
                    <span className="material-symbols-outlined text-[#004AC6] text-xl mt-0.5 shrink-0">
                      verified_user
                    </span>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Liên kết đặt lại mật khẩu có hiệu lực trong 15 phút và chỉ dùng được một lần. Hãy hoàn tất việc đặt mật khẩu trong trình duyệt mở liên kết.
                    </p>
                  </div>

                  <button
                    disabled={isSending}
                    className="mt-2 w-full h-12 bg-[#004AC6] hover:bg-blue-700 active:scale-[0.99] disabled:opacity-50 text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                    type="submit"
                  >
                    {isSending ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Đang mã hóa yêu cầu...</span>
                      </>
                    ) : (
                      <>
                        <span>Gửi liên kết khôi phục</span>
                        <span className="material-symbols-outlined text-lg">arrow_forward</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* State 2: Confirmation / Success Card */}
            {activeStep === 2 && (
              <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200/80 flex flex-col transition-all animate-in fade-in duration-200">
                <div className="flex items-center justify-between mb-6">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                    <span className="material-symbols-outlined text-3xl">mark_email_read</span>
                  </div>
                  <span className="bg-emerald-50 text-emerald-700 text-xs px-3 py-1 rounded-full flex items-center gap-1.5 font-bold border border-emerald-200">
                    <span className="material-symbols-outlined text-sm">check_circle</span>
                    Đã nhận yêu cầu
                  </span>
                </div>

                <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] mb-2">
                  Kiểm tra hướng dẫn khôi phục
                </h2>
                <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                  Nếu email có tài khoản, hãy mở liên kết khôi phục trong hộp thư đến hoặc thư rác. Liên kết có hiệu lực trong 15 phút.
                </p>

                {deliveryMode === 'local' && (
                  <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
                    Máy chủ đang chạy thử và chưa cấu hình gửi email. Liên kết được ghi trong tệp <code>data/dev-reset-links.log</code> của dự án.
                  </p>
                )}
                {requestError && <p role="alert" className="text-sm text-red-700 mb-4">{requestError}</p>}

                {/* Recovery request details */}
                <div className="bg-slate-50 rounded-xl p-5 mb-6 flex flex-col gap-3 border border-slate-200/80">
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-slate-500 font-medium">Hộp thư nhận:</span>
                    <span className="font-mono text-[#0F172A] font-bold">{recoveryEmail}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-slate-500 font-medium">Thời gian hiệu lực:</span>
                    <span className="font-mono text-red-600 font-bold">15 phút kể từ lúc gửi</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <button
                    className="w-full sm:flex-1 h-12 bg-[#004AC6] hover:bg-blue-700 text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                    onClick={() => void checkResetLink()}
                    type="button"
                  >
                    <span>Tôi đã mở liên kết khôi phục</span>
                    <span className="material-symbols-outlined text-lg">open_in_new</span>
                  </button>
                  <button
                    className="w-full sm:w-auto px-5 h-12 bg-slate-100 hover:bg-slate-200 text-[#0F172A] font-semibold text-sm rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    onClick={handleResend}
                    disabled={resendStatus === 'sending'}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-lg">
                      {resendStatus === 'sending' ? 'sync' : resendStatus === 'sent' ? 'check' : 'refresh'}
                    </span>
                    <span>
                      {resendStatus === 'sending' ? 'Đang gửi...' : resendStatus === 'sent' ? 'Đã gửi lại!' : 'Gửi lại liên kết'}
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* State 3: Reset Password Form */}
            {activeStep === 3 && (
              <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200/80 flex flex-col transition-all animate-in fade-in duration-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-[#004AC6]">
                    <span className="material-symbols-outlined text-2xl">password</span>
                  </div>
                  <span className="text-xs text-[#004AC6] font-bold uppercase tracking-wider">
                    Thiết lập bảo mật
                  </span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] mb-2">
                  Đặt mật khẩu mới
                </h2>
                <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                  Mật khẩu mới cần đáp ứng các tiêu chuẩn phòng chống tấn công dò quét từ điển và bẻ khóa tự động của CyberAware AI.
                </p>

                {passwordError && (
                  <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm font-medium flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">error</span>
                    <span>{passwordError}</span>
                  </div>
                )}

                {updateSuccess ? (
                  <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-xl text-center flex flex-col items-center gap-3">
                    <span className="material-symbols-outlined text-4xl text-emerald-600">check_circle</span>
                    <h3 className="text-lg font-bold text-emerald-950">Mật khẩu đã được cập nhật thành công!</h3>
                    <p className="text-xs text-emerald-800">Đang chuyển hướng về trang đăng nhập an toàn...</p>
                  </div>
                ) : (
                  <form className="flex flex-col gap-5" onSubmit={handleUpdatePassword}>
                    {/* Password Field */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-[#0F172A] uppercase tracking-wide" htmlFor="newPassword">
                        Mật khẩu mới
                      </label>
                      <div className="relative flex items-center">
                        <span className="material-symbols-outlined absolute left-3.5 text-slate-400 pointer-events-none text-xl">
                          key
                        </span>
                        <input
                          className="w-full h-13 pl-11 pr-12 rounded-xl bg-slate-50 text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#004AC6] border border-slate-200 transition-all shadow-xs"
                          id="newPassword"
                          placeholder="Tối thiểu 8 ký tự..."
                          required
                          type={showNewPass ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                        />
                        <button
                          className="absolute right-3.5 text-slate-400 hover:text-slate-700 cursor-pointer p-1"
                          onClick={() => setShowNewPass(!showNewPass)}
                          type="button"
                        >
                          <span className="material-symbols-outlined text-xl">
                            {showNewPass ? 'visibility_off' : 'visibility'}
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Strength Meter Bar & Indicators */}
                    <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-500">Độ mạnh mật khẩu:</span>
                        <span className={`text-xs font-bold ${strengthTextColor}`}>
                          {strengthText}
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden flex">
                        <div
                          className={`h-full ${strengthColor} transition-all duration-300`}
                          style={{ width: strengthPercent }}
                        />
                      </div>

                      {/* Validation Checkpoints */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                        <div className={`flex items-center gap-1.5 text-xs ${hasLength ? 'text-emerald-700 font-semibold' : 'text-slate-500'}`}>
                          <span className={`material-symbols-outlined text-sm ${hasLength ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {hasLength ? 'check_circle' : 'radio_button_unchecked'}
                          </span>
                          <span>Tối thiểu 8 ký tự</span>
                        </div>
                        <div className={`flex items-center gap-1.5 text-xs ${hasUpperAndLower ? 'text-emerald-700 font-semibold' : 'text-slate-500'}`}>
                          <span className={`material-symbols-outlined text-sm ${hasUpperAndLower ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {hasUpperAndLower ? 'check_circle' : 'radio_button_unchecked'}
                          </span>
                          <span>Có chữ hoa & chữ thường</span>
                        </div>
                        <div className={`flex items-center gap-1.5 text-xs ${hasNumber ? 'text-emerald-700 font-semibold' : 'text-slate-500'}`}>
                          <span className={`material-symbols-outlined text-sm ${hasNumber ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {hasNumber ? 'check_circle' : 'radio_button_unchecked'}
                          </span>
                          <span>Có ít nhất 1 chữ số</span>
                        </div>
                        <div className={`flex items-center gap-1.5 text-xs ${hasSpecial ? 'text-emerald-700 font-semibold' : 'text-slate-500'}`}>
                          <span className={`material-symbols-outlined text-sm ${hasSpecial ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {hasSpecial ? 'check_circle' : 'radio_button_unchecked'}
                          </span>
                          <span>Ký tự đặc biệt (!@#$)</span>
                        </div>
                      </div>
                    </div>

                    {/* Confirm Password Field */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-[#0F172A] uppercase tracking-wide" htmlFor="confirmPassword">
                        Xác nhận mật khẩu mới
                      </label>
                      <div className="relative flex items-center">
                        <span className="material-symbols-outlined absolute left-3.5 text-slate-400 pointer-events-none text-xl">
                          lock
                        </span>
                        <input
                          className="w-full h-13 pl-11 pr-12 rounded-xl bg-slate-50 text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#004AC6] border border-slate-200 transition-all shadow-xs"
                          id="confirmPassword"
                          placeholder="Nhập lại mật khẩu..."
                          required
                          type={showConfirmPass ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                        <button
                          className="absolute right-3.5 text-slate-400 hover:text-slate-700 cursor-pointer p-1"
                          onClick={() => setShowConfirmPass(!showConfirmPass)}
                          type="button"
                        >
                          <span className="material-symbols-outlined text-xl">
                            {showConfirmPass ? 'visibility_off' : 'visibility'}
                          </span>
                        </button>
                      </div>
                    </div>

                    <button
                      disabled={isUpdating}
                      className="mt-2 w-full h-12 bg-[#004AC6] hover:bg-blue-700 active:scale-[0.99] disabled:opacity-50 text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                      type="submit"
                    >
                      {isUpdating ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Đang cập nhật mật khẩu...</span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-lg">check</span>
                          <span>Cập nhật mật khẩu</span>
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* Security Guidance Banner */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/80 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-2xl">shield_person</span>
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-sm text-[#0F172A] mb-1">Cảnh giác với tin nhắn giả mạo</span>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Ban Quản Trị CyberAware <strong>không bao giờ</strong> gọi điện thoại hay nhắn tin qua Zalo/Telegram để yêu cầu bạn cung cấp mật khẩu hoặc mã OTP xác thực.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Verification & Security Context (Editorial Bento) */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            {/* Visual Editorial Security Card with Photo-Rich Context */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden flex flex-col">
              <div
                className="w-full h-44 bg-cover bg-center relative p-5 flex flex-col justify-between"
                style={{
                  backgroundImage: "url('https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&q=80')",
                }}
              >
                <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px]" />
                <div className="relative z-10 bg-slate-900/80 self-start px-3 py-1 rounded-full text-white font-mono text-xs flex items-center gap-2 border border-white/10">
                  <span className="material-symbols-outlined text-sm text-emerald-400">shield</span>
                  <span>Zero-Trust Protocol</span>
                </div>
                <div className="relative z-10 text-white">
                  <span className="text-[11px] font-bold text-blue-200 uppercase tracking-wider block">
                    Trực nhật giám sát
                  </span>
                  <p className="font-bold text-base sm:text-lg text-white">
                    Bảo vệ danh tính số Quốc gia
                  </p>
                </div>
              </div>

              <div className="p-6 flex flex-col gap-4">
                <h3 className="font-bold text-sm text-[#0F172A] uppercase tracking-wide">
                  Quy trình 3 lớp khôi phục an toàn
                </h3>
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-[#004AC6] flex items-center justify-center font-mono text-xs font-bold shrink-0">
                    A
                  </span>
                  <div>
                    <p className="font-bold text-xs sm:text-sm text-[#0F172A]">Phát hiện địa chỉ IP bất thường</p>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                      Kiểm tra thông số vị trí địa lý của thiết bị gửi yêu cầu để chặn tấn công brute-force từ xa.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-[#004AC6] flex items-center justify-center font-mono text-xs font-bold shrink-0">
                    B
                  </span>
                  <div>
                    <p className="font-bold text-xs sm:text-sm text-[#0F172A]">Hủy toàn bộ phiên đăng nhập cũ</p>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                      Sau khi đổi mật khẩu, mọi thiết bị máy tính bảng, điện thoại hoặc trình duyệt lạ sẽ bị đăng xuất ngay lập tức.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-[#004AC6] flex items-center justify-center font-mono text-xs font-bold shrink-0">
                    C
                  </span>
                  <div>
                    <p className="font-bold text-xs sm:text-sm text-[#0F172A]">Thông báo đa kênh tức thời</p>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                      Gửi tin nhắn cảnh báo đồng thời qua kênh bảo mật để bạn có thể đóng băng tài khoản trong 60 giây nếu phát hiện dấu hiệu xâm phạm.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Assistance Accordion Box */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-[#0F172A]">Không nhận được email?</h4>
                <span className="material-symbols-outlined text-slate-400">help_outline</span>
              </div>
              <div className="flex flex-col gap-2.5 text-xs text-slate-600">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 leading-relaxed">
                  <span className="font-bold text-[#0F172A] block mb-0.5">1. Kiểm tra thư mục Spam hoặc Quảng cáo</span>
                  Bộ lọc của Google hoặc Outlook đôi khi có thể phân loại nhầm thư chứa liên kết xác thực kỹ thuật số.
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 leading-relaxed">
                  <span className="font-bold text-[#0F172A] block mb-0.5">2. Kiểm tra lại chính tả địa chỉ email</span>
                  Đảm bảo bạn không nhập thừa khoảng trắng hoặc sai đuôi tên miền cơ quan (.gov.vn / .org.vn).
                </div>
              </div>

              <Link
                to="/gioi-thieu"
                className="inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-50 text-[#004AC6] hover:bg-blue-50 font-semibold text-xs sm:text-sm border border-slate-200 transition-colors"
              >
                <span className="material-symbols-outlined text-lg">support_agent</span>
                <span>Liên hệ Trung tâm Hỗ trợ Công dân 24/7</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
