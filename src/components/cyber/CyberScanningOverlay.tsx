import React from 'react';
import { Cpu, ShieldCheck, Search, Activity, Lock, AlertTriangle } from 'lucide-react';

interface CyberScanningOverlayProps {
  isScanning: boolean;
  query: string;
}

export const CyberScanningOverlay: React.FC<CyberScanningOverlayProps> = ({ isScanning, query }) => {
  if (!isScanning) return null;

  return (
    <div className="relative overflow-hidden bg-slate-900 text-white rounded-xl p-4 sm:p-5 my-3 shadow-xl border border-blue-500/40 animate-in fade-in duration-150">
      {/* Scanning laser beam effect */}
      <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#38bdf8] animate-scan-line pointer-events-none" />

      {/* Header status */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span className="text-xs font-mono font-bold text-cyan-300 uppercase tracking-wider">
            ĐANG KIỂM TRA DẤU HIỆU RỦI RO
          </span>
        </div>
        <span className="text-[11px] font-mono text-slate-400">ĐANG XỬ LÝ</span>
      </div>

      {/* Target display */}
      <div className="py-2.5 font-mono text-xs sm:text-sm text-slate-300 truncate">
        <span className="text-slate-500 font-bold mr-2">&gt; ĐANG THẨM ĐỊNH:</span>
        <span className="text-white font-semibold">{query}</span>
      </div>

      {/* Multi-layered dynamic progress checkpoints */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 text-xs font-mono">
        <div className="flex items-center gap-2 text-emerald-400">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Phân tích cấu trúc đầu vào</span>
        </div>
        <div className="flex items-center gap-2 text-cyan-400">
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          <span>Đối chiếu báo cáo CyberAware đã duyệt</span>
        </div>
        <div className="flex items-center gap-2 text-amber-400">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          <span>Nhận diện mạo danh thương hiệu số</span>
        </div>
        <div className="flex items-center gap-2 text-purple-400">
          <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
          <span>Phát hiện từ khóa gây áp lực tâm lý</span>
        </div>
      </div>
    </div>
  );
};
