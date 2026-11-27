import { Router } from 'express';
import { admin } from './routes/admin/shared';
import { registerChatSettingsRoutes } from './routes/admin/chatSettings';
import { registerAdminOverviewRoutes, registerAdminSystemRoutes } from './routes/admin/system';
import { registerAdminReportRoutes } from './routes/admin/reports';
import { registerAdminAnalysisRoutes } from './routes/admin/analysis';
import { registerAdminUserRoutes } from './routes/admin/users';
import { registerAdminCourseRoutes } from './routes/admin/courses';
import { registerAdminQuestionRoutes } from './routes/admin/questions';

// Kiểm tra vai trò quản trị trước khi đăng ký các tuyến quản lý bên dưới.
export const adminRouter = Router();
adminRouter.use((req, _res, next) => { try { admin(req); next(); } catch (error) { next(error); } });

// Mỗi nhóm tuyến phụ trách một vùng dữ liệu của trang quản trị.
registerChatSettingsRoutes(adminRouter);
registerAdminOverviewRoutes(adminRouter);
registerAdminReportRoutes(adminRouter);
registerAdminSystemRoutes(adminRouter);
registerAdminAnalysisRoutes(adminRouter);
registerAdminUserRoutes(adminRouter);
registerAdminCourseRoutes(adminRouter);
registerAdminQuestionRoutes(adminRouter);
