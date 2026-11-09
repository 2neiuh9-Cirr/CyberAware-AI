import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { api, json } from '../../api';
import { notify } from '../../components/common/toast';
import type { User } from '../../types';

type PrivacySettings = { autoDelete30Days: boolean; anonymousScamSharing: boolean; emailBankAlerts: boolean };
type Session = { id: string; device: string; browser: string; isCurrent: boolean; lastActiveAt: string | null; location: string | null; ip: string | null };

export const AccountSettingsPage: React.FC = () => {
  const { currentUser } = useAppStore();
  const navigate = useNavigate();
  const avatarInput = useRef<HTMLInputElement>(null);
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>({ autoDelete30Days: false, anonymousScamSharing: false, emailBankAlerts: false });
  const [userSessions, setUserSessions] = useState<Session[]>([]);
  const [linkedProviders, setLinkedProviders] = useState({ google: false, facebook: false });
  const [facebookConfigured, setFacebookConfigured] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);

  // Active section for sidebar navigation
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'privacy' | 'sessions'>('profile');

  // Profile form state
  const [fullName, setFullName] = useState(currentUser?.name || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  useEffect(() => { setFullName(currentUser?.name || ''); setPhone(currentUser?.phone || ''); }, [currentUser?.name, currentUser?.phone]);
  useEffect(() => {
    if (!currentUser) return;
    let active = true;
    Promise.all([
      api<PrivacySettings>('/me/privacy-settings'),
      api<{ items: Session[] }>('/auth/sessions'),
      api<{ google: boolean; facebook: boolean }>('/auth/oauth/links'),
      api<{ google: boolean; facebook: boolean }>('/auth/oauth/providers'),
    ])
      .then(([settings, sessions, links, providers]) => { if (active) { setPrivacySettings(settings); setUserSessions(sessions.items); setLinkedProviders(links); setFacebookConfigured(providers.facebook); } })
      .catch(error => { if (active) setPasswordError((error as Error).message); })
      .finally(() => { if (active) setLoadingSettings(false); });
    return () => { active = false; };
  }, [currentUser?.id]);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const linked = params.get('oauth_link');
    const error = params.get('oauth_link_error');
    if (linked === 'facebook') notify('Bạn có thể đăng nhập bằng Google hoặc Facebook vào cùng tài khoản.', 'success', 'Đã liên kết Facebook');
    if (error) {
      const messages: Record<string, string> = {
        cancelled: 'Bạn đã hủy xác nhận trên Facebook.',
        oauth_email: 'Facebook chưa cung cấp email hợp lệ. Hãy cấp quyền email rồi thử lại.',
        oauth_link_session: 'Phiên đăng nhập đã thay đổi. Hãy đăng nhập lại rồi thử liên kết.',
        oauth_linked_elsewhere: 'Facebook này đã được liên kết với tài khoản CyberAware khác.',
      };
      notify(messages[error] || 'Không thể liên kết Facebook. Vui lòng thử lại.', 'error', 'Liên kết Facebook thất bại');
    }
    if (linked || error) window.history.replaceState({}, '', window.location.pathname);
  }, []);

  // Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const showToast = (title: string, message: string) => notify(message, title.startsWith('Không thể') ? 'error' : 'success', title);

  // Password strength calculation
  const hasMinLength = newPassword.length >= 8;
  const hasUpperLower = /[a-z]/.test(newPassword) && /[A-Z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);

  const criteriaMetCount = [hasMinLength, hasUpperLower, hasNumber, hasSpecial].filter(Boolean).length;

  let strengthLabel = 'Chưa nhập mật khẩu';
  let strengthColor = 'text-slate-400';
  if (newPassword.length > 0) {
    if (criteriaMetCount === 4) {
      strengthLabel = 'Rất mạnh (Khuyến nghị)';
      strengthColor = 'text-emerald-600';
    } else if (criteriaMetCount === 3) {
      strengthLabel = 'Mạnh';
      strengthColor = 'text-emerald-500';
    } else if (criteriaMetCount === 2) {
      strengthLabel = 'Trung bình';
      strengthColor = 'text-amber-500';
    } else {
      strengthLabel = 'Yếu';
      strengthColor = 'text-rose-500';
    }
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const data = await api<{ user: User }>('/me/profile', json('PATCH', { name: fullName, phone }));
      useAppStore.setState({ currentUser: data.user });
      showToast('Thông tin cá nhân', 'Hồ sơ đã được lưu thành công.');
    } catch (error) { showToast('Không thể lưu hồ sơ', (error as Error).message); }
    finally { setBusy(false); }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) { setPasswordError('Mật khẩu xác nhận không khớp.'); return; }
    if (newPassword.length < 8 || newPassword.length > 128) { setPasswordError('Mật khẩu mới phải dài từ 8 đến 128 ký tự.'); return; }
    setPasswordError(''); setBusy(true);
    try {
      await api('/auth/change-password', json('POST', { currentPassword, newPassword }));
      useAppStore.getState().expireSession();
      navigate('/dang-nhap', { replace: true });
    } catch (error) { setPasswordError((error as Error).message); }
    finally { setBusy(false); }
  };

  const handleTogglePrivacy = async (key: keyof PrivacySettings, title: string, message: string) => {
    setBusy(true);
    try {
      const data = await api<{ settings: PrivacySettings }>('/me/privacy-settings', json('PATCH', { [key]: !privacySettings[key] }));
      setPrivacySettings(data.settings);
      showToast(title, message);
    } catch (error) { showToast('Không thể lưu tùy chọn', (error as Error).message); }
    finally { setBusy(false); }
  };

  const handleTerminateSession = async (sessionId: string, deviceName: string) => {
    setBusy(true);
    try {
      const data = await api<{ currentRevoked: boolean }>(`/auth/sessions/${encodeURIComponent(sessionId)}`, { method: 'DELETE' });
      if (data.currentRevoked) { useAppStore.getState().expireSession(); navigate('/dang-nhap', { replace: true }); return; }
      setUserSessions(old => old.filter(session => session.id !== sessionId));
      showToast('Quản lý phiên đăng nhập', `Đã đăng xuất thiết bị ${deviceName}.`);
    } catch (error) { showToast('Không thể đăng xuất thiết bị', (error as Error).message); }
    finally { setBusy(false); }
  };

  const handleTerminateAllOthers = async () => {
    setBusy(true);
    try {
      const data = await api<{ revokedCount: number }>('/auth/sessions/revoke-others', json('POST'));
      setUserSessions(old => old.filter(session => session.isCurrent));
      showToast('Quản lý phiên đăng nhập', `Đã đăng xuất ${data.revokedCount} thiết bị khác.`);
    } catch (error) { showToast('Không thể đăng xuất thiết bị', (error as Error).message); }
    finally { setBusy(false); }
  };

  const handleAvatar = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    try {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Chỉ nhận ảnh JPEG, PNG hoặc WebP.');
      const image = await createImageBitmap(file);
      const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 256;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Không thể xử lý ảnh trên thiết bị này.');
      const size = Math.min(image.width, image.height);
      context.drawImage(image, (image.width - size) / 2, (image.height - size) / 2, size, size, 0, 0, 256, 256);
      image.close();
      const data = await api<{ avatar: string }>('/me/avatar', json('PUT', { dataUrl: canvas.toDataURL('image/jpeg', 0.8) }));
      useAppStore.setState(state => ({ currentUser: state.currentUser ? { ...state.currentUser, avatar: data.avatar } : null }));
      showToast('Ảnh đại diện', 'Ảnh đại diện đã được cập nhật.');
    } catch (error) { showToast('Không thể cập nhật ảnh', (error as Error).message); }
    finally { setBusy(false); if (avatarInput.current) avatarInput.current.value = ''; }
  };

  const scrollToSection = (id: string, tab: 'profile' | 'password' | 'privacy' | 'sessions') => {
    setActiveTab(tab);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="w-full bg-[#F8FAFC] min-h-screen pt-20 pb-16">
      
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 w-full">
        {loadingSettings && <p role="status" className="mb-6 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">Đang tải cài đặt tài khoản…</p>}
        
        {/* Breadcrumb & Top Indicator */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <nav className="flex items-center gap-2 text-xs sm:text-sm text-slate-500 mb-2 font-medium">
              <Link to="/tong-quan" className="hover:text-[#004AC6] transition-colors flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base">home</span>
                <span>Tổng quan</span>
              </Link>
              <span className="text-slate-300 font-mono">/</span>
              <span className="text-slate-900 font-semibold">Cài đặt tài khoản</span>
            </nav>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Cài đặt &amp; Quyền riêng tư tài khoản
              </h1>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200/60">
                <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                  verified_user
                </span>
                <span>Tài khoản CyberAware AI</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            <div className="px-4 py-2 rounded-xl bg-white border border-slate-200/80 flex items-center gap-3 shadow-2xs">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-900">Lớp bảo vệ chủ động</span>
                <span className="font-mono text-[11px] text-slate-500">Tài khoản CyberAware AI</span>
              </div>
            </div>
          </div>
        </div>

        {/* Layout Grid: Left Sidebar Navigation & Right Content Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Navigation Sidebar & User Mini Profile (4 Cols) */}
          <aside className="lg:col-span-4 flex flex-col gap-6">
            
            {/* User Badge Card */}
            <div className="rounded-2xl bg-white p-6 shadow-xs border border-slate-200/80 flex flex-col gap-5">
              <div className="flex items-center gap-4">
                <div className="relative shrink-0">
                  <img
                    className="w-16 h-16 rounded-full object-cover shadow-xs border-2 border-white ring-2 ring-slate-100"
                    src={currentUser?.avatar || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80"}
                    alt={currentUser?.name || "Ảnh đại diện"}
                  />
                  <button
                    onClick={() => avatarInput.current?.click()}
                    disabled={busy}
                    className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-[#004AC6] text-white flex items-center justify-center hover:bg-[#003EA8] shadow-xs cursor-pointer border border-white"
                    title="Thay đổi ảnh đại diện"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[13px]">photo_camera</span>
                  </button>
                  <input ref={avatarInput} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label="Chọn ảnh đại diện" onChange={(event) => void handleAvatar(event.target.files?.[0])} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-base font-bold text-slate-900 truncate">
                    {currentUser?.name || 'Tài khoản của bạn'}
                  </span>
                  <span className="text-xs text-slate-500 truncate font-mono">
                    {currentUser?.email || ''}
                  </span>
                  <span className="font-mono text-xs text-[#004AC6] font-semibold mt-1">
                    {currentUser?.level || 'Thành viên'}
                  </span>
                </div>
              </div>

              {/* Trust & Privacy Score Meter */}
              <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-100 flex flex-col gap-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-base text-[#004AC6]">shield_lock</span>
                    Chỉ số an toàn bảo mật
                  </span>
                  <span className="font-mono text-xs font-bold text-slate-500">Chưa có dữ liệu</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                  <div className="h-full bg-slate-300 rounded-full" style={{ width: '0%' }} />
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Chỉ số an toàn sẽ hiển thị khi có dữ liệu đánh giá phù hợp.
                </p>
              </div>
            </div>

            {/* Section Jump Menu */}
            <nav className="rounded-2xl bg-white p-3 shadow-xs border border-slate-200/80 flex flex-col gap-1.5" aria-label="Menu cài đặt">
              <button
                onClick={() => scrollToSection('section-profile', 'profile')}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-left transition-all text-xs sm:text-sm font-semibold cursor-pointer ${
                  activeTab === 'profile'
                    ? 'text-[#004AC6] bg-blue-50/90 font-bold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
                type="button"
              >
                <span className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-lg">badge</span>
                  Thông tin cá nhân
                </span>
                <span className="material-symbols-outlined text-base">chevron_right</span>
              </button>

              <button
                onClick={() => scrollToSection('section-password', 'password')}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-left transition-all text-xs sm:text-sm font-semibold cursor-pointer ${
                  activeTab === 'password'
                    ? 'text-[#004AC6] bg-blue-50/90 font-bold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
                type="button"
              >
                <span className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-lg">lock_reset</span>
                  Đổi mật khẩu
                </span>
                <span className="material-symbols-outlined text-base">chevron_right</span>
              </button>

              <button
                onClick={() => scrollToSection('section-privacy', 'privacy')}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-left transition-all text-xs sm:text-sm font-semibold cursor-pointer ${
                  activeTab === 'privacy'
                    ? 'text-[#004AC6] bg-blue-50/90 font-bold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
                type="button"
              >
                <span className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-lg">policy</span>
                  Quyền riêng tư &amp; Dữ liệu
                </span>
                <span className="material-symbols-outlined text-base">chevron_right</span>
              </button>

              <button
                onClick={() => scrollToSection('section-sessions', 'sessions')}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-left transition-all text-xs sm:text-sm font-semibold cursor-pointer ${
                  activeTab === 'sessions'
                    ? 'text-[#004AC6] bg-blue-50/90 font-bold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
                type="button"
              >
                <span className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-lg">devices</span>
                  Quản lý phiên đăng nhập
                </span>
                <span className="material-symbols-outlined text-base">chevron_right</span>
              </button>
            </nav>

            {/* Account safety reminder */}
            <div className="rounded-2xl bg-blue-50/80 border border-blue-200/70 p-5 flex flex-col gap-3 shadow-2xs">
              <div className="flex items-center gap-2 text-[#004AC6] text-xs font-bold">
                <span className="material-symbols-outlined text-base">verified_user</span>
                <span>Bảo vệ tài khoản của bạn</span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                Nếu nghi ngờ tài khoản bị truy cập trái phép, hãy đổi mật khẩu và đăng xuất các thiết bị khác trong mục quản lý phiên.
              </p>
              <div className="font-mono text-xs font-bold text-[#004AC6]">
                Kiểm tra các phiên đăng nhập bên dưới.
              </div>
            </div>

          </aside>

          {/* Right Column: Settings Content Sections (8 Cols) */}
          <main className="lg:col-span-8 flex flex-col gap-8">
            
            {/* 1. THÔNG TIN CÁ NHÂN */}
            <section
              id="section-profile"
              className="rounded-2xl bg-white p-6 lg:p-8 shadow-xs border border-slate-200/80 flex flex-col gap-6"
            >
              <div className="flex flex-col gap-1 pb-2 border-b border-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#004AC6] text-2xl">person</span>
                    1. Thông tin cá nhân
                  </h2>
                  <span className="font-mono text-xs text-slate-400">Thông tin tài khoản hiện tại</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-500">
                  Cập nhật họ tên và số điện thoại liên hệ của tài khoản.
                </p>
              </div>

              <form onSubmit={handleSaveProfile} className="flex flex-col gap-5">
                {/* Full name */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs sm:text-sm font-bold text-slate-900" htmlFor="fullName">
                    Họ và tên
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined text-lg">
                      badge
                    </span>
                    <input
                      id="fullName"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full h-11 pl-11 pr-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs sm:text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#004AC6] focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                {/* Email (with verification badge) */}
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="text-xs sm:text-sm font-bold text-slate-900" htmlFor="emailInput">
                      Email đăng nhập
                    </label>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200/60">
                      <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>
                        check_circle
                      </span>
                      Email đăng nhập
                    </span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined text-lg">
                      mail
                    </span>
                    <input
                      id="emailInput"
                      type="email"
                      readOnly
                      value={currentUser?.email || ''}
                      className="w-full h-11 pl-11 pr-4 rounded-xl bg-slate-100/80 border border-slate-200/80 text-slate-600 text-xs sm:text-sm font-mono cursor-not-allowed select-none"
                    />
                  </div>
                  <span className="text-xs text-slate-500">
                    Email này được dùng cho đăng nhập và khôi phục mật khẩu.
                  </span>
                </div>

                {/* Safe Contact Phone */}
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="text-xs sm:text-sm font-bold text-slate-900" htmlFor="phoneNumber">
                      Số điện thoại liên hệ an toàn <span className="text-slate-400 font-normal">(tùy chọn)</span>
                    </label>
                    <span className="text-xs text-slate-500 font-medium">Được lưu trong tài khoản</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined text-lg">
                      call
                    </span>
                    <input
                      id="phoneNumber"
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="09xx xxx xxx"
                      className="w-full h-11 pl-11 pr-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs sm:text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#004AC6] focus:border-transparent transition-all"
                    />
                  </div>
                  <span className="text-xs text-slate-500">
                    Số điện thoại được lưu cùng hồ sơ của bạn.
                  </span>
                </div>

                <div className="pt-2 flex items-center justify-end">
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-[#004AC6] text-white text-xs sm:text-sm font-semibold hover:bg-[#003EA8] transition-colors shadow-xs hover:shadow-md inline-flex items-center gap-2 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-lg">save</span>
                    Lưu thay đổi
                  </button>
                </div>
              </form>
              <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Đăng nhập bằng Facebook</h3>
                  <p className="text-xs text-slate-600 mt-1">Liên kết Facebook khi đang đăng nhập để dùng cùng tài khoản và dữ liệu CyberAware.</p>
                </div>
                <button
                  type="button"
                  disabled={!facebookConfigured || linkedProviders.facebook}
                  onClick={() => window.location.assign('/api/auth/oauth/facebook/link/start')}
                  className="shrink-0 rounded-xl bg-[#004AC6] px-4 py-2.5 text-sm font-semibold text-white disabled:bg-slate-300 disabled:cursor-not-allowed hover:bg-[#003EA8] cursor-pointer"
                >
                  {linkedProviders.facebook ? 'Đã liên kết Facebook' : facebookConfigured ? 'Liên kết Facebook' : 'Facebook chưa sẵn sàng'}
                </button>
              </div>
            </section>

            {/* 2. ĐỔI MẬT KHẨU */}
            <section
              id="section-password"
              className="rounded-2xl bg-white p-6 lg:p-8 shadow-xs border border-slate-200/80 flex flex-col gap-6"
            >
              <div className="flex flex-col gap-1 pb-2 border-b border-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#004AC6] text-2xl">key</span>
                    2. Đổi mật khẩu
                  </h2>
                  <span className="inline-flex items-center gap-1 text-[#004AC6] text-xs font-semibold bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200/60 self-start sm:self-auto">
                    <span className="material-symbols-outlined text-xs">shield</span>
                    Gợi ý tạo mật khẩu mạnh
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-500">
                  Tạo mật khẩu dài, ngẫu nhiên và tránh sử dụng lại mật khẩu tài khoản ngân hàng hoặc mạng xã hội.
                </p>
              </div>

              {passwordError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">error</span>
                  <span>{passwordError}</span>
                </div>
              )}

              <form onSubmit={handleUpdatePassword} className="flex flex-col gap-5">
                {/* Current Password */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs sm:text-sm font-bold text-slate-900" htmlFor="currentPassword">
                    Mật khẩu hiện tại
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined text-lg">
                      lock
                    </span>
                    <input
                      id="currentPassword"
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Nhập mật khẩu hiện tại"
                      className="w-full h-11 pl-11 pr-11 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs sm:text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#004AC6] focus:border-transparent transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1"
                      aria-label="Ẩn hiện mật khẩu"
                    >
                      <span className="material-symbols-outlined text-lg">
                        {showCurrentPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs sm:text-sm font-bold text-slate-900" htmlFor="newPassword">
                    Mật khẩu mới
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined text-lg">
                      password
                    </span>
                    <input
                      id="newPassword"
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Tối thiểu 8 ký tự"
                      className="w-full h-11 pl-11 pr-11 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs sm:text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#004AC6] focus:border-transparent transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1"
                      aria-label="Ẩn hiện mật khẩu"
                    >
                      <span className="material-symbols-outlined text-lg">
                        {showNewPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>

                  {/* Password Strength Meter Component */}
                  <div className="p-4 rounded-xl bg-slate-50/90 border border-slate-200/70 flex flex-col gap-2.5 mt-1">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-500">Độ mạnh mật khẩu:</span>
                      <span className={strengthColor}>{strengthLabel}</span>
                    </div>

                    {/* 4 segment bar */}
                    <div className="grid grid-cols-4 gap-1.5 h-1.5 w-full">
                      <div
                        className={`h-full rounded-full transition-colors ${
                          criteriaMetCount >= 1
                            ? criteriaMetCount >= 3
                              ? 'bg-emerald-500'
                              : criteriaMetCount === 2
                              ? 'bg-amber-400'
                              : 'bg-rose-500'
                            : 'bg-slate-200'
                        }`}
                      />
                      <div
                        className={`h-full rounded-full transition-colors ${
                          criteriaMetCount >= 2
                            ? criteriaMetCount >= 3
                              ? 'bg-emerald-500'
                              : 'bg-amber-400'
                            : 'bg-slate-200'
                        }`}
                      />
                      <div
                        className={`h-full rounded-full transition-colors ${
                          criteriaMetCount >= 3 ? 'bg-emerald-500' : 'bg-slate-200'
                        }`}
                      />
                      <div
                        className={`h-full rounded-full transition-colors ${
                          criteriaMetCount >= 4 ? 'bg-emerald-500' : 'bg-slate-200'
                        }`}
                      />
                    </div>

                    {/* Checklist criteria */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
                      <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-emerald-600 font-semibold' : 'text-slate-400'}`}>
                        <span className="material-symbols-outlined text-base">
                          {hasMinLength ? 'check_circle' : 'radio_button_unchecked'}
                        </span>
                        <span>Tối thiểu 8 ký tự</span>
                      </div>
                      <div className={`flex items-center gap-1.5 ${hasUpperLower ? 'text-emerald-600 font-semibold' : 'text-slate-400'}`}>
                        <span className="material-symbols-outlined text-base">
                          {hasUpperLower ? 'check_circle' : 'radio_button_unchecked'}
                        </span>
                        <span>Ký tự viết hoa &amp; viết thường</span>
                      </div>
                      <div className={`flex items-center gap-1.5 ${hasNumber ? 'text-emerald-600 font-semibold' : 'text-slate-400'}`}>
                        <span className="material-symbols-outlined text-base">
                          {hasNumber ? 'check_circle' : 'radio_button_unchecked'}
                        </span>
                        <span>Ít nhất 1 chữ số (0-9)</span>
                      </div>
                      <div className={`flex items-center gap-1.5 ${hasSpecial ? 'text-emerald-600 font-semibold' : 'text-slate-400'}`}>
                        <span className="material-symbols-outlined text-base">
                          {hasSpecial ? 'check_circle' : 'radio_button_unchecked'}
                        </span>
                        <span>Ký hiệu đặc biệt (@, #, $, %...)</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Confirm New Password */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs sm:text-sm font-bold text-slate-900" htmlFor="confirmPassword">
                    Xác nhận mật khẩu mới
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined text-lg">
                      lock_clock
                    </span>
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Nhập lại mật khẩu mới vừa đặt"
                      className="w-full h-11 pl-11 pr-11 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs sm:text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#004AC6] focus:border-transparent transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1"
                      aria-label="Ẩn hiện mật khẩu"
                    >
                      <span className="material-symbols-outlined text-lg">
                        {showConfirmPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end">
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-[#004AC6] text-white text-xs sm:text-sm font-semibold hover:bg-[#003EA8] transition-colors shadow-xs hover:shadow-md inline-flex items-center gap-2 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-lg">lock_reset</span>
                    Cập nhật mật khẩu mới
                  </button>
                </div>
              </form>
            </section>

            {/* 3. TÙY CHỌN QUYỀN RIÊNG TƯ & DỮ LIỆU */}
            <section
              id="section-privacy"
              className="rounded-2xl bg-white p-6 lg:p-8 shadow-xs border border-slate-200/80 flex flex-col gap-6"
            >
              <div className="flex flex-col gap-1 pb-2 border-b border-slate-100">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#004AC6] text-2xl">security</span>
                  3. Tùy chọn quyền riêng tư &amp; Dữ liệu
                </h2>
                <p className="text-xs sm:text-sm text-slate-500">
                  Tùy chọn được lưu vào tài khoản. Lịch sử tra cứu sẽ được tự xóa sau 30 ngày khi bạn bật tính năng tương ứng.
                </p>
              </div>

              <div className="flex flex-col gap-4">
                {/* Option 1 */}
                <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/70 hover:bg-slate-100/60 transition-colors flex items-start justify-between gap-4">
                  <div className="flex gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[#004AC6] shrink-0 shadow-2xs border border-slate-200/70">
                      <span className="material-symbols-outlined text-xl">auto_delete</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs sm:text-sm font-bold text-slate-900">
                        Tự động xóa lịch sử tra cứu nhạy cảm sau 30 ngày
                      </span>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Toàn bộ đường dẫn URL, số điện thoại hoặc nội dung tin nhắn lừa đảo bạn đã kiểm tra sẽ được thanh lọc vĩnh viễn khỏi máy chủ định danh sau 30 ngày.
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                    <input
                      type="checkbox"
                      disabled={busy || loadingSettings}
                      checked={privacySettings.autoDelete30Days}
                      onChange={() =>
                        handleTogglePrivacy(
                          'autoDelete30Days',
                          'Cài đặt quyền riêng tư',
                          'Đã lưu thay đổi về thời hạn tự động thanh lọc lịch sử.'
                        )
                      }
                      className="sr-only peer"
                    />
                    <div className="w-12 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#004AC6]" />
                  </label>
                </div>

                {/* Option 2 */}
                <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/70 hover:bg-slate-100/60 transition-colors flex items-start justify-between gap-4">
                  <div className="flex gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[#004AC6] shrink-0 shadow-2xs border border-slate-200/70">
                      <span className="material-symbols-outlined text-xl">share_reviews</span>
                    </div>
                    <div className="flex flex-col">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs sm:text-sm font-bold text-slate-900">
                          Đóng góp mẫu lừa đảo ẩn danh cho cơ sở dữ liệu phòng chống lừa đảo cộng đồng
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200/60">
                          Khuyên dùng
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Lưu lựa chọn của bạn cho tính năng chia sẻ ẩn danh trong tương lai. Hiện chưa gửi dữ liệu cho bên thứ ba.
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                    <input
                      type="checkbox"
                      disabled={busy || loadingSettings}
                      checked={privacySettings.anonymousScamSharing}
                      onChange={() =>
                        handleTogglePrivacy(
                          'anonymousScamSharing',
                          'Đóng góp cộng đồng',
                          'Đã cập nhật trạng thái chia sẻ dữ liệu phòng chống lừa đảo.'
                        )
                      }
                      className="sr-only peer"
                    />
                    <div className="w-12 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#004AC6]" />
                  </label>
                </div>

                {/* Option 3 */}
                <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/70 hover:bg-slate-100/60 transition-colors flex items-start justify-between gap-4">
                  <div className="flex gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[#004AC6] shrink-0 shadow-2xs border border-slate-200/70">
                      <span className="material-symbols-outlined text-xl">notification_important</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs sm:text-sm font-bold text-slate-900">
                        Nhận cảnh báo qua email khi có hình thức lừa đảo mới nhắm vào ngân hàng của bạn
                      </span>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Lưu lựa chọn nhận cảnh báo. Hệ thống chưa tự động phát hiện chiến dịch mới hoặc gửi email cảnh báo.
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                    <input
                      type="checkbox"
                      disabled={busy || loadingSettings}
                      checked={privacySettings.emailBankAlerts}
                      onChange={() =>
                        handleTogglePrivacy(
                          'emailBankAlerts',
                          'Thông báo ngân hàng',
                          'Đã lưu cấu hình nhận cảnh báo lừa đảo trực tuyến qua email.'
                        )
                      }
                      className="sr-only peer"
                    />
                    <div className="w-12 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#004AC6]" />
                  </label>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200/60 flex items-center gap-3">
                <span className="material-symbols-outlined text-[#004AC6] text-xl shrink-0">privacy_tip</span>
                <span className="text-xs text-slate-700">
                  Chia sẻ mẫu ẩn danh và cảnh báo email hiện chỉ lưu lựa chọn của bạn; tính năng gửi dữ liệu và email sẽ được triển khai sau.
                </span>
              </div>
            </section>

            {/* 4. QUẢN LÝ PHIÊN ĐĂNG NHẬP */}
            <section
              id="section-sessions"
              className="rounded-2xl bg-white p-6 lg:p-8 shadow-xs border border-slate-200/80 flex flex-col gap-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100">
                <div className="flex flex-col gap-1">
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#004AC6] text-2xl">devices</span>
                    4. Quản lý phiên đăng nhập
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500">
                    Theo dõi và kiểm soát các thiết bị đang duy trì quyền truy cập vào bảng điều khiển CyberAware AI.
                  </p>
                </div>

                {userSessions.some((s) => !s.isCurrent) && (
                  <button
                    onClick={handleTerminateAllOthers}
                    className="shrink-0 px-4 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition-colors shadow-2xs inline-flex items-center gap-2 cursor-pointer"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-base">logout</span>
                    Đăng xuất khỏi tất cả các thiết bị khác
                  </button>
                )}
              </div>

              {/* Session List */}
              <div className="flex flex-col gap-3.5">
                {userSessions.length === 0 && <p className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-600">{loadingSettings ? 'Đang tải phiên đăng nhập...' : 'Không tìm thấy phiên đăng nhập đang hoạt động.'}</p>}
                {userSessions.map((session) => (
                  <div
                    key={session.id}
                    className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                      session.isCurrent
                        ? 'bg-blue-50/50 border-blue-200/70'
                        : 'bg-slate-50/80 border-slate-200/70 hover:bg-slate-100/60'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-white text-slate-700 flex items-center justify-center shrink-0 shadow-2xs border border-slate-200/70">
                        <span className="material-symbols-outlined text-2xl">
                          {session.device.includes('iPhone') || session.device.includes('Android')
                            ? 'smartphone'
                            : 'laptop_mac'}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs sm:text-sm font-bold text-slate-900">{session.device}</span>
                          {session.isCurrent ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200/60">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                              Đang hoạt động (Thiết bị này)
                            </span>
                          ) : (
                            <span className="text-xs text-slate-500 bg-white border border-slate-200/70 px-2.5 py-0.5 rounded-full font-medium">
                              {session.lastActiveAt ? new Date(session.lastActiveAt).toLocaleString('vi-VN') : 'Chưa có dữ liệu'}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1">
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm text-slate-400">location_on</span>
                            {session.location || 'Chưa xác định vị trí'}
                          </span>
                          <span>•</span>
                          <span className="font-mono text-slate-600">IP: {session.ip || 'Không có dữ liệu'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="sm:self-center">
                      {session.isCurrent ? (
                        <span className="font-semibold text-xs text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-3 py-1.5 rounded-xl inline-block">
                          Phiên xác thực bảo mật cao
                        </span>
                      ) : (
                        <button
                          onClick={() => handleTerminateSession(session.id, session.device)}
                          className="px-3.5 py-1.5 rounded-xl bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold transition-colors cursor-pointer"
                          type="button"
                        >
                          Đăng xuất thiết bị này
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>

          </main>

        </div>

      </div>
    </div>
  );
};
