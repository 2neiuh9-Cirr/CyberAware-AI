import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bot, ChevronLeft, CircleHelp, ImagePlus, Info, LogOut, Maximize2,
  MessageSquare, Minus, Plus, Send, Settings, ShieldAlert, Sparkles,
  TriangleAlert, Truck, X,
} from 'lucide-react';

type ChatMode = 'closed' | 'compact' | 'full';
type Message = { id: number; text: string; imageName?: string; time: string };
type Conversation = { id: number; title: string; messages: Message[] };

const suggestions = [
  { title: 'Tư vấn thủ đoạn giao hàng', detail: 'Cách nhận biết shipper giả mạo', icon: Truck, prompt: 'Làm sao nhận biết thủ đoạn giả mạo nhân viên giao hàng?' },
  { title: 'Phân tích ảnh chụp', detail: 'Chuẩn bị ảnh tin nhắn để kiểm tra', icon: ImagePlus, prompt: 'Tôi muốn kiểm tra ảnh chụp một tin nhắn đáng ngờ.' },
  { title: 'Hướng dẫn tố cáo', detail: 'Các bước xử lý sau khi bị lừa', icon: TriangleAlert, prompt: 'Tôi cần làm gì nếu đã chuyển tiền cho người lạ?' },
  { title: 'Tìm hiểu CyberAware', detail: 'Nền tảng hỗ trợ những gì?', icon: Info, prompt: 'CyberAware AI có thể giúp tôi những gì?' },
];

const timeLabel = () => new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

