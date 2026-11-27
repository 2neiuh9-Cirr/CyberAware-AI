import type { Router } from 'express';
import { adminChatSettings, updateChatSettings } from '../../chat/chat';
import { audit, json } from './shared';

export function registerChatSettingsRoutes(router: Router) {
  // Đọc cấu hình, model và tổng lượt/token đã dùng trong ngày cho màn hình quản trị.
  router.get('/chat/settings', (_req,res) => res.json(adminChatSettings()));

  // Kiểm tra, lưu cấu hình mới rồi ghi nhật ký thay đổi của quản trị viên.
  router.patch('/chat/settings', (req,res) => {
    const config = updateChatSettings(req.body);
    audit(req,'chat.settings','chat','1',JSON.stringify(req.body));
    res.json(config);
  });
}
