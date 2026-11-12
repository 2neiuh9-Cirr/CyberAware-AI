import type { Router } from 'express';
import { adminChatSettings, updateChatSettings } from '../../chat/chat';
import { audit, json } from './shared';

export function registerChatSettingsRoutes(router: Router) {
  router.get('/chat/settings', (_req,res) => res.json(adminChatSettings()));
  router.patch('/chat/settings', (req,res) => {
    const config = updateChatSettings(req.body);
    audit(req,'chat.settings','chat','1',JSON.stringify(req.body));
    res.json(config);
  });
}
