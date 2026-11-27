import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { ChatMessageList } from '../src/components/chat/ChatMessageList';
import type { ChatMessage } from '../src/types';

const createdAt = '2026-11-27T08:00:00.000Z';
const question: ChatMessage = {
  id: 'question',
  role: 'user',
  content: 'Tin nhắn này có đáng ngờ không?',
  createdAt,
  sources: [],
  deliveryState: 'sending',
  attachment: { kind: 'image', name: 'tin-nhan.png', mimeType: 'image/png', preview: 'blob:preview' },
};
const pending: ChatMessage = {
  id: 'pending',
  role: 'assistant',
  content: '',
  createdAt,
  sources: [],
  deliveryState: 'sending',
};

test('chat shows the submitted image and question while the answer is pending', () => {
  const html = renderToStaticMarkup(React.createElement(ChatMessageList, {
    compact: true,
    items: [question, pending],
    endRef: React.createRef<HTMLDivElement>(),
    onNavigate: () => {},
  }));
  assert.match(html, /Ảnh người dùng gửi: tin-nhan.png/);
  assert.match(html, /Tin nhắn này có đáng ngờ không\?/);
  assert.match(html, /Đang phân tích và soạn câu trả lời/);
});

test('chat shows a finished answer and its source below the question', () => {
  const answer: ChatMessage = {
    ...pending,
    content: 'Dấu hiệu:\n- Yêu cầu cung cấp OTP.',
    deliveryState: undefined,
    sources: [{ kind: 'lesson', title: 'Bảo vệ tài khoản', url: '/bai-hoc/bao-ve' }],
  };
  const html = renderToStaticMarkup(React.createElement(ChatMessageList, {
    compact: false,
    items: [question, answer],
    endRef: React.createRef<HTMLDivElement>(),
    onNavigate: () => {},
  }));
  assert.ok(html.indexOf('Tin nhắn này có đáng ngờ') < html.indexOf('Yêu cầu cung cấp OTP'));
  assert.match(html, /Nguồn tham khảo/);
  assert.match(html, /Bảo vệ tài khoản/);
});
