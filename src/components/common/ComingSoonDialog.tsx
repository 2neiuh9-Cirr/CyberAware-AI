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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-3 sm:p-4" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="coming-soon-title" aria-describedby="coming-soon-description" className="relative max-h-[calc(100dvh-1.5rem)] w-full max-w-sm overflow-y-auto rounded-2xl bg-white p-5 text-center shadow-2xl sm:p-7">
        <button type="button" onClick={onClose} aria-label="Đóng thông báo" className="absolute right-4 top-4 rounded-lg p-1 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50"><Megaphone className="h-7 w-7 text-emerald-600" /></div>
        <h3 id="coming-soon-title" className="text-xl font-bold text-slate-950">Tính năng đang phát triển</h3>
        <p id="coming-soon-description" className="mt-2 text-sm text-slate-600">{description}</p>
        <button type="button" onClick={onClose} className="mt-6 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">Đã hiểu</button>
      </div>
    </div>
  );
}
