import type { FormEvent } from 'react';

type Props = { open: boolean; busy: boolean; error: string; title: string; duration: string; content: string; onClose: () => void; onSubmit: (event: FormEvent) => void; onTitleChange: (value: string) => void; onDurationChange: (value: string) => void; onContentChange: (value: string) => void };

export function AddLessonModal({ open, busy, error, title, duration, content, onClose, onSubmit, onTitleChange, onDurationChange, onContentChange }: Props) {
  if (!open) return null;
  return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs" onMouseDown={event => { if (event.target === event.currentTarget && !busy) onClose(); }}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4 animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">+ Thêm bài học vi mô</h3>
              <button
                type="button"
                onClick={() => onClose()}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <form onSubmit={onSubmit} className="space-y-4 text-xs">
              {error && <p role="alert" className="text-red-700">{error}</p>}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tiêu đề bài học vi mô *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Quy tắc 3 giây kiểm tra tên miền người gửi"
                  value={title}
                  onChange={(e) => onTitleChange(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-[#004AC6]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Thời lượng ước tính</label>
                <select
                  value={duration}
                  onChange={(e) => onDurationChange(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none cursor-pointer"
                >
                  <option value="3 phút">3 phút đọc</option>
                  <option value="4 phút">4 phút thực hành</option>
                  <option value="5 phút">5 phút đọc &amp; soi mẫu</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nội dung bài học</label>
                <textarea rows={5} value={content} onChange={e => onContentChange(e.target.value)} placeholder="Viết nội dung để học viên đọc và thực hành..." className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-[#004AC6]" />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => onClose()}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#004AC6] hover:bg-blue-700 text-white font-semibold"
                >
                  Thêm bài học
                </button>
              </div>
            </form>
          </div>
        </div>
  );
}
