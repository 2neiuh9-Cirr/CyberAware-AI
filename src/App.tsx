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
import { ReportScamModal } from './components/common/ReportScamModal';
import { ScenarioDetailModal } from './components/common/ScenarioDetailModal';
import { Chatbot } from './components/chat/Chatbot';
import { ToastViewport } from './components/common/ToastViewport';
import { useAppStore } from './store/useAppStore';

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
  const isAdminPage = /^\/(?:quan-tri-(?:tong-quan|nguoi-dung|khoa-hoc|ngan-hang-cau-hoi|kho-tri-thuc)|admin(?:\/|$))/.test(pathname);
  const isLearningPage = pathname === '/hoc-tap';
  const { initialize, error, setError, loading } = useAppStore();
  return <>
    <ScrollToTop />
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col text-[#0F172A] selection:bg-[#004AC6] selection:text-white">
      {!isAdminPage && <Header />}
      <main className={`w-full flex-grow flex flex-col items-start overflow-hidden ${isAdminPage ? '' : 'pt-[64px]'}`}>
        {!isAdminPage && <NotificationBanner />}
        {loading && <p role="status" className="p-4 text-slate-600">Đang tải dữ liệu từ máy chủ…</p>}
        {error && !isLearningPage && <div role="alert" className="w-full p-4 bg-red-50 text-red-800 flex gap-4"><span>{error}</span><button onClick={() => void initialize()} className="underline">Tải lại dữ liệu</button><button onClick={() => setError(null)} className="underline">Đóng</button></div>}
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
