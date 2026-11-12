import { Router, type Request, type Response, type NextFunction } from 'express';
import { ApiError } from './http';
import { registerHomeRoutes } from './routes/public/home';
import { registerAccountRoutes } from './routes/public/account';
import { registerScanRoutes } from './routes/public/scans';
import { registerReportRoutes } from './routes/public/reports';
import { registerLearningRoutes } from './routes/public/learning';
import { registerStatsRoutes } from './routes/public/stats';

export const apiRouter = Router();
registerHomeRoutes(apiRouter);
registerAccountRoutes(apiRouter);
registerScanRoutes(apiRouter);
registerReportRoutes(apiRouter);
registerLearningRoutes(apiRouter);
registerStatsRoutes(apiRouter);

export function apiError(error: any, _req: Request, res: Response, _next: NextFunction) {
  const status = error instanceof ApiError ? error.status : error.type === 'entity.too.large' ? 413 : error.type === 'entity.parse.failed' ? 400 : 500;
  if (status === 500) console.error('API error:', error);
  res.status(status).json({ success: false, error: status === 500 ? 'Có lỗi máy chủ. Vui lòng thử lại.' : status === 413 ? 'Nội dung yêu cầu quá lớn.' : error.type === 'entity.parse.failed' ? 'JSON không hợp lệ.' : error.message });
}
