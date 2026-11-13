import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { HomePage } from '../modules/home/HomePage';
import { ScannerPage } from '../modules/scanner/ScannerPage';
import { ScamsLibraryPage } from '../modules/scams/ScamsLibraryPage';
import { LearningPage } from '../modules/learning/LearningPage';
import { ReportPage } from '../modules/report/ReportPage';
import { AboutPage } from '../modules/about/AboutPage';
import { LoginPage } from '../modules/auth/LoginPage';
import { RegisterPage } from '../modules/auth/RegisterPage';
import { ForgotPasswordPage } from '../modules/auth/ForgotPasswordPage';
import { UserDashboardPage } from '../modules/account/UserDashboardPage';
import { AccountSettingsPage } from '../modules/account/AccountSettingsPage';
import { AdminOverviewPage } from '../modules/admin/AdminOverviewPage';
import { AdminUsersPage } from '../modules/admin/AdminUsersPage';
import { AdminCoursesPage } from '../modules/admin/AdminCoursesPage';
import { AdminQuestionsPage } from '../modules/admin/AdminQuestionsPage';
import { AnalysisKnowledgePage } from '../modules/admin/AnalysisKnowledgePage';
import { AdminReportsPage } from '../modules/admin/AdminReportsPage';
import { useAppStore } from '../store/useAppStore';

const AccountRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, authReady } = useAppStore();
  if (!authReady) return <p role="status" className="p-8">Đang kiểm tra phiên đăng nhập…</p>;
  return currentUser ? <>{children}</> : <Navigate to="/dang-nhap" replace />;
};

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, authReady } = useAppStore();
  if (!authReady) return <p role="status" className="p-8">Đang kiểm tra quyền quản trị…</p>;
  if (!currentUser) return <Navigate to="/dang-nhap" replace />;
  return currentUser.role === 'admin' ? <>{children}</> : <Navigate to="/tong-quan" replace />;
};

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/kiem-tra" element={<ScannerPage />} />
      <Route path="/tien-ich-gmail" element={<Navigate to="/#tien-ich-gmail" replace />} />
      <Route path="/canh-bao" element={<ScamsLibraryPage />} />
      <Route path="/hoc-tap" element={<LearningPage />} />
      <Route path="/bao-cao" element={<ReportPage />} />
      <Route path="/gioi-thieu" element={<AboutPage />} />
      <Route path="/tong-quan" element={<AccountRoute><UserDashboardPage /></AccountRoute>} />
      <Route path="/ho-so" element={<Navigate to="/tong-quan" replace />} />
      <Route path="/cai-dat" element={<AccountRoute><AccountSettingsPage /></AccountRoute>} />
      <Route path="/cai-dat-tai-khoan" element={<Navigate to="/cai-dat" replace />} />

      <Route path="/quan-tri-tong-quan" element={<AdminRoute><AdminOverviewPage /></AdminRoute>} />
      <Route path="/quan-tri-nguoi-dung" element={<AdminRoute><AdminUsersPage /></AdminRoute>} />
      <Route path="/quan-tri-khoa-hoc" element={<AdminRoute><AdminCoursesPage /></AdminRoute>} />
      <Route path="/quan-tri-ngan-hang-cau-hoi" element={<AdminRoute><AdminQuestionsPage /></AdminRoute>} />
      <Route path="/quan-tri-kho-tri-thuc" element={<AdminRoute><AnalysisKnowledgePage /></AdminRoute>} />
      <Route path="/quan-tri-bao-cao" element={<AdminRoute><AdminReportsPage /></AdminRoute>} />
      <Route path="/admin" element={<Navigate to="/quan-tri-tong-quan" replace />} />
      <Route path="/admin/users" element={<Navigate to="/quan-tri-nguoi-dung" replace />} />
      <Route path="/admin/courses" element={<Navigate to="/quan-tri-khoa-hoc" replace />} />
      <Route path="/admin/questions" element={<Navigate to="/quan-tri-ngan-hang-cau-hoi" replace />} />
      <Route path="/admin/analysis-knowledge" element={<Navigate to="/quan-tri-kho-tri-thuc" replace />} />
      <Route path="/admin/reports" element={<Navigate to="/quan-tri-bao-cao" replace />} />

      {/* Authentication Routes */}
      <Route path="/dang-nhap" element={<LoginPage />} />
      <Route path="/login" element={<Navigate to="/dang-nhap" replace />} />
      <Route path="/dang-ky" element={<RegisterPage />} />
      <Route path="/register" element={<Navigate to="/dang-ky" replace />} />
      <Route path="/quen-mat-khau" element={<ForgotPasswordPage />} />
      <Route path="/forgot-password" element={<Navigate to="/quen-mat-khau" replace />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

