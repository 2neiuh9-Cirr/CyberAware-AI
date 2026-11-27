import React from 'react';
import { FileText } from 'lucide-react';
import type { ChatMessage } from '../../types';
import { ChatAnswer } from './ChatAnswer';

// Tin người dùng và phản hồi AI có kiểu hiển thị riêng; nguồn tham khảo nằm dưới phản hồi.
type ChatMessageListProps = {
  compact: boolean;
  items: ChatMessage[];
  endRef: React.RefObject<HTMLDivElement | null>;
  onNavigate: (path: string) => void;
};

export const ChatMessageList = ({ compact, items, endRef, onNavigate }: ChatMessageListProps) => (
    <div className="mx-auto flex w-full max-w-[980px] flex-col gap-4 px-4 py-5 sm:px-8" aria-live="polite">
      {items.map(m => (
        <div key={m.id} className={m.role === 'user' ? 'self-end rounded-xl bg-[#004AC6] p-3 text-sm text-white' : 'self-start rounded-xl bg-blue-50 p-3 text-sm'}>
          {m.attachment?.kind==='image'&&m.attachment.preview&&<img src={m.attachment.preview} alt={`Ảnh người dùng gửi: ${m.attachment.name}`} className="mb-2 max-h-72 max-w-full rounded-lg object-contain" />}
          {m.attachment?.kind==='document'&&<div className="mb-2 flex max-w-full items-center gap-2 rounded-lg bg-white/90 px-3 py-2 text-xs text-slate-700"><FileText size={17} className="shrink-0 text-[#004AC6]"/><span className="break-all">{m.attachment.name}</span></div>}
          {m.content&& (m.role === 'assistant' ? <ChatAnswer content={m.content} /> : <p className="whitespace-pre-wrap break-words">{m.content}</p>)}
          {m.role==='assistant'&&m.deliveryState==='sending'&&<p className="flex items-center gap-2 text-slate-500"><span className="inline-block h-2 w-2 animate-pulse rounded-full bg-[#004AC6]"/>Đang phân tích và soạn câu trả lời…</p>}
          {m.deliveryState==='sending'&&m.role==='user'&&<small className="mt-2 block text-[11px] opacity-70">Tin nhắn đang chờ gửi đến AI…</small>}
          {m.deliveryState==='failed'&&m.role==='user'&&<small className="mt-2 block text-[11px] opacity-80">Tin nhắn chưa được xử lý.</small>}
          {m.sources?.length > 0 && <div className="mt-3 space-y-1 border-t border-blue-100 pt-2 text-xs">
            <p className="font-semibold text-slate-600">Nguồn tham khảo</p>
            {m.sources.map(s => <a key={`${s.kind}:${s.url}:${s.title}`} className="block text-[#004AC6] underline underline-offset-2" href={s.url} target="_blank" rel="noreferrer">{s.title}</a>)}
          </div>}
          {m.role === 'assistant' && !m.deliveryState && <div className="mt-3 flex gap-3 text-xs"><button className="underline" onClick={() => onNavigate('/kiem-tra')}>Kiểm tra dấu hiệu</button><button className="underline" onClick={() => onNavigate('/bao-cao')}>Báo cáo</button></div>}
          <small className="mt-2 block text-[11px] opacity-70">{new Date(m.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</small>
        </div>
      ))}
      {!compact && <div className="h-2" />}
      <div ref={endRef} />
    </div>
);
