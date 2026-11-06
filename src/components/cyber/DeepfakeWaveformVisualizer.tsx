import React, { useState } from 'react';
import { Volume2, Play, Pause, Activity, CheckCircle2, AlertTriangle } from 'lucide-react';

export const DeepfakeWaveformVisualizer: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [mode, setMode] = useState<'real' | 'deepfake'>('deepfake');

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="w-full bg-slate-900 text-white rounded-xl p-3.5 border border-slate-800 my-2">
      {/* Mode Switcher */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-300">
            MINH HỌA SÓNG ÂM • KHÔNG PHẢI BỘ PHÁT HIỆN
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMode('real')}
            className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
              mode === 'real'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Giọng thật
          </button>
          <button
            onClick={() => setMode('deepfake')}
            className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
              mode === 'deepfake'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Deepfake AI
          </button>
        </div>
      </div>

      {/* Waveform Animation Bars */}
      <div className="h-10 bg-slate-950 rounded-lg px-3 flex items-center justify-between gap-1 overflow-hidden relative">
        {/* Animated bars */}
        {Array.from({ length: 24 }).map((_, i) => {
          const isDeepfake = mode === 'deepfake';
          const randomHeights = [12, 28, 18, 34, 22, 14, 30, 26, 16, 32, 20, 36, 15, 29, 23, 31, 19, 33, 14, 27, 21, 35, 17, 25];
          const height = isPlaying ? randomHeights[i % randomHeights.length] : 6;
          const animDuration = `${0.4 + (i % 5) * 0.15}s`;

          return (
            <div
              key={i}
              style={{
                height: `${height}px`,
                animationDuration: isPlaying ? animDuration : '0s',
              }}
              className={`w-1 rounded-full transition-all duration-150 ${
                isDeepfake
                  ? 'bg-gradient-to-t from-rose-500 to-amber-400'
                  : 'bg-gradient-to-t from-[#004AC6] to-emerald-400'
              } ${isPlaying ? 'animate-pulse' : 'opacity-40'}`}
            />
          );
        })}

        {/* Scan line indicator */}
        {isPlaying && (
          <div className="absolute inset-y-0 w-1 bg-cyan-400/80 shadow-[0_0_8px_#38bdf8] animate-pulse left-1/2" />
        )}
      </div>

      {/* Controls & Detection Note */}
      <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-800/80 text-[11px]">
        <button
          onClick={togglePlay}
          className="flex items-center gap-1.5 text-xs font-semibold text-cyan-400 hover:text-cyan-300 cursor-pointer"
        >
          {isPlaying ? (
            <>
              <Pause className="w-3.5 h-3.5" />
              <span>Dừng nghe thử</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5" />
              <span>Nghe thử mẫu ({mode === 'real' ? 'Người thật' : 'AI sao chép'})</span>
            </>
          )}
        </button>

        <span className="text-slate-400 font-mono text-[10px]">
          {mode === 'deepfake' ? (
            <span className="text-rose-400 font-semibold">⚠ Phát hiện tạp âm kim loại AI</span>
          ) : (
            <span className="text-emerald-400 font-semibold">✓ Nhịp thở &amp; hài âm tự nhiên</span>
          )}
        </span>
      </div>
    </div>
  );
};
