/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { BrowserRouter, useLocation } from 'react-router-dom';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { NotificationBanner } from './components/layout/NotificationBanner';
import { AppRoutes } from './routes/AppRoutes';
import { ReportScamModal } from './modules/report/ReportScamModal';
import { ScenarioDetailModal } from './modules/scams/ScenarioDetailModal';
import { Chatbot } from './components/chat/Chatbot';
import { ToastViewport } from './components/common/ToastViewport';
import { useAppStore } from './store/useAppStore';
import { useSitePreferences } from './site/sitePreferences';
import { installSiteLocalization } from './site/siteLocalization';
import './site/siteTheme.css';

// Helper to scroll to top on page navigation
const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

const AppView: React.FC = () => {
  const { pathname } = useLocation();
  const isAdminPage = /^\/(?:quan-tri-(?:tong-quan|nguoi-dung|bao-cao|khoa-hoc|ngan-hang-cau-hoi|kho-tri-thuc)|admin(?:\/|$))/.test(pathname);
  const isLearningPage = pathname === '/hoc-tap';
  const { language } = useSitePreferences();
  const { initialize, error, setError, loading } = useAppStore();
  useEffect(() => {
    const root = document.querySelector('.site-shell');
    if (!root) return;
    document.title = isAdminPage
      ? (language === 'en' ? 'CyberAware AI — Administration' : 'CyberAware AI - Quản trị hệ thống')
      : (language === 'en' ? 'CyberAware AI — Online scam prevention' : 'CyberAware AI - Nhận diện & phòng tránh lừa đảo trực tuyến');
    return installSiteLocalization(root, language, pathname, isAdminPage || ['/', '/kiem-tra', '/canh-bao', '/hoc-tap', '/gioi-thieu'].includes(pathname));
  }, [language, isAdminPage, pathname]);
  return <>
    <ScrollToTop />
    <div className="site-shell min-h-screen bg-[#F8FAFC] flex flex-col text-[#0F172A] selection:bg-[#004AC6] selection:text-white">
      {!isAdminPage && <Header />}
      <main className={`flex w-full min-w-0 flex-grow flex-col items-start ${isAdminPage ? '' : 'pt-[64px]'}`}>
        {!isAdminPage && <NotificationBanner />}
        {loading && <p role="status" className="p-4 text-slate-600">Đang tải dữ liệu từ máy chủ…</p>}
        {error && !isLearningPage && <div role="alert" className="flex w-full flex-wrap gap-4 bg-red-50 p-4 text-red-800"><span className="min-w-0 break-words">{error}</span><button onClick={() => void initialize()} className="underline">Tải lại dữ liệu</button><button onClick={() => setError(null)} className="underline">Đóng</button></div>}
        <AppRoutes />
      </main>
      {!isAdminPage && <Footer />}
      {!isAdminPage && <ReportScamModal />}
      {!isAdminPage && <ScenarioDetailModal />}
      {!isAdminPage && <Chatbot key={useAppStore.getState().currentUser?.id || 'guest'} />}
      <ToastViewport />
    </div>
  </>;
};

export default function App() {
  const { initialize, expireSession } = useAppStore();
  useEffect(() => {
    void initialize();
    window.addEventListener('cyberaware-session-expired', expireSession);
    return () => window.removeEventListener('cyberaware-session-expired', expireSession);
  }, [initialize, expireSession]);
  return <BrowserRouter><AppView /></BrowserRouter>;
}
