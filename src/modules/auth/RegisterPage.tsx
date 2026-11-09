import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, json } from '../../api';
import { useAppStore } from '../../store/useAppStore';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { registerUser, initialize } = useAppStore();

  const [fullname, setFullname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [verificationPending, setVerificationPending] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [expiresAt, setExpiresAt] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [deliveryMode, setDeliveryMode] = useState<'email' | 'local'>('email');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (!verificationPending) return;
    const tick = () => setRemaining(Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000)));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [verificationPending, expiresAt]);

  // Password criteria
  const hasLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  const criteriaCount = [hasLength, hasUpper, hasLower, hasNumber].filter(Boolean).length;
  let strengthLabel = '';
  let strengthColor = '';
  if (password.length > 0) {
    if (criteriaCount <= 2) {
      strengthLabel = 'Độ mạnh: Yếu';
      strengthColor = 'text-red-600';
    } else if (criteriaCount === 3) {
      strengthLabel = 'Độ mạnh: Khá';
      strengthColor = 'text-amber-600';
    } else {
      strengthLabel = 'Độ mạnh: Tuyệt vời';
      strengthColor = 'text-emerald-600';
    }
  }

  const isPasswordMatch =
    confirmPassword.length > 0 &&
    password === confirmPassword &&
    password.length >= 8;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setErrorMessage('Mật khẩu xác nhận chưa khớp. Vui lòng kiểm tra lại!');
      return;
    }
    if (!termsAgreed) {
      setErrorMessage('Vui lòng đồng ý với Điều khoản dịch vụ và Chính sách quyền riêng tư.');
      return;
    }

    setErrorMessage('');
    setIsSubmitting(true);

    const result = await registerUser(fullname, email, password);
    if (result.success) {
      setVerificationPending(true);
      setExpiresAt(Date.now() + (result.expiresInSeconds || 600) * 1000);
      setDeliveryMode(result.deliveryMode === 'local' ? 'local' : 'email');
      setPassword('');
      setConfirmPassword('');
      setIsSubmitting(false);
    } else {
      setIsSubmitting(false);
      setErrorMessage(result.error || 'Đăng ký tài khoản không thành công.');
    }
  };

  const verifyEmail = async (event: React.FormEvent) => {
    event.preventDefault();
    if (verificationCode.length !== 8 || remaining === 0) return;
    setIsVerifying(true);
    setErrorMessage('');
    try {
      await api('/auth/verify-email', json('POST', { email: email.trim(), code: verificationCode }));
      setIsSuccess(true);
      await initialize();
      navigate('/');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Không thể xác minh email. Vui lòng thử lại.');
    } finally { setIsVerifying(false); }
  };

  const resendVerification = async () => {
    setIsResending(true);
    setErrorMessage('');
    try {
      const data = await api<{ expiresInSeconds: number; deliveryMode: 'email' | 'local' }>('/auth/resend-verification', json('POST', { email: email.trim() }));
      setVerificationCode('');
      setExpiresAt(Date.now() + data.expiresInSeconds * 1000);
      setDeliveryMode(data.deliveryMode);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Không thể gửi lại mã. Vui lòng thử lại.');
    } finally { setIsResending(false); }
  };

  return (
    <div className="w-full flex-grow flex flex-col justify-center items-center p-4 sm:p-6 bg-[#F8FAFC]">
      <div className="flex flex-col w-full items-center justify-center py-4 sm:py-6 px-2 sm:px-4">
        {/* Subtle Ambient Glow */}
        <div className="relative w-full max-w-xl">
          <div className="absolute -top-12 -left-12 w-64 h-64 bg-blue-200/40 rounded-full blur-3xl pointer-events-none -z-10" />
          <div className="absolute -bottom-10 -right-10 w-72 h-72 bg-emerald-200/40 rounded-full blur-3xl pointer-events-none -z-10" />

          {/* Main Registration Card */}
          <div className="relative bg-white rounded-2xl shadow-xl p-6 sm:p-10 w-full overflow-hidden border border-slate-200/80">
            {/* Top Decorative Pill & Security Badge */}
            <div className="flex items-center justify-between gap-4 mb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-[#004AC6] rounded-full text-xs font-bold border border-blue-100">
                <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  verified_user
                </span>
                <span>Bảo mật dữ liệu công dân</span>
              </div>
              <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md font-semibold border border-slate-200/60">
                Xác minh email
              </span>
            </div>

            {/* Header Section */}
            <div className="mb-7">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight mb-1.5">
                Tạo tài khoản CyberAware AI
              </h1>
              <p className="text-sm text-slate-500">
                Theo dõi lịch sử kiểm tra và lộ trình học tập tự vệ số miễn phí
              </p>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm font-medium flex items-center gap-2 animate-in fade-in duration-150">
                <span className="material-symbols-outlined text-base shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>
                  error
                </span>
                <span>{errorMessage}</span>
              </div>
            )}

            {verificationPending && (
              <div className="space-y-5">
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
                  {isSuccess ? 'Email đã được xác minh. Đang mở tài khoản...' : `Nhập mã 8 chữ số gửi tới ${email.trim()}. Mã có hiệu lực 10 phút và chỉ dùng trong trình duyệt này.`}
                </div>
                {deliveryMode === 'local' && <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Máy chủ phát triển chưa cấu hình SMTP. Mã được ghi vào <code>data/dev-verification-codes.log</code>.</p>}
                <form onSubmit={verifyEmail} className="space-y-4">
                  <label htmlFor="emailVerificationCode" className="block text-sm font-semibold text-slate-900">Mã xác minh email</label>
                  <input id="emailVerificationCode" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{8}" maxLength={8} required value={verificationCode} onChange={event => setVerificationCode(event.target.value.replace(/\D/g, '').slice(0, 8))} className="w-full h-12 rounded-xl border border-slate-200 px-4 text-center text-lg font-mono tracking-[0.25em] focus:outline-none focus:ring-2 focus:ring-[#004AC6]" placeholder="00000000" />
                  <p className="text-xs text-slate-600">Còn {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}. Nếu không thấy email, hãy kiểm tra thư rác.</p>
                  <button disabled={isVerifying || remaining === 0 || verificationCode.length !== 8 || isSuccess} type="submit" className="w-full h-12 rounded-xl bg-[#004AC6] text-white font-semibold disabled:opacity-50">{isVerifying ? 'Đang xác minh...' : 'Xác minh và hoàn tất đăng ký'}</button>
                </form>
                <div className="flex flex-wrap gap-3 text-sm">
                  <button type="button" onClick={resendVerification} disabled={isResending} className="text-[#004AC6] font-semibold disabled:opacity-50">{isResending ? 'Đang gửi...' : 'Gửi lại mã'}</button>
                  <button type="button" onClick={() => { setVerificationPending(false); setVerificationCode(''); setErrorMessage(''); }} className="text-slate-600 font-semibold">Đăng ký lại / đổi email</button>
                </div>
              </div>
            )}

            {/* Registration Form */}
            {!verificationPending && <form className="space-y-5" onSubmit={handleSubmit}>
              {/* Full Name Field */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[#0F172A] uppercase tracking-wide" htmlFor="fullname">
                  Họ và tên
                </label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-3.5 text-slate-400 text-[20px] pointer-events-none">
                    person
                  </span>
                  <input
                    className="w-full h-11 pl-11 pr-4 bg-slate-50 text-slate-900 placeholder:text-slate-400 rounded-xl text-sm border border-slate-200 transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#004AC6] shadow-xs"
                    id="fullname"
                    placeholder="Nguyễn Văn A"
                    required
                    type="text"
                    value={fullname}
                    onChange={(e) => setFullname(e.target.value)}
                  />
                </div>
              </div>

              {/* Email Field */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[#0F172A] uppercase tracking-wide" htmlFor="email">
                  Email
                </label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-3.5 text-slate-400 text-[20px] pointer-events-none">
                    mail
                  </span>
                  <input
                    className="w-full h-11 pl-11 pr-4 bg-slate-50 text-slate-900 placeholder:text-slate-400 rounded-xl text-sm border border-slate-200 transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#004AC6] shadow-xs"
                    id="email"
                    placeholder="nguyenvana@example.com"
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#0F172A] uppercase tracking-wide" htmlFor="password">
                    Mật khẩu
                  </label>
                  {strengthLabel && (
                    <span className={`text-xs font-bold ${strengthColor}`}>
                      {strengthLabel}
                    </span>
                  )}
                </div>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-3.5 text-slate-400 text-[20px] pointer-events-none">
                    lock
                  </span>
                  <input
                    className="w-full h-11 pl-11 pr-12 bg-slate-50 text-slate-900 placeholder:text-slate-400 rounded-xl text-sm border border-slate-200 transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#004AC6] shadow-xs"
                    id="password"
                    placeholder="Nhập mật khẩu an toàn"
                    required
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    aria-label="Ẩn hoặc hiện mật khẩu"
                    className="absolute right-2 p-1.5 text-slate-400 hover:text-slate-800 rounded-lg transition-colors flex items-center justify-center cursor-pointer"
                    onClick={() => setShowPassword(!showPassword)}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>

                {/* Inline Password Criteria Validation */}
                <div className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-xl mt-1 space-y-2">
                  <p className="text-xs font-bold text-[#0F172A] mb-1">Mật khẩu cần đáp ứng:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className={`flex items-center gap-1.5 transition-colors ${hasLength ? 'text-emerald-700 font-semibold' : 'text-slate-500'}`}>
                      <span className={`material-symbols-outlined text-[16px] ${hasLength ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {hasLength ? 'check_circle' : 'radio_button_unchecked'}
                      </span>
                      <span>Ít nhất 8 ký tự</span>
                    </div>
                    <div className={`flex items-center gap-1.5 transition-colors ${hasUpper ? 'text-emerald-700 font-semibold' : 'text-slate-500'}`}>
                      <span className={`material-symbols-outlined text-[16px] ${hasUpper ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {hasUpper ? 'check_circle' : 'radio_button_unchecked'}
                      </span>
                      <span>Có chữ in hoa (A-Z)</span>
                    </div>
                    <div className={`flex items-center gap-1.5 transition-colors ${hasLower ? 'text-emerald-700 font-semibold' : 'text-slate-500'}`}>
                      <span className={`material-symbols-outlined text-[16px] ${hasLower ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {hasLower ? 'check_circle' : 'radio_button_unchecked'}
                      </span>
                      <span>Có chữ thường (a-z)</span>
                    </div>
                    <div className={`flex items-center gap-1.5 transition-colors ${hasNumber ? 'text-emerald-700 font-semibold' : 'text-slate-500'}`}>
                      <span className={`material-symbols-outlined text-[16px] ${hasNumber ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {hasNumber ? 'check_circle' : 'radio_button_unchecked'}
                      </span>
                      <span>Có chữ số (0-9)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Confirm Password Field */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[#0F172A] uppercase tracking-wide" htmlFor="confirmPassword">
                  Xác nhận mật khẩu
                </label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-3.5 text-slate-400 text-[20px] pointer-events-none">
                    lock_reset
                  </span>
                  <input
                    className="w-full h-11 pl-11 pr-12 bg-slate-50 text-slate-900 placeholder:text-slate-400 rounded-xl text-sm border border-slate-200 transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#004AC6] shadow-xs"
                    id="confirmPassword"
                    placeholder="Nhập lại mật khẩu"
                    required
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <button
                    aria-label="Ẩn hoặc hiện xác nhận mật khẩu"
                    className="absolute right-2 p-1.5 text-slate-400 hover:text-slate-800 rounded-lg transition-colors flex items-center justify-center cursor-pointer"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {showConfirmPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>

                {/* Real-time Match Indicator */}
                {isPasswordMatch && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs border border-emerald-200 transition-all mt-1 font-semibold animate-in fade-in duration-150">
                    <span className="material-symbols-outlined text-[16px]">check_circle</span>
                    <span>Mật khẩu hoàn toàn trùng khớp</span>
                  </div>
                )}
              </div>

              {/* Terms and Privacy Policy Agreement */}
              <div className="pt-1">
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    className="mt-0.5 w-4 h-4 rounded text-[#004AC6] focus:ring-[#004AC6] cursor-pointer accent-[#004AC6]"
                    id="termsCheckbox"
                    required
                    type="checkbox"
                    checked={termsAgreed}
                    onChange={(e) => setTermsAgreed(e.target.checked)}
                  />
                  <span className="text-xs text-slate-600 leading-snug">
                    Tôi đồng ý với{' '}
                    <Link to="/gioi-thieu" className="text-[#004AC6] hover:underline font-semibold">
                      Điều khoản dịch vụ
                    </Link>{' '}
                    và{' '}
                    <a href="/chinh-sach-quyen-rieng-tu.html" className="text-[#004AC6] hover:underline font-semibold">
                      Chính sách quyền riêng tư
                    </a>{' '}
                    của CyberAware AI.
                  </span>
                </label>
              </div>

              {/* Submit Button CTA */}
              <div className="pt-2">
                <button
                  disabled={isSubmitting}
                  className={`w-full h-12 text-white font-semibold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    isSuccess
                      ? 'bg-emerald-600'
                      : 'bg-[#004AC6] hover:bg-blue-700 active:scale-[0.99] disabled:opacity-50'
                  }`}
                  id="submitBtn"
                  type="submit"
                >
                  {isSuccess ? (
                    <>
                      <span className="material-symbols-outlined text-[20px]">check</span>
                      <span>Đăng ký thành công! Đang chuyển hướng...</span>
                    </>
                  ) : isSubmitting ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
                      <span>Đang khởi tạo tài khoản an toàn...</span>
                    </>
                  ) : (
                    <>
                      <span>Đăng ký tài khoản</span>
                      <span className="material-symbols-outlined text-[20px] transition-transform group-hover:translate-x-0.5">
                        arrow_forward
                      </span>
                    </>
                  )}
                </button>
              </div>
            </form>}

            {/* Bottom Trust Note & Quick Links */}
            <div className="mt-8 pt-5 bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
              <p className="text-xs sm:text-sm text-slate-600">
                Đã có tài khoản?{' '}
                <Link
                  to="/dang-nhap"
                  className="text-[#004AC6] hover:text-blue-700 font-bold ml-1 inline-flex items-center gap-1"
                >
                  <span>Đăng nhập ngay</span>
                  <span className="material-symbols-outlined text-[16px]">login</span>
                </Link>
              </p>

              <div className="flex items-center justify-center gap-4 sm:gap-6 mt-3 text-slate-500 text-xs">
                <div className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px] text-emerald-600">verified</span>
                  <span>Không thu phí</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px] text-blue-600">lock</span>
                  <span>Bảo mật ẩn danh</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px] text-amber-600">support_agent</span>
                  <span>Hỗ trợ 24/7</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
