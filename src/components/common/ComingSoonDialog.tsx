import { useEffect } from 'react';
import { Megaphone, X } from 'lucide-react';

type ComingSoonDialogProps = {
  open: boolean;
  description: string;
  onClose: () => void;
};

export function ComingSoonDialog({ open, description, onClose }: ComingSoonDialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/65 p-3 backdrop-blur-[3px] sm:p-4" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="coming-soon-title" aria-describedby="coming-soon-description" className="relative max-h-[calc(100dvh-1.5rem)] w-full max-w-md overflow-y-auto rounded-[2rem] border border-blue-100 bg-white px-6 pb-7 pt-8 text-center shadow-[0_28px_80px_-24px_rgba(0,74,198,0.45)] ring-1 ring-white sm:px-9 sm:pb-8 sm:pt-9">
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#004AC6] via-cyan-400 to-indigo-500" />
        <div aria-hidden="true" className="pointer-events-none absolute -top-24 left-1/2 h-52 w-72 -translate-x-1/2 rounded-full bg-blue-100/50 blur-3xl" />
        <button type="button" onClick={onClose} aria-label="Đóng thông báo" className="absolute right-4 top-4 rounded-xl p-1.5 text-slate-500 transition-colors hover:bg-blue-50 hover:text-[#004AC6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004AC6]"><X className="h-5 w-5" /></button>
        <div className="relative mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[1.4rem] border border-blue-100 bg-gradient-to-br from-blue-50 to-cyan-50 text-[#004AC6] shadow-[0_12px_30px_-15px_rgba(0,74,198,0.5)]"><Megaphone className="h-8 w-8" aria-hidden="true" /></div>
        <span className="relative inline-flex rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#004AC6]">CyberAware AI</span>
        <h3 id="coming-soon-title" className="relative mt-4 text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">Tính năng đang phát triển</h3>
        <p id="coming-soon-description" className="relative mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-600 sm:text-base">{description}</p>
        <button type="button" onClick={onClose} className="relative mt-7 inline-flex min-w-36 items-center justify-center rounded-xl bg-gradient-to-r from-[#004AC6] to-blue-600 px-6 py-3 text-sm font-bold text-white shadow-[0_10px_24px_-10px_rgba(0,74,198,0.75)] transition-all hover:from-blue-700 hover:to-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004AC6] focus-visible:ring-offset-2">Đã hiểu</button>
      </div>
    </div>
  );
}