export const Chatbot: React.FC = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<ChatMode>('closed');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [draft, setDraft] = useState('');
  const [imageName, setImageName] = useState('');
  const [showNotice, setShowNotice] = useState(true);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showBackendNotice, setShowBackendNotice] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(1);
  const active = conversations.find(item => item.id === activeId);

  useEffect(() => {
    if (mode !== 'full') return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [mode]);

  useEffect(() => {
    if (mode === 'closed') return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMode('closed');
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mode]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [active?.messages.length, mode]);

  const newConversation = () => {
    setActiveId(null);
    setDraft('');
    setImageName('');
    setShowBackendNotice(false);
    inputRef.current?.focus();
  };

  const submitMessage = () => {
    const text = draft.trim();
    if (!text && !imageName) return;
    const id = activeId ?? nextId.current++;
    const message: Message = { id: nextId.current++, text, imageName: imageName || undefined, time: timeLabel() };
    setConversations(current => {
      const existing = current.find(item => item.id === id);
      if (existing) return current.map(item => item.id === id ? { ...item, messages: [...item.messages, message] } : item);
      return [{ id, title: text.slice(0, 38) || imageName, messages: [message] }, ...current];
    });
    setActiveId(id);
    setDraft('');
    setImageName('');
    if (fileRef.current) fileRef.current.value = '';
    setShowBackendNotice(true);
  };

  const closeAndNavigate = (path: string) => {
    setMode('closed');
    navigate(path);
  };

  const suggestionButtons = (compact: boolean) => (
    <div className={compact ? 'flex flex-wrap gap-2' : 'grid grid-cols-1 gap-3 sm:grid-cols-2'}>
      {suggestions.slice(0, compact ? 3 : 4).map(({ title, detail, icon: Icon, prompt }) => (
        <button key={title} type="button" onClick={() => { setDraft(prompt); inputRef.current?.focus(); }}
          className={compact
            ? 'inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-left text-xs text-slate-600 transition hover:border-emerald-300 hover:text-emerald-700'
            : 'flex items-center gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-left shadow-sm transition hover:border-emerald-300 hover:shadow-md'}>
          <Icon size={compact ? 17 : 24} className="shrink-0 text-emerald-500" />
          <span>{compact ? title : <><strong className="block text-sm text-slate-900">{title}</strong><span className="mt-0.5 block text-xs text-slate-500">{detail}</span></>}</span>
        </button>
      ))}
    </div>
  );

  const composer = (compact: boolean) => (
    <div className={compact ? 'border-t border-slate-100 bg-white px-3 py-3' : 'border-t border-slate-100 bg-white px-5 py-4'}>
      {imageName && <div className="mb-2 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800"><ImagePlus size={15} /><span className="min-w-0 flex-1 truncate">{imageName}</span><button type="button" onClick={() => setImageName('')} aria-label="Bỏ ảnh đã chọn"><X size={15} /></button></div>}
      <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2 shadow-sm focus-within:border-emerald-400">
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={event => setImageName(event.target.files?.[0]?.name || '')} aria-label="Chọn ảnh" />
        <button type="button" onClick={() => fileRef.current?.click()} className="rounded-xl p-2 text-slate-500 hover:bg-white hover:text-emerald-600" aria-label="Đính kèm ảnh"><ImagePlus size={22} /></button>
        <textarea ref={inputRef} value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); submitMessage(); } }}
          rows={1} maxLength={2000} placeholder={compact ? 'Nhập tin nhắn…' : 'Nhập câu hỏi hoặc dán tin nhắn nghi ngờ…'} aria-label="Tin nhắn cho trợ lý"
          className="max-h-28 min-h-10 flex-1 resize-none bg-transparent px-1 py-2.5 text-sm text-slate-800 outline-none placeholder:text-slate-400" />
        <button type="button" onClick={submitMessage} disabled={!draft.trim() && !imageName} className="rounded-xl bg-emerald-500 p-2.5 text-white transition hover:bg-emerald-600 disabled:bg-slate-200 disabled:text-slate-400" aria-label="Gửi tin nhắn"><Send size={19} /></button>
      </div>
      {!compact && <p className="mt-2 text-center text-[11px] text-slate-400">Trợ lý AI có thể mắc sai sót. Hãy kiểm chứng thông tin quan trọng.</p>}
    </div>
  );

  const messages = (compact: boolean) => (
    <div className="mx-auto flex w-full max-w-[980px] flex-col gap-4 px-4 py-5 sm:px-8" aria-live="polite">
      {active?.messages.map(message => <div key={message.id} className="flex justify-end"><div className="max-w-[85%] rounded-2xl rounded-br-sm bg-[#004AC6] px-4 py-3 text-sm text-white shadow-sm"><p className="whitespace-pre-wrap break-words">{message.text}</p>{message.imageName && <p className="mt-2 flex items-center gap-1.5 rounded-lg bg-white/15 px-2 py-1 text-xs"><ImagePlus size={14} />{message.imageName}</p>}<span className="mt-1 block text-right text-[10px] text-blue-100">{message.time}</span></div></div>)}
      {showBackendNotice && !!active?.messages.length && <div role="status" className="flex items-start gap-2 self-start rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs leading-relaxed text-emerald-900"><Bot size={18} className="shrink-0 text-emerald-500" /><span>Giao diện trò chuyện đã sẵn sàng. Phần trả lời AI sẽ hoạt động sau khi kết nối máy chủ.</span></div>}
      {!compact && <div className="h-2" />}
      <div ref={endRef} />
    </div>
  );

  return <>
    {mode === 'closed' && <button type="button" onClick={() => setMode('compact')} aria-label="Mở trợ lý AI" title="Mở trợ lý AI"
      className="fixed bottom-4 right-4 z-[70] flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-[0_10px_24px_rgba(16,185,129,0.3)] transition hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-500 sm:bottom-6 sm:right-8">
      <Bot size={28} strokeWidth={2.3} /><span className="absolute right-0 top-0 h-3 w-3 rounded-full border-2 border-white bg-rose-500" />
    </button>}

    {mode === 'compact' && <section role="dialog" aria-label="Trợ lý AI CyberAware" className="fixed bottom-4 right-4 z-[70] flex h-[min(500px,80dvh)] w-[min(340px,calc(100vw-32px))] flex-col overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_22px_60px_rgba(15,23,42,0.22)] md:w-[380px]">
      <div className="flex items-center gap-3 bg-gradient-to-r from-emerald-500 to-[#52c79b] px-4 py-3 text-white">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20"><Bot size={25} /></span><div className="min-w-0 flex-1"><h2 className="text-sm font-bold">Trợ lý AI CyberAware</h2><p className="text-[11px] text-emerald-50">● Giao diện xem trước</p></div>
        <button type="button" onClick={() => setMode('full')} className="rounded-lg p-2 hover:bg-white/15" aria-label="Mở toàn màn hình" title="Toàn màn hình"><Maximize2 size={20} /></button>
        <button type="button" onClick={() => setMode('closed')} className="rounded-lg p-2 hover:bg-white/15" aria-label="Đóng chatbot" title="Đóng"><X size={23} /></button>
      </div>
      <div className="border-b border-slate-100 bg-slate-50 px-4 py-4"><p className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400"><Sparkles size={15} className="text-emerald-400" /> Gợi ý nhanh</p>{suggestionButtons(true)}</div>
      <div className="min-h-0 flex-1 overflow-y-auto bg-white">{active?.messages.length ? messages(true) : <div className="flex h-full flex-col items-center justify-center px-7 text-center"><span className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-500"><Bot size={32} /></span><h3 className="text-lg font-bold text-slate-900">Xin chào! Mình có thể giúp gì?</h3><p className="mt-2 text-sm leading-relaxed text-slate-500">Hỏi về dấu hiệu lừa đảo và cách tự bảo vệ trên mạng.</p></div>}</div>
      {composer(true)}
    </section>}

    {mode === 'full' && <section role="dialog" aria-modal="true" aria-label="Trợ lý AI CyberAware toàn màn hình" className="fixed inset-0 z-[100] flex overflow-hidden bg-white text-slate-900">
      {showSidebar && <aside className="hidden w-[300px] shrink-0 flex-col border-r border-slate-100 bg-white lg:flex lg:w-[360px]"><div className="flex items-center gap-3 border-b border-slate-100 p-5"><button type="button" onClick={newConversation} className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#52c79b] px-4 py-3.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-500"><Plus size={22} /> Hội thoại mới</button><button type="button" onClick={() => setShowSidebar(false)} aria-label="Ẩn thanh bên" className="p-2 text-slate-400 hover:text-slate-700"><ChevronLeft size={21} /></button></div><div className="min-h-0 flex-1 overflow-y-auto px-5 py-5"><h2 className="mb-4 text-xs font-bold uppercase tracking-wide text-slate-400">Gần đây</h2>{conversations.length ? conversations.map(item => <button key={item.id} type="button" onClick={() => setActiveId(item.id)} className={`mb-1 flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left hover:bg-slate-50 ${activeId === item.id ? 'bg-emerald-50' : ''}`}><MessageSquare size={21} className="mt-0.5 shrink-0 text-slate-400" /><span className="min-w-0"><span className="block truncate text-sm font-medium text-slate-800">{item.title}</span><span className="mt-1 block text-xs text-slate-400">{item.messages.length} tin nhắn</span></span></button>) : <p className="px-3 text-sm text-slate-400">Chưa có hội thoại nào.</p>}</div><div className="space-y-1 border-t border-slate-100 p-5"><button type="button" onClick={() => closeAndNavigate('/cai-dat')} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"><Settings size={20} /> Cài đặt</button><button type="button" onClick={() => closeAndNavigate('/gioi-thieu')} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"><CircleHelp size={20} /> Trợ giúp</button></div></aside>}
      <div className="flex min-w-0 flex-1 flex-col"><header className="shrink-0 border-b border-slate-100 bg-white px-4 py-4 sm:px-6"><div className="flex items-center gap-3"><div className="flex min-w-0 flex-1 items-center gap-3">{!showSidebar && <button type="button" onClick={() => setShowSidebar(true)} className="hidden rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:block" aria-label="Hiện thanh bên"><MessageSquare size={20} /></button>}<h2 className="truncate text-lg font-bold sm:text-xl">Trợ lý AI CyberAware</h2></div><button type="button" onClick={newConversation} className="rounded-lg p-2 text-emerald-600 hover:bg-emerald-50 lg:hidden" aria-label="Hội thoại mới"><Plus size={22} /></button><button type="button" onClick={() => setMode('compact')} className="flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold hover:bg-slate-200"><Minus size={18} /><span className="hidden sm:inline">Thu nhỏ</span></button><button type="button" onClick={() => setMode('closed')} className="flex items-center gap-2 rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-100"><LogOut size={18} /><span className="hidden sm:inline">Thoát</span></button></div><div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1"><span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-600"><Bot size={18} /> AI</span><span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600">Phòng tránh lừa đảo</span><span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600">Hướng dẫn xử lý</span></div></header>
        <div className="min-h-0 flex-1 overflow-y-auto bg-[#fdfefd]">{active?.messages.length ? messages(false) : <div className="mx-auto flex min-h-full w-full max-w-[1020px] flex-col justify-center px-5 py-10 sm:px-8"><div className="mb-8"><span className="mb-4 flex h-20 w-20 items-center justify-center rounded-[26px] bg-emerald-50 text-emerald-500 shadow-sm"><Bot size={34} /></span><h1 className="text-2xl font-bold leading-tight text-slate-950 sm:text-4xl">Chào bạn, Trợ lý AI có thể giúp gì?</h1><p className="mt-3 text-base text-slate-500 sm:text-xl">Hỗ trợ nhận biết rủi ro và tìm hiểu cách phòng chống lừa đảo trực tuyến.</p></div>{suggestionButtons(false)}{showNotice && <div className="mt-8 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-medium text-slate-600"><ShieldAlert size={20} className="shrink-0 text-slate-400" /><span className="flex-1">Không gửi mã OTP, mật khẩu hoặc thông tin thẻ ngân hàng tại đây.</span><button type="button" onClick={() => setShowNotice(false)} aria-label="Đóng lưu ý" className="text-slate-400 hover:text-slate-700"><X size={19} /></button></div>}</div>}</div>
        <div className="mx-auto w-full max-w-[1040px]">{composer(false)}</div>
      </div>
    </section>}
  </>;
};
