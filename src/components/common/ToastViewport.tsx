import { CheckCircle2, CircleAlert, Info, X } from 'lucide-react';
import { useToastStore } from './toast';
import './ToastViewport.css';

const style = {
  success: { icon: CheckCircle2, iconClass: 'bg-emerald-50 text-emerald-700', border: 'border-emerald-200', title: 'Thành công' },
  error: { icon: CircleAlert, iconClass: 'bg-rose-50 text-rose-700', border: 'border-rose-200', title: 'Có lỗi xảy ra' },
  info: { icon: Info, iconClass: 'bg-blue-50 text-[#004AC6]', border: 'border-blue-200', title: 'Thông báo' },
} as const;

export function ToastViewport() {
  const items = useToastStore(state => state.items);
  const remove = useToastStore(state => state.remove);

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[250] flex w-[min(400px,calc(100vw-32px))] flex-col gap-2 sm:bottom-6 sm:right-6" aria-live="polite" aria-relevant="additions">
      {items.map(item => {
        const visual = style[item.kind];
        const Icon = visual.icon;
        return (
          <div key={item.id} role={item.kind === 'error' ? 'alert' : 'status'} className={`toast-life pointer-events-auto flex items-start gap-3 rounded-2xl border ${visual.border} bg-white px-4 py-3 shadow-[0_12px_32px_rgba(15,23,42,0.16)]`}>
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${visual.iconClass}`}><Icon size={19} /></span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-900">{item.title || visual.title}</p>
              <p className="mt-0.5 break-words text-sm leading-snug text-slate-600">{item.message}</p>
            </div>
            <button type="button" aria-label="Đóng thông báo" onClick={() => remove(item.id)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={17} /></button>
          </div>
        );
      })}
    </div>
  );
}
