import React, { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const currentUser = useAppStore(state => state.currentUser);

  const navItems = [
    {
      title: 'Tổng quan',
      path: '/quan-tri-tong-quan',
      icon: 'dashboard',
    },
    {
      title: 'Người dùng',
      path: '/quan-tri-nguoi-dung',
      icon: 'group',
    },
    {
      title: 'Kịch bản & Khóa học',
      path: '/quan-tri-khoa-hoc',
      icon: 'school',
    },
    {
      title: 'Ngân hàng câu hỏi phản xạ',
      path: '/quan-tri-ngan-hang-cau-hoi',
      icon: 'quiz',
    },
    {
      title: 'Quy tắc & Cảnh báo',
      path: '/quan-tri-kho-tri-thuc',
      icon: 'database',
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col font-sans antialiased">
      {/* Top Admin Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-b border-slate-200/80 shadow-[0_1px_8px_rgba(0,0,0,0.03)] h-16">
        <div className="h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between lg:pl-72">
          <div className="flex items-center gap-3">
            {/* Mobile Sidebar Toggle Button */}
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              aria-label="Toggle admin sidebar"
            >
              <span className="material-symbols-outlined text-2xl">
                {isMobileSidebarOpen ? 'close' : 'menu'}
              </span>
            </button>

            {/* System Status Pill */}
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Giao diện quản trị
              </span>
            </div>
          </div>

          {/* Admin User Info */}
          <div className="flex items-center gap-3.5">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-slate-900 leading-tight">{currentUser?.name || 'Quản trị viên'}</p>
              <p className="text-xs text-slate-500 font-mono">{currentUser?.email}</p>
            </div>
            <div className="relative">
              <img
                src={currentUser?.avatar}
                alt="Quản trị viên"
                className="w-9 h-9 rounded-full object-cover shadow-[0_1px_3px_rgba(15,23,42,0.08)] ring-2 ring-blue-100"
              />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
            </div>
          </div>
        </div>
      </header>

      {/* Backdrop for mobile */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 z-40 lg:hidden backdrop-blur-xs transition-opacity"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Admin Sidebar */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 w-64 md:w-68 bg-white border-r border-slate-200/80 shadow-[0_1px_8px_rgba(0,0,0,0.03)] flex flex-col transition-transform duration-200 ease-in-out ${
          isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand / Logo */}
        <div className="h-16 px-6 flex items-center gap-3 border-b border-slate-100">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#004AC6] to-blue-500 flex items-center justify-center text-white shadow-sm shadow-blue-500/20">
              <span className="material-symbols-outlined text-xl">shield_person</span>
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold text-slate-900 tracking-tight leading-tight">CyberAware</span>
              <span className="text-[10px] font-bold text-[#004AC6] tracking-wider uppercase">QUẢN TRỊ VIÊN</span>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <div className="px-4 py-5 flex-1 overflow-y-auto">
          <div className="mb-2.5 px-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Điều hướng quản trị</span>
          </div>
          <nav className="flex flex-col space-y-1.5">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm transition-colors ${
                    isActive
                      ? 'bg-[#004AC6] text-white font-semibold shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`
                }
              >
                <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                <span>{item.title}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Back to Citizen Portal */}
        <div className="p-4 mt-auto border-t border-slate-100">
          <button
            type="button"
            onClick={() => {
              setIsMobileSidebarOpen(false);
              navigate('/tong-quan');
            }}
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-800 text-sm font-semibold transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            <span>Quay lại cổng người dùng</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="w-full pt-16 lg:pl-68 bg-[#F8FAFC] min-h-screen flex-1">
        {children}
      </main>
    </div>
  );
};
