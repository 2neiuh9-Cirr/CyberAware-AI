import React, { useState, useRef, useEffect, useCallback } from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { ShieldCheck, Menu, X, AlertTriangle, ChevronDown, Sparkles, LogOut, BookOpen, ShieldAlert, LayoutDashboard, Settings, Search, Moon, Sun } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { setSiteLanguage, toggleSiteTheme, tr, useSitePreferences } from '../../sitePreferences';
import { SiteSearchDialog } from './SiteSearchDialog';
import { prepareBrowserTranslator } from '../../siteTranslationService';

export const Header: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isMobileMenuOpen, setMobileMenuOpen, setReportModalOpen, currentUser, logout } = useAppStore();
  const { language, theme } = useSitePreferences();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const closeSearch = useCallback(() => setSearchOpen(false), []);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close user dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close menus on route change
  useEffect(() => {
    setShowUserMenu(false);
    setMobileMenuOpen(false);
    setSearchOpen(false);
  }, [location.pathname, setMobileMenuOpen]);

  const navItems = [
    { name: tr(language, 'Trang chủ', 'Home'), path: '/' },
    { name: tr(language, 'Kiểm tra lừa đảo', 'Scam check'), path: '/kiem-tra' },
    { name: tr(language, 'Học tập', 'Learning'), path: '/hoc-tap' },
    { name: tr(language, 'Cảnh báo', 'Warnings'), path: '/canh-bao' },
    { name: tr(language, 'Báo cáo', 'Reports'), path: '/bao-cao' },
    { name: tr(language, 'Giới thiệu', 'About'), path: '/gioi-thieu' },
  ];

  const handleLogout = async () => {
    await logout();
    if (!useAppStore.getState().currentUser) {
      setShowUserMenu(false);
      setMobileMenuOpen(false);
      navigate('/dang-nhap', { replace: true });
    }
  };

  return (
    <>
      {/* SaaS High-End Navigation Bar */}
      <header className="fixed top-0 left-0 right-0 h-[64px] bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-[0_1px_3px_0_rgba(15,23,42,0.03)] z-50 transition-all">
        <div className="w-full max-w-[1360px] h-full mx-auto flex items-center justify-between gap-2 px-3 sm:px-6 lg:px-8">
          
          {/* 1. Left Zone: Brand Identity & Logo */}
          <div className="flex items-center shrink-0">
            <Link 
              to="/" 
              className="flex items-center gap-2.5 group select-none focus:outline-none"
              aria-label={tr(language, 'CyberAware AI Trang chủ', 'CyberAware AI Home')}
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#004AC6] to-[#003896] text-white flex items-center justify-center shadow-xs group-hover:shadow-sm group-hover:scale-102 transition-all duration-200">
                <ShieldCheck className="w-5 h-5 text-white" strokeWidth={2.2} />
              </div>
              <div className="flex flex-col max-[430px]:hidden">
                <span className="text-[#0F172A] font-extrabold text-[17px] tracking-[-0.03em] leading-tight">
                  CyberAware <span className="text-[#004AC6]">AI</span>
                </span>
                <span className="hidden text-[10px] font-mono font-medium text-slate-400 tracking-wider uppercase leading-none sm:block">
                  Cyber Defense
                </span>
              </div>
            </Link>
          </div>

          {/* 2. Center Zone: Clean SaaS Navigation Menu (Desktop) */}
          <nav 
            className="hidden xl:flex items-center justify-center gap-1 xl:gap-2"
            aria-label={tr(language, 'Menu chính', 'Main navigation')}
          >
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `px-3.5 py-2 rounded-lg text-[13px] xl:text-sm font-semibold transition-colors duration-200 ease-out whitespace-nowrap ${
                    isActive
                      ? 'bg-blue-50/90 text-[#004AC6]'
                      : 'bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                  }`
                }
              >
                {item.name}
              </NavLink>
            ))}
          </nav>

          {/* 3. Right Zone: Action CTA & Account Controls */}
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            
            {/* Quick Report Button (Desktop subtle pill) */}
            <button
              onClick={() => setReportModalOpen(true)}
              className="hidden 2xl:flex items-center gap-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100/90 active:scale-97 px-3 py-1.5 rounded-lg border border-rose-200/80 transition-colors cursor-pointer"
              title="Báo cáo lừa đảo cộng đồng"
              type="button"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              <span>Báo cáo</span>
            </button>

            <div className="flex items-center gap-1 sm:gap-1.5" aria-label={tr(language, 'Công cụ giao diện', 'Site tools')}>
              <button type="button" onClick={() => setSearchOpen(true)} aria-label={tr(language, 'Tìm kiếm', 'Search')} title={tr(language, 'Tìm kiếm', 'Search')} className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-[#004AC6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004AC6] sm:h-10 sm:w-10"><Search className="h-[18px] w-[18px]" /></button>
              <button type="button" onClick={() => { if (language === 'vi') prepareBrowserTranslator(); setSiteLanguage(language === 'vi' ? 'en' : 'vi'); }} aria-label={tr(language, 'Chuyển sang tiếng Anh', 'Switch to Vietnamese')} title={tr(language, 'Chuyển sang tiếng Anh', 'Switch to Vietnamese')} className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-[11px] font-extrabold tracking-tight text-slate-700 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-[#004AC6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004AC6] sm:h-10 sm:w-10">{language === 'vi' ? 'VI' : 'EN'}</button>
              <button type="button" onClick={toggleSiteTheme} aria-label={theme === 'light' ? tr(language, 'Bật giao diện tối', 'Switch to dark mode') : tr(language, 'Bật giao diện sáng', 'Switch to light mode')} title={theme === 'light' ? tr(language, 'Giao diện tối', 'Dark mode') : tr(language, 'Giao diện sáng', 'Light mode')} aria-pressed={theme === 'dark'} className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-[#004AC6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004AC6] sm:h-10 sm:w-10">{theme === 'light' ? <Moon className="h-[18px] w-[18px]" /> : <Sun className="h-[18px] w-[18px]" />}</button>
            </div>

            {/* Vertical Separator for Visual Clarity */}
            <div className="hidden md:block w-px h-5 bg-slate-200 mx-0.5" aria-hidden="true" />

            {/* Authentication Group */}
            {currentUser ? (
              <div className="hidden md:flex items-center gap-2 text-xs font-medium text-slate-600">
                <Link to="/tong-quan" className="truncate max-w-[90px] 2xl:max-w-[140px] text-slate-800 font-semibold hover:text-[#004AC6] transition-colors" title={tr(language, 'Đi đến tổng quan cá nhân', 'Open your dashboard')}>
                  {currentUser.name}
                </Link>
                <span className="text-slate-300">/</span>
                <button
                  onClick={() => void handleLogout()}
                  className="hover:text-rose-600 transition-colors font-semibold cursor-pointer"
                  type="button"
                >
                  Đăng xuất
                </button>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-1.5 text-xs sm:text-sm">
                <Link
                  to="/dang-nhap"
                  className="px-2.5 py-1.5 rounded-lg font-semibold text-slate-600 hover:text-[#004AC6] hover:bg-slate-100/80 transition-all duration-150 whitespace-nowrap"
                >
                  Đăng nhập
                </Link>
                <Link
                  to="/dang-ky"
                  className="px-3 py-1.5 rounded-lg font-semibold text-[#004AC6] bg-blue-50/80 hover:bg-blue-100/80 border border-blue-200/80 transition-all duration-150 whitespace-nowrap shadow-2xs"
                >
                  Đăng ký
                </Link>
              </div>
            )}

            {/* User Avatar with Status Indicator & Popover Menu */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => {
                  if (currentUser) {
                    setShowUserMenu(!showUserMenu);
                  } else {
                    navigate('/dang-nhap');
                  }
                }}
                className="relative flex items-center justify-center p-0.5 rounded-full ring-2 ring-slate-100 hover:ring-[#004AC6]/30 transition-all duration-200 focus:outline-none cursor-pointer"
                aria-label={currentUser ? `Menu người dùng: ${currentUser.name}` : 'Đăng nhập tài khoản'}
                aria-expanded={showUserMenu}
                type="button"
              >
                <img
                  src={currentUser?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80"}
                  alt="Ảnh đại diện"
                  className="w-8 h-8 rounded-full object-cover"
                />
                <span 
                  className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${
                    currentUser ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                  title={currentUser ? 'Trực tuyến' : 'Chưa đăng nhập'}
                />
              </button>

              {/* User Popover Menu */}
              {showUserMenu && currentUser && (
                <div className="absolute right-0 mt-2.5 w-[min(16rem,calc(100vw-2rem))] bg-white rounded-2xl shadow-xl border border-slate-200/80 py-2.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Tài khoản thành viên</p>
                    <Link to="/tong-quan" onClick={() => setShowUserMenu(false)} className="block text-sm font-bold text-slate-900 hover:text-[#004AC6] transition-colors truncate mt-0.5">{currentUser.name}</Link>
                    <p className="text-xs text-slate-500 truncate">{currentUser.email}</p>
                    <div className="inline-flex items-center gap-1.5 mt-2 text-[11px] font-semibold bg-blue-50 text-[#004AC6] px-2.5 py-0.5 rounded-full border border-blue-100">
                      <Sparkles className="w-3 h-3 text-[#004AC6]" />
                      <span>Cấp độ: {currentUser.level || 'Người tự vệ số'}</span>
                    </div>
                  </div>

                  <div className="py-1">
                    {currentUser.role === 'admin' && <Link to="/quan-tri-tong-quan" onClick={() => setShowUserMenu(false)} className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-[#004AC6] hover:bg-blue-50 transition-colors"><span className="material-symbols-outlined text-[16px]">admin_panel_settings</span><span>Quản trị hệ thống</span></Link>}
                    <Link to="/tong-quan" onClick={() => setShowUserMenu(false)} className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-slate-700 hover:text-[#004AC6] hover:bg-slate-50 transition-colors">
                      <LayoutDashboard className="w-3.5 h-3.5 text-slate-400" />
                      <span>Tổng quan an ninh</span>
                    </Link>
                    <Link to="/cai-dat" onClick={() => setShowUserMenu(false)} className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-slate-700 hover:text-[#004AC6] hover:bg-slate-50 transition-colors">
                      <Settings className="w-3.5 h-3.5 text-slate-400" />
                      <span>Cài đặt &amp; Quyền riêng tư</span>
                    </Link>
                    <Link
                      to="/hoc-tap"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-slate-700 hover:text-[#004AC6] hover:bg-slate-50 transition-colors"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                      <span>Khóa học của tôi</span>
                    </Link>
                    <Link
                      to="/bao-cao"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-slate-700 hover:text-[#004AC6] hover:bg-slate-50 transition-colors"
                    >
                      <ShieldAlert className="w-3.5 h-3.5 text-slate-400" />
                      <span>Lịch sử báo cáo</span>
                    </Link>
                  </div>

                  <div className="border-t border-slate-100 pt-1 mt-1">
                    <button
                      onClick={() => void handleLogout()}
                      className="w-full text-left flex items-center gap-2 px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      type="button"
                    >
                      <LogOut className="w-3.5 h-3.5 text-rose-500" />
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Menu Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!isMobileMenuOpen)}
              className="xl:hidden p-2 rounded-xl text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/70 transition-colors cursor-pointer"
              aria-label={isMobileMenuOpen ? 'Đóng menu' : 'Mở menu điều hướng'}
              type="button"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>
      </header>

      <SiteSearchDialog open={searchOpen} onClose={closeSearch} />

      {/* Mobile Responsive Navigation Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 top-[64px] z-40 xl:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Body */}
          <div className="relative bg-white border-b border-slate-200 shadow-xl px-5 py-5 flex flex-col gap-4 animate-in slide-in-from-top-3 duration-200 max-h-[calc(100dvh-64px)] overflow-y-auto">
            {/* Nav links */}
            <nav className="flex flex-col gap-1" aria-label="Menu di động">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-between transition-colors duration-200 ease-out ${
                      isActive
                        ? 'bg-blue-50/90 text-[#004AC6]'
                        : 'bg-transparent text-slate-700 hover:bg-slate-50'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span>{item.name}</span>
                      <span className={`text-xs ${isActive ? 'text-[#004AC6]' : 'text-slate-400'}`}>→</span>
                    </>
                  )}
                </NavLink>
              ))}
            </nav>

            {/* Account & Quick Actions */}
            <div className="pt-3 border-t border-slate-100 flex flex-col gap-2.5">
              {currentUser ? (
                <div className="flex flex-col gap-2">
                  <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between border border-slate-200/80">
                    <Link to="/tong-quan" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2.5 min-w-0">
                      <img src={currentUser.avatar} alt={currentUser.name} className="w-8 h-8 rounded-full object-cover shrink-0" />
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold text-slate-900 truncate">{currentUser.name}</span>
                        <span className="text-[11px] text-slate-500 truncate">{currentUser.email}</span>
                      </div>
                    </Link>
                    <button onClick={() => void handleLogout()} className="text-xs font-semibold text-rose-600 hover:text-rose-700 cursor-pointer shrink-0 ml-2" type="button">Đăng xuất</button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Link to="/tong-quan" onClick={() => setMobileMenuOpen(false)} className="py-2 text-center bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition-colors">Tổng quan an ninh</Link>
                    <Link to="/cai-dat" onClick={() => setMobileMenuOpen(false)} className="py-2 text-center bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition-colors">Cài đặt tài khoản</Link>
                    </div>
                  {currentUser.role === 'admin' && <Link to="/quan-tri-tong-quan" onClick={() => setMobileMenuOpen(false)} className="py-2 text-center bg-blue-50 hover:bg-blue-100 text-[#004AC6] text-xs font-semibold rounded-xl transition-colors inline-flex items-center justify-center gap-1"><span className="material-symbols-outlined text-[16px]">admin_panel_settings</span>Quản trị hệ thống</Link>}
                  </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    to="/dang-nhap"
                    onClick={() => setMobileMenuOpen(false)}
                    className="py-2.5 text-center bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-colors"
                  >
                    Đăng nhập
                  </Link>
                  <Link
                    to="/dang-ky"
                    onClick={() => setMobileMenuOpen(false)}
                    className="py-2.5 text-center bg-[#004AC6] text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
                  >
                    Đăng ký
                  </Link>
                </div>
              )}

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setReportModalOpen(true);
                }}
                className="w-full py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs rounded-xl border border-rose-200 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                type="button"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                <span>Báo cáo lừa đảo ngay</span>
              </button>

              <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] text-slate-400 pt-1 px-1">
                <span>Hotline Cục ATTT: 156 / 5656</span>
                <span className="text-emerald-600 font-medium">Không nhập OTP</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
