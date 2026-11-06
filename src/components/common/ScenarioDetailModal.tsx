import React from 'react';
import { X, ShieldAlert, CheckCircle, AlertTriangle, MessageSquare, Brain } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

export const ScenarioDetailModal: React.FC = () => {
  const { selectedScenario, setSelectedScenario } = useAppStore();

  if (!selectedScenario) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
        onClick={() => setSelectedScenario(null)}
      />

      {/* Modal Dialog */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 md:p-8 z-10 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
        <button
          onClick={() => setSelectedScenario(null)}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col gap-6">
          {/* Header */}
          <div className="flex flex-col gap-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold w-fit bg-red-50 text-red-700 border border-red-200">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>{selectedScenario.category}</span>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
              {selectedScenario.title}
            </h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              {selectedScenario.summary}
            </p>
          </div>

          {/* Sample Message / Call Preview */}
          {selectedScenario.sampleMessage && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wide">
                <MessageSquare className="w-4 h-4 text-[#004AC6]" />
                <span>Ví dụ tin nhắn / Lời thoại thực tế của kẻ gian:</span>
              </div>
              <div className="p-3 bg-white rounded-lg border border-slate-200/80 font-mono text-xs text-red-700 leading-relaxed shadow-2xs">
                "{selectedScenario.sampleMessage}"
              </div>
            </div>
          )}

          {/* How they manipulate */}
          <div className="bg-amber-50/70 border border-amber-200/70 rounded-xl p-4 flex flex-col gap-1.5">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-800 uppercase tracking-wide">
              <Brain className="w-4 h-4 text-amber-600" />
              <span>Tâm lý nạn nhân bị thao túng:</span>
            </div>
            <p className="text-xs md:text-sm text-amber-900 leading-relaxed">
              {selectedScenario.victimPsychology}
            </p>
          </div>

          {/* Detailed Story */}
          <div className="flex flex-col gap-2">
            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              Diễn biến kịch bản chi tiết:
            </h4>
            <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
              {selectedScenario.detailStory}
            </p>
          </div>

          {/* Key Identification Signs */}
          <div className="flex flex-col gap-2">
            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              Dấu hiệu nhận diện then chốt:
            </h4>
            <div className="p-3.5 bg-red-50/60 rounded-xl border border-red-100 text-sm text-red-900 font-medium flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{selectedScenario.signs}</span>
            </div>
          </div>

          {/* Prevention Action Checklist */}
          <div className="flex flex-col gap-2">
            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              Hành động bảo vệ bắt buộc:
            </h4>
            <div className="flex flex-col gap-2">
              {selectedScenario.preventionTips.map((tip, idx) => (
                <div key={idx} className="flex items-start gap-2.5 p-3 bg-emerald-50/60 border border-emerald-100 rounded-xl text-sm text-emerald-950">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{tip}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={() => setSelectedScenario(null)}
              className="py-2.5 px-6 bg-[#004AC6] hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-md transition-all"
            >
              Đã hiểu & Ghi nhớ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
