import express, { Router } from 'express';
import { db } from '../database';
import { integer, rateLimit } from '../http';
import { publicChatSources, sanitizeChatAnswer } from '../../shared/chatAnswer';
import type { ChatAttachment } from './attachments';
import { allowance, identity, member, owned, settings } from './chatState';
import { handleChatMessage } from './chatRequest';

export { adminChatSettings, updateChatSettings } from './chatState';
export { chatProvider } from './chatRequest';

export const chatRouter = Router();

// Giao diện lấy khả năng hiện tại và hạn mức riêng của actor để hiển thị trước khi gửi.
chatRouter.get('/capabilities', (req, res) => {
  const { actor } = identity(req, res);
  const config = settings();
  res.json({
    enabled: config.enabled && !!process.env.GEMINI_API_KEY?.trim(),
    imagesEnabled: config.imagesEnabled,
    limits: { maxMessageChars: 2000, maxUserTokens: 800, maxImageBytes: 2097152, maxDocumentBytes: 8388608, maxFilesPerTurn: 1 },
    usage: allowance(actor, config),
  });
});

// Lịch sử trên máy chủ chỉ dành cho tài khoản đăng nhập; mọi thao tác đều kiểm tra chủ sở hữu.
chatRouter.get('/conversations', (req, res) => {
  const owner = member(req);
  const limit = integer(req.query.limit, 20, 50);
  const cursor = String(req.query.cursor || '\uffff');
  const rows = db.prepare(`SELECT c.id,c.title,c.updated_at AS updatedAt,c.updated_at||c.id AS cursor,(SELECT COUNT(*) FROM chat_messages WHERE conversation_id=c.id) AS messageCount,(SELECT substr(content,1,80) FROM chat_messages WHERE conversation_id=c.id ORDER BY seq DESC LIMIT 1) AS lastMessagePreview FROM chat_conversations c WHERE user_id=? AND updated_at||id < ? ORDER BY updated_at DESC,id DESC LIMIT ?`).all(owner, cursor, limit + 1);
  res.json({ items: rows.slice(0, limit), nextCursor: rows.length > limit ? rows[limit - 1].cursor : null });
});
chatRouter.get('/conversations/:id', (req, res) => {
  const conversation = owned(req.params.id, member(req));
  const limit = integer(req.query.limit, 30, 100);
  const cursor = integer(req.query.cursor, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER);
  const rows = db.prepare('SELECT seq,id,role,content,sources,created_at AS createdAt,attachment FROM chat_messages WHERE conversation_id=? AND seq<? ORDER BY seq DESC LIMIT ?').all(req.params.id, cursor, limit + 1);
  res.json({
    ...conversation,
    messages: rows.slice(0, limit).reverse().map(row => {
      const storedSources = JSON.parse(String(row.sources));
      let attachment: ChatAttachment | undefined;
      try { attachment = row.attachment ? JSON.parse(String(row.attachment)) : undefined; }
      catch { attachment = undefined; }
      return {
        ...row,
        content: row.role === 'assistant' ? sanitizeChatAnswer(String(row.content), storedSources) : row.content,
        sources: publicChatSources(storedSources),
        ...(attachment ? { attachment } : {}),
      };
    }),
    nextCursor: rows.length > limit ? rows[limit - 1].seq : null,
  });
});
chatRouter.delete('/conversations/:id', (req, res) => {
  const owner = member(req);
  owned(req.params.id, owner);
  db.prepare('DELETE FROM chat_attachment_context WHERE actor=? AND session_id=?').run('u:' + owner, req.params.id);
  db.prepare('DELETE FROM chat_conversations WHERE id=? AND user_id=?').run(req.params.id, owner);
  res.sendStatus(204);
});

// Hạn mức tốc độ cho endpoint; hạn mức theo người dùng được kiểm tra trong handler.
chatRouter.post('/messages', rateLimit(30, 60000), express.raw({ type: 'multipart/form-data', limit: '9mb' }), handleChatMessage);
