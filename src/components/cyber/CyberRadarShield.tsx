import React, { useState } from 'react';
import { Shield, ShieldCheck, Zap, Lock, Globe, AlertCircle, Eye, Cpu } from 'lucide-react';

export const CyberRadarShield: React.FC = () => {
  const [activeNode, setActiveNode] = useState<string | null>(null);

  const nodes = [
    {
      id: 'node-phishing',
      label: 'Chống Phishing',
      status: 'Bảo vệ thời gian thực',
      icon: Globe,
      color: 'text-[#004AC6]',
      bg: 'bg-blue-50/90',
      border: 'border-blue-200',
      x: '12%',
      y: '20%',
      delay: '0s',
    },
    {
      id: 'node-deepfake',
      label: 'Quét Deepfake AI',
      status: 'Phân tích khẩu hình & giọng nói',
      icon: Cpu,
      color: 'text-purple-600',
      bg: 'bg-purple-50/90',
      border: 'border-purple-200',
      x: '86%',
      y: '22%',
      delay: '0.8s',
    },
    {
      id: 'node-banking',
      label: 'Bảo vệ Smart OTP',
      status: 'Chặn mạo danh ngân hàng số',
      icon: Lock,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50/90',
      border: 'border-emerald-200',
      x: '10%',
      y: '78%',
      delay: '1.4s',
    },
    {
      id: 'node-blacklist',
      label: '3.420 Blacklist NCSC',
      status: 'Cập nhật tự động 2026',
      icon: Zap,
      color: 'text-amber-600',
      bg: 'bg-amber-50/90',
      border: 'border-amber-200',
      x: '84%',
      y: '76%',
      delay: '2s',
    },
  ];

  return (
    <div className="relative w-full max-w-[560px] h-[340px] sm:h-[380px] mx-auto flex items-center justify-center select-none my-4">
      {/* 1. Cyber Matrix Grid Background with Crosshairs */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {/* Subtle grid lines */}
        <div 
          className="w-full h-full opacity-35"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #004AC6 1px, transparent 0)`,
            backgroundSize: '24px 24px',
          }}
        />
        {/* Target crosshairs */}
        <div className="absolute w-[280px] sm:w-[320px] h-[280px] sm:h-[320px] border border-[#004AC6]/15 rounded-full" />
        <div className="absolute w-[200px] sm:w-[230px] h-[200px] sm:h-[230px] border border-[#004AC6]/25 border-dashed rounded-full" />
        <div className="absolute w-[120px] h-[120px] border border-[#004AC6]/35 rounded-full" />
        
        {/* Corner coordinates */}
        <div className="absolute top-2 left-2 text-[10px] font-mono text-slate-400">SYS.GUARD // LAT: 21.0285° N</div>
        <div className="absolute bottom-2 right-2 text-[10px] font-mono text-[#004AC6] font-semibold flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>RADAR THẨM ĐỊNH THỜI GIAN THỰC</span>
        </div>
      </div>

      {/* 2. Rotating Radar Scanner Beam */}
      <div className="absolute w-[280px] sm:w-[320px] h-[280px] sm:h-[320px] rounded-full pointer-events-none animate-radar-spin flex items-center justify-center">
        <div className="w-1/2 h-full absolute right-0 top-0 overflow-hidden">
          <div className="w-full h-full bg-gradient-to-l from-[#004AC6]/25 to-transparent origin-left transform -rotate-45 blur-xs" />
        </div>
        <div className="w-1/2 h-0.5 bg-gradient-to-r from-transparent via-[#004AC6] to-white absolute right-0 top-1/2 transform -translate-y-1/2 shadow-[0_0_8px_#004AC6]" />
      </div>

      {/* 3. Ripple Waves Emanating from Central Shield */}
      <div className="absolute w-28 h-28 rounded-full border-2 border-[#004AC6]/40 animate-ripple-ring pointer-events-none" />
      <div className="absolute w-28 h-28 rounded-full border-2 border-emerald-500/40 animate-ripple-ring pointer-events-none" style={{ animationDelay: '1.5s' }} />

      {/* 4. Central Cyber Shield Core */}
      <div className="relative z-10 flex flex-col items-center justify-center group cursor-pointer">
        <div className="relative w-28 h-28 sm:w-32 sm:h-32 flex items-center justify-center animate-shield-pulse">
          {/* Shield Outer Hex Glow */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#004AC6]/20 via-emerald-500/15 to-[#004AC6]/25 rounded-3xl blur-md" />
          
          {/* Shield Emblem Container */}
          <div className="relative w-22 h-22 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-[#004AC6] via-[#003EA8] to-[#059669] p-0.5 shadow-xl flex items-center justify-center text-white">
            <div className="w-full h-full bg-slate-900/90 rounded-[14px] flex flex-col items-center justify-center gap-1 backdrop-blur-xs">
              <ShieldCheck className="w-9 h-9 text-emerald-400 filter drop-shadow-[0_0_8px_rgba(5,150,105,0.7)]" strokeWidth={2.2} />
              <span className="text-[10px] font-mono font-bold tracking-wider text-blue-200">AI CORE</span>
            </div>
          </div>
        </div>

        {/* Status Pill beneath core */}
        <div className="mt-1 px-3 py-1 bg-white/95 backdrop-blur-md rounded-full shadow-xs border border-slate-200 flex items-center gap-1.5 transition-transform group-hover:scale-105">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-bold text-slate-800">Lá chắn AI Chủ động</span>
        </div>
      </div>

      {/* 5. Orbiting Floating Threat Intelligence Nodes */}
      {nodes.map((node) => {
        const Icon = node.icon;
        const isHovered = activeNode === node.id;
        return (
          <div
            key={node.id}
            onMouseEnter={() => setActiveNode(node.id)}
            onMouseLeave={() => setActiveNode(null)}
            style={{
              left: node.x,
              top: node.y,
              transform: 'translate(-50%, -50%)',
              animationDelay: node.delay,
            }}
            className="absolute z-20 animate-cyber-float cursor-pointer transition-transform duration-200 hover:scale-110"
          >
            <div className={`flex items-center gap-2 p-2 sm:px-3 sm:py-2 rounded-xl bg-white/95 backdrop-blur-md shadow-md border ${node.border} transition-all`}>
              <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg ${node.bg} ${node.color} flex items-center justify-center shrink-0`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-bold text-slate-900 leading-tight whitespace-nowrap">{node.label}</span>
                <span className="text-[10px] text-slate-500 leading-tight whitespace-nowrap">{node.status}</span>
              </div>
            </div>

            {/* Hover Tooltip on small screens */}
            {isHovered && (
              <div className="sm:hidden absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 bg-slate-900 text-white text-[11px] font-medium rounded-lg shadow-lg whitespace-nowrap z-30">
                {node.label}: {node.status}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
