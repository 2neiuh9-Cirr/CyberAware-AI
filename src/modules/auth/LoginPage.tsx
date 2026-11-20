import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { api } from '../../api';
import { ComingSoonDialog } from '../../components/common/ComingSoonDialog';
import { LoginSecurityVisual } from './LoginSecurityVisual';
import './LoginPage.css';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAppStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [socialProviders, setSocialProviders] = useState({ google: false, facebook: false });
  const [facebookNoticeOpen, setFacebookNoticeOpen] = useState(false);

  useEffect(() => {
    void api<{ google: boolean; facebook: boolean }>('/auth/oauth/providers')
      .then(setSocialProviders).catch(() => {});
    const params = new URLSearchParams(window.location.search);
    const error = params.get('oauth_error');
    if (!error) return;
    const provider = params.get('provider') === 'facebook' ? 'Facebook' : 'Google';
    const messages: Record<string, string> = {
      cancelled: `Bạn đã hủy xác nhận đăng nhập bằng ${provider}.`,
      oauth_email: `${provider} chưa cung cấp email hợp lệ. Hãy cấp quyền truy cập email hoặc dùng cách đăng nhập khác.`,
      oauth_account_exists: 'Email này đã có tài khoản CyberAware. Hãy đăng nhập bằng Google hoặc mật khẩu, vào Cài đặt tài khoản và chọn Liên kết Facebook.',
      oauth_locked: 'Tài khoản CyberAware đang bị khóa. Vui lòng liên hệ quản trị viên.',
      state: 'Phiên xác nhận đã hết hạn. Vui lòng thử lại.',
    };
    setErrorMessage(messages[error] || `Không thể hoàn tất đăng nhập bằng ${provider}. Vui lòng thử lại.`);
    setShowAlert(true);
    window.history.replaceState({}, '', window.location.pathname);
  }, []);

  const startSocial = (provider: 'google' | 'facebook') => {
    if (!socialProviders[provider]) {
      setErrorMessage(`Đăng nhập bằng ${provider === 'google' ? 'Google' : 'Facebook'} chưa được cấu hình trên máy chủ.`);
      setShowAlert(true);
      return;
    }
    window.location.assign(`/api/auth/oauth/${provider}/start`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage('Vui lòng nhập đầy đủ địa chỉ email và mật khẩu.');
      setShowAlert(true);
      return;
    }

    setIsLoading(true);
    const result = await login(email, password, rememberMe);
    setIsLoading(false);

    if (result.success) {
      navigate('/');
    } else {
      setErrorMessage(result.error || 'Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại bàn phím (Caps Lock) và thử lại.');
      setShowAlert(true);
    }
  };

  return (
    <div className="w-full flex-grow flex flex-col justify-center items-center p-4 sm:p-6 bg-[#F8FAFC]">
      <div className="relative w-full max-w-5xl mx-auto flex flex-col items-center justify-center py-4 sm:py-6">
        {/* Subtle ambient lighting ring */}
        <div className="absolute -top-16 w-96 h-96 bg-blue-100/60 rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="absolute -bottom-20 w-80 h-80 bg-blue-200/40 rounded-full blur-3xl pointer-events-none -z-10" />

        {/* Main Card Shell: asymmetric desktop split for civic trust & security */}
        <div className="login-page-card w-full grid grid-cols-1 lg:grid-cols-12 rounded-2xl shadow-xl overflow-hidden bg-white border border-slate-200/80">
          {/* Left Column: Security Credentials & Platform Mission (Hidden on mobile) */}
          <div className="login-credentials-panel hidden lg:flex lg:col-span-5 flex-col justify-between p-10 bg-slate-50 border-r border-slate-200/70 text-slate-800 relative">
            <div className="relative z-10 flex flex-col gap-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white text-[#004AC6] font-semibold text-xs w-fit shadow-xs border border-blue-100">
                <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                  verified_user
                </span>
                <span>CỔNG BẢO MẬT QUỐC GIA 2.0</span>
              </div>

              <div className="space-y-3">
                <h2 className="font-bold text-2xl text-[#0F172A] tracking-tight">
                  Bảo vệ danh tính số của bạn
                </h2>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Nền tảng trí tuệ nhân tạo phát hiện lừa đảo, thẩm định liên kết và bảo vệ an toàn trực tuyến cho công dân Việt Nam.
                </p>
              </div>

              {/* Trust Metric Cards */}
              <div className="space-y-3 mt-4">
                <div className="login-trust-card p-4 rounded-xl bg-white border border-slate-200/80 flex items-start gap-3 shadow-xs">
                  <span className="material-symbols-outlined text-[#004AC6] text-2xl shrink-0 mt-0.5">
                    shield
                  </span>
                  <div className="flex flex-col">
                    <span className="font-bold text-sm text-[#0F172A]">Xác thực đa lớp AI</span>
                    <span className="text-xs text-slate-500 mt-0.5">
                      Phát hiện tấn công giả mạo thời gian thực với độ trễ dưới 0.3s.
                    </span>
                  </div>
                </div>

                <div className="login-trust-card p-4 rounded-xl bg-white border border-slate-200/80 flex items-start gap-3 shadow-xs">
                  <span className="material-symbols-outlined text-emerald-600 text-2xl shrink-0 mt-0.5">
                    lock_open_right
                  </span>
                  <div className="flex flex-col">
                    <span className="font-bold text-sm text-[#0F172A]">Mã hóa chuẩn eIDAS</span>
                    <span className="text-xs text-slate-500 mt-0.5">
                      Tuân thủ tiêu chuẩn an toàn dữ liệu cá nhân theo Nghị định 13/2023/NĐ-CP.
                    </span>
                  </div>
                </div>
              </div>
              <LoginSecurityVisual />
            </div>

            {/* Trust footer on left panel */}
            <div className="relative z-10 pt-8 flex items-center gap-2 text-slate-500 text-xs font-semibold">
              <span className="material-symbols-outlined text-[#004AC6] text-lg">public</span>
              <span>Hệ thống giám sát không gian mạng CyberAware</span>
            </div>
          </div>

          {/* Right Column: Focus Login Form */}
          <div className="lg:col-span-7 p-6 sm:p-10 md:p-12 flex flex-col justify-center bg-white">
            {/* Header & Logo Section */}
            <div className="flex flex-col items-center sm:items-start text-center sm:text-left mb-7">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-xl bg-[#004AC6] flex items-center justify-center text-white shadow-md">
                  <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                    security
                  </span>
                </div>
                <div className="flex flex-col text-left">
                  <span className="font-bold text-lg text-[#0F172A] tracking-tight leading-none">CyberAware AI</span>
                  <span className="font-mono text-xs text-[#004AC6] tracking-wider uppercase mt-1 font-semibold">
                    Cơ chế bảo vệ chủ động
                  </span>
                </div>
              </div>
              <h1 className="font-extrabold text-2xl sm:text-3xl text-[#0F172A] tracking-tight">
                Đăng nhập vào hệ thống
              </h1>
              <p className="text-sm text-slate-500 mt-1.5">
                Vui lòng cung cấp thông tin tài khoản được cấp phép để tiếp tục.
              </p>
            </div>

            {/* System Alert Notification */}
            {showAlert && (
              <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-start gap-3 transition-all animate-in fade-in duration-200">
                <span className="material-symbols-outlined text-xl shrink-0 mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>
                  error
                </span>
                <div className="flex-1 flex flex-col">
                  <span className="font-bold text-sm">Xác thực không thành công</span>
                  <span className="text-xs text-slate-700 mt-0.5">
                    {errorMessage || 'Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại bàn phím (Caps Lock) và thử lại.'}
                  </span>
                </div>
                <button
                  aria-label="Đóng cảnh báo"
                  onClick={() => setShowAlert(false)}
                  className="text-red-700 hover:opacity-75 transition-opacity p-1 cursor-pointer"
                  type="button"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>
            )}

            <div className="mb-6 space-y-3">
              <button type="button" onClick={() => startSocial('google')} className="login-social-button flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50">
                <span aria-hidden="true" className="text-xl font-extrabold" style={{ background: 'conic-gradient(#4285F4 0deg 90deg, #34A853 90deg 180deg, #FBBC05 180deg 270deg, #EA4335 270deg)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>G</span>
                Tiếp tục với Google
              </button>
              <button type="button" onClick={() => setFacebookNoticeOpen(true)} className="login-social-button flex h-12 w-full items-center justify-center gap-3 rounded-xl bg-[#1877F2] text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#1468d6]">
                <span aria-hidden="true" className="text-2xl font-extrabold leading-none">f</span>
                Tiếp tục với Facebook
              </button>
              <div className="flex items-center gap-4 pt-2 text-sm text-slate-500"><span className="h-px flex-1 bg-slate-200" /><span>hoặc</span><span className="h-px flex-1 bg-slate-200" /></div>
            </div>

            {/* Form Elements */}
            <form className="space-y-5" onSubmit={handleSubmit}>
              {/* Email Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#0F172A] uppercase tracking-wide" htmlFor="email">
                  Địa chỉ Email <span className="text-red-600">*</span>
                </label>
                <div className="login-field relative flex items-center">
                  <span className="login-field-icon material-symbols-outlined absolute left-3.5 text-slate-400 pointer-events-none text-xl">
                    mail
                  </span>
                  <input
                    className="w-full h-12 pl-11 pr-4 bg-slate-50 rounded-xl text-slate-900 text-sm placeholder:text-slate-400 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#004AC6] shadow-xs transition-all"
                    id="email"
                    autoComplete="email"
                    placeholder="email@domain.com"
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              {/* Password Input with Toggle */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#0F172A] uppercase tracking-wide" htmlFor="password">
                  Mật khẩu <span className="text-red-600">*</span>
                </label>
                <div className="login-field login-field--password relative flex items-center">
                  <span className="login-field-icon material-symbols-outlined absolute left-3.5 text-slate-400 pointer-events-none text-xl">
                    key
                  </span>
                  <input
                    className="w-full h-12 pl-11 pr-12 bg-slate-50 rounded-xl text-slate-900 text-sm placeholder:text-slate-400 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#004AC6] shadow-xs transition-all"
                    id="password"
                    autoComplete="current-password"
                    placeholder="Nhập mật khẩu của bạn"
                    required
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    aria-label="Ẩn hoặc hiện mật khẩu"
                    className="absolute right-3 p-1.5 text-slate-400 hover:text-[#0F172A] transition-colors rounded-lg cursor-pointer"
                    onClick={() => setShowPassword(!showPassword)}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-xl">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Auxiliary Row: Remember me & Forgot Password */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    className="w-4 h-4 rounded text-[#004AC6] focus:ring-[#004AC6] cursor-pointer accent-[#004AC6]"
                    id="remember-me"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span className="text-xs sm:text-sm text-slate-700">Ghi nhớ đăng nhập trên thiết bị này</span>
                </label>
                <Link
                  to="/quen-mat-khau"
                  className="text-xs sm:text-sm font-semibold text-[#004AC6] hover:text-blue-700 transition-colors"
                >
                  Quên mật khẩu?
                </Link>
              </div>

              {/* Primary Submit Action */}
              <div className="pt-2">
                <button
                  disabled={isLoading}
                  className="login-submit-button w-full h-12 bg-[#004AC6] hover:bg-blue-700 active:scale-[0.99] disabled:opacity-50 text-white font-semibold text-sm rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                  type="submit"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Đang xác thực bảo mật...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-xl">login</span>
                      <span>Đăng nhập</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Navigation Switch Link */}
            <div className="mt-8 text-center pt-5 bg-slate-50 border border-slate-100 rounded-xl py-3 px-4">
              <p className="text-xs sm:text-sm text-slate-600">
                Chưa có tài khoản?
                <Link
                  to="/dang-ky"
                  className="text-[#004AC6] hover:text-blue-700 ml-1.5 font-bold transition-colors inline-flex items-center gap-0.5"
                >
                  <span>Đăng ký miễn phí</span>
                  <span className="text-xs">→</span>
                </Link>
              </p>
            </div>

            {/* Security Disclaimer Notice */}
            <div className="mt-6 flex items-start gap-2 text-slate-500 justify-center sm:justify-start">
              <span className="material-symbols-outlined text-base text-amber-500 shrink-0 mt-0.5">
                verified
              </span>
              <p className="text-xs text-slate-500 leading-relaxed">
                <strong className="font-semibold text-[#0F172A]">Lưu ý an toàn:</strong> Không bao giờ chia sẻ tài khoản hoặc mã OTP xác thực với bất kỳ ai, kể cả chuyên viên hỗ trợ hệ thống.
              </p>
            </div>
          </div>
        </div>
      </div>
      <ComingSoonDialog open={facebookNoticeOpen} description="Đăng nhập bằng Facebook đang được phát triển. Bạn có thể đăng nhập bằng Google hoặc email trong lúc này." onClose={() => setFacebookNoticeOpen(false)} />
    </div>
  );
};
