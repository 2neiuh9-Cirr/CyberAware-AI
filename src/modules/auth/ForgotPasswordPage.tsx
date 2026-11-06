import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, json } from '../../api';
import { useAppStore } from '../../store/useAppStore';

const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

export const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();

  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);
  const [requestError, setRequestError] = useState('');
  const [requestSubmitted, setRequestSubmitted] = useState(false);
  const [deliveryMode, setDeliveryMode] = useState<'email' | 'local'>('email');
  const [codeVerified, setCodeVerified] = useState(false);
  const [code, setCode] = useState('');
  const [expiresAt, setExpiresAt] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);

  // Step 3 state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    api('/auth/reset-password/status').then(() => {
      setCodeVerified(true);
      setActiveStep(3);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (activeStep !== 2) return;
    const update = () => setRemaining(Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000)));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [activeStep, expiresAt]);

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

  const sendCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!recoveryEmail) return;

    setIsSending(true);
    setRequestError('');
    setResendStatus(null);
    try {
      const data = await api<{ expiresInSeconds: number; deliveryMode: 'email' | 'local' }>('/auth/forgot-password', json('POST', { email: recoveryEmail.trim() }));
      setDeliveryMode(data.deliveryMode === 'local' ? 'local' : 'email');
      setExpiresAt(Date.now() + data.expiresInSeconds * 1000);
      setCode('');
      setCodeVerified(false);
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
      const data = await api<{ expiresInSeconds: number; deliveryMode: 'email' | 'local' }>('/auth/forgot-password', json('POST', { email: recoveryEmail.trim() }));
      setDeliveryMode(data.deliveryMode === 'local' ? 'local' : 'email');
      setExpiresAt(Date.now() + data.expiresInSeconds * 1000);
      setCode('');
      setCodeVerified(false);
      setResendStatus('sent');
    } catch (error) {
      setResendStatus('error');
      setRequestError(error instanceof Error ? error.message : 'Không thể kết nối máy chủ. Vui lòng thử lại.');
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 8 || remaining === 0) return;
    setIsVerifying(true);
    setRequestError('');
    try {
      await api('/auth/verify-reset-code', json('POST', { email: recoveryEmail.trim(), code }));
      setCode('');
      setCodeVerified(true);
      setActiveStep(3);
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : 'Không thể xác minh mã. Vui lòng thử lại.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordError('Mật khẩu xác nhận không trùng khớp. Vui lòng kiểm tra lại.');
      return;
    }
    if (newPassword.length < 8 || newPassword.length > 128) {
      setPasswordError('Mật khẩu phải dài từ 8 đến 128 ký tự.');
      return;
    }

    setPasswordError('');
    setIsUpdating(true);

    try {
      await api('/auth/reset-password', json('POST', { newPassword }));
      useAppStore.getState().expireSession();
      setCodeVerified(false);
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
            <span>Hệ thống bảo vệ CyberAware AI</span>
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
                <span className="text-xs sm:text-sm font-semibold whitespace-nowrap">Nhập mã xác thực</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveStep(3)}
                disabled={!codeVerified}
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
                  Nhập địa chỉ email đã đăng ký để nhận mã xác thực đặt lại mật khẩu.
                </p>

                <form className="flex flex-col gap-5" onSubmit={sendCode}>
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
                        placeholder="tenban@gmail.com"
                        required
                        type="email"
                        autoComplete="email"
                        maxLength={254}
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
                      Mã xác thực gồm 8 chữ số, có hiệu lực trong 5 phút và chỉ dùng được một lần.
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
                        <span>Gửi mã xác thực</span>
                        <span className="material-symbols-outlined text-lg">arrow_forward</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* State 2: Email code verification */}
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
                  Nhập mã xác thực
                </h2>
                <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                  Nếu email có tài khoản CyberAware, mã 8 chữ số sẽ được gửi tới địa chỉ đó. Hãy kiểm tra cả thư rác; nếu không nhận được mã, hãy kiểm tra lại địa chỉ email.
                </p>

                {deliveryMode === 'local' && (
                  <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
                    Máy chủ chưa cấu hình gửi email. Trong môi trường phát triển, mã được ghi tại <code>data/dev-reset-codes.log</code> của dự án.
                  </p>
                )}
                {requestError && <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-3 mb-4">{requestError}</p>}

                {/* Recovery request details */}
                <div className="bg-slate-50 rounded-xl p-5 mb-6 flex flex-col gap-3 border border-slate-200/80">
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-slate-500 font-medium">Hộp thư nhận:</span>
                    <span className="font-mono text-[#0F172A] font-bold">{recoveryEmail}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-slate-500 font-medium">Thời gian hiệu lực:</span>
                    <span className={`font-mono font-bold ${remaining > 0 ? 'text-[#004AC6]' : 'text-red-600'}`}>{formatTime(remaining)}</span>
                  </div>
                </div>

                <form className="flex flex-col gap-4 mb-4" onSubmit={handleVerifyCode}>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-[#0F172A] uppercase tracking-wide" htmlFor="verificationCode">Mã xác thực 8 chữ số</label>
                    <div className="relative flex items-center">
                      <span className="material-symbols-outlined absolute left-3.5 text-slate-400 pointer-events-none text-xl">pin</span>
                      <input
                        id="verificationCode"
                        className="w-full h-13 pl-11 pr-4 rounded-xl bg-slate-50 text-slate-900 text-lg font-mono tracking-[0.25em] placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#004AC6] border border-slate-200 transition-all shadow-xs"
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        pattern="[0-9]{8}"
                        maxLength={8}
                        required
                        placeholder="00000000"
                        value={code}
                        onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                      />
                    </div>
                    {remaining === 0 && <span className="text-xs text-red-600">Mã đã hết hạn. Hãy gửi lại để nhận mã mới.</span>}
                  </div>
                  <button
                    className="w-full h-12 bg-[#004AC6] hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                    disabled={isVerifying || remaining === 0 || code.length !== 8}
                    type="submit"
                  >
                    <span>{isVerifying ? 'Đang xác minh...' : 'Xác minh mã'}</span>
                    <span className="material-symbols-outlined text-lg">arrow_forward</span>
                  </button>
                </form>

                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <button
                    className="w-full sm:flex-1 h-12 bg-slate-100 hover:bg-slate-200 text-[#0F172A] font-semibold text-sm rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    onClick={handleResend}
                    disabled={resendStatus === 'sending' || isVerifying}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-lg">
                      {resendStatus === 'sending' ? 'sync' : resendStatus === 'sent' ? 'check' : 'refresh'}
                    </span>
                    <span>
                      {resendStatus === 'sending' ? 'Đang gửi...' : resendStatus === 'sent' ? 'Đã gửi mã mới!' : 'Gửi lại mã'}
                    </span>
                  </button>
                  <button type="button" onClick={() => { setActiveStep(1); setCode(''); setRequestError(''); }} className="w-full sm:w-auto px-5 h-12 text-[#004AC6] font-semibold text-sm rounded-xl hover:bg-blue-50 transition-colors cursor-pointer">Đổi email</button>
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
                    <p className="text-xs text-emerald-800">Các phiên đăng nhập cũ đã được thu hồi. Bạn cần đăng nhập lại bằng mật khẩu mới.</p>
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
                          autoComplete="new-password"
                          minLength={8}
                          maxLength={128}
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
                          autoComplete="new-password"
                          minLength={8}
                          maxLength={128}
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
                    <p className="font-bold text-xs sm:text-sm text-[#0F172A]">Xác minh mã email có thời hạn</p>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                      Mã 8 chữ số hết hạn sau 5 phút và bị khóa sau 5 lần nhập sai.
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
                    <p className="font-bold text-xs sm:text-sm text-[#0F172A]">Đăng nhập lại sau khi đổi mật khẩu</p>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                      Sau khi đặt mật khẩu mới, bạn cần đăng nhập lại theo các bước thông thường.
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
                  Bộ lọc của Google hoặc Outlook đôi khi có thể phân loại nhầm thư chứa mã xác thực.
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 leading-relaxed">
                  <span className="font-bold text-[#0F172A] block mb-0.5">2. Kiểm tra lại chính tả địa chỉ email</span>
                  Đảm bảo bạn nhập đúng địa chỉ email đã đăng ký tài khoản.
                </div>
              </div>

              <Link
                to="/gioi-thieu"
                className="inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-50 text-[#004AC6] hover:bg-blue-50 font-semibold text-xs sm:text-sm border border-slate-200 transition-colors"
              >
                <span className="material-symbols-outlined text-lg">support_agent</span>
                <span>Xem thông tin hỗ trợ</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
