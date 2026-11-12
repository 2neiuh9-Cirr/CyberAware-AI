type PreviewQuestion = { id: string; title: string; options?: string[]; correctIndex?: number; optionExplanations?: string[]; explanation?: string };

export function QuestionPreviewModal({ question, onClose }: { question: PreviewQuestion | null; onClose: () => void }) {
  if (!question) return null;
  return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-slate-200 space-y-5 animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-[#004AC6] bg-blue-50 px-2 py-0.5 rounded">
                  {question.id}
                </span>
                <span className="text-xs font-semibold text-slate-500">Mô phỏng giao diện học viên</span>
              </div>
              <button
                type="button"
                onClick={() => onClose()}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-800 leading-relaxed font-medium">
                {question.title}
              </div>

              <div className="space-y-2 text-xs sm:text-sm">
                <p className="font-semibold text-slate-900">Hãy chọn hành vi xử lý an toàn nhất:</p>
                {question.options?.map((option, index) => <div key={index} className={`p-3 rounded-lg border flex items-start gap-3 ${index === question.correctIndex ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-200'}`}><span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${index === question.correctIndex ? 'bg-emerald-600 text-white' : 'border border-slate-300 text-slate-700'}`}>{'ABCD'[index]}</span><div><p>{option}</p><p className="mt-1 text-xs text-slate-600">{question.optionExplanations?.[index]}</p></div></div>)}
              </div>

              <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-slate-800 space-y-1">
                <p className="font-bold text-emerald-800 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base">check_circle</span>
                  Giải thích của chuyên gia:
                </p>
                <p className="text-slate-700 leading-relaxed">{question.explanation}</p>
              </div>
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => onClose()}
                className="px-5 py-2 rounded-lg bg-[#004AC6] text-white text-xs font-semibold"
              >
                Đóng xem trước
              </button>
            </div>
          </div>
        </div>
  );
}
