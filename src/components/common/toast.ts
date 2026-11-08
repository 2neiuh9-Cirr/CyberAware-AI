import { create } from 'zustand';

export type ToastKind = 'success' | 'error' | 'info';
type ToastItem = { id: number; kind: ToastKind; message: string; title?: string };

type ToastState = {
  items: ToastItem[];
  add: (item: ToastItem) => void;
  remove: (id: number) => void;
};

export const useToastStore = create<ToastState>(set => ({
  items: [],
  add: item => set(state => ({ items: [...state.items.slice(-2), item] })),
  remove: id => set(state => ({ items: state.items.filter(item => item.id !== id) })),
}));

let nextId = 0;
let lastToast = { message: '', kind: '' as ToastKind | '', time: 0 };

export function notify(message: string, kind: ToastKind = 'info', title?: string) {
  const text = message.trim();
  if (!text) return;
  const now = Date.now();
  if (lastToast.message === text && lastToast.kind === kind && now - lastToast.time < 1000) return;
  lastToast = { message: text, kind, time: now };
  const id = ++nextId;
  useToastStore.getState().add({ id, kind, message: text, title });
  setTimeout(() => useToastStore.getState().remove(id), 3000);
}
