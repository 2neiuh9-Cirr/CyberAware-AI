import React from 'react';
import { AlertTriangle, CheckCircle, ShieldAlert } from 'lucide-react';

interface RiskGaugeProps {
  score: number;
  level: 'AN_TOAN' | 'CANH_GIAC' | 'NGUY_HIEM';
  size?: 'sm' | 'md' | 'lg';
}

export const RiskGauge: React.FC<RiskGaugeProps> = ({ score, level, size = 'md' }) => {
  const getColor = () => {
    if (level === 'NGUY_HIEM') return { stroke: '#DC2626', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', label: 'NGUY HIỂM CAO' };
    if (level === 'CANH_GIAC') return { stroke: '#D97706', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', label: 'CẦN CẢNH GIÁC' };
    return { stroke: '#059669', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'ÍT DẤU HIỆU' };
  };

  const config = getColor();
  const radius = size === 'lg' ? 44 : size === 'md' ? 36 : 24;
  const strokeWidth = size === 'lg' ? 8 : 6;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="flex items-center gap-4">
      <div className="relative flex items-center justify-center shrink-0">
        <svg
          className="transform -rotate-90"
          width={radius * 2 + strokeWidth * 2}
          height={radius * 2 + strokeWidth * 2}
        >
          {/* Background circle */}
          <circle
            cx={radius + strokeWidth}
            cy={radius + strokeWidth}
            r={radius}
            stroke="#E2E8F0"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Animated progress circle */}
          <circle
            cx={radius + strokeWidth}
            cy={radius + strokeWidth}
            r={radius}
            stroke={config.stroke}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>

        <div className="absolute flex flex-col items-center justify-center text-center">
          <span className={`font-mono font-bold leading-none ${size === 'lg' ? 'text-2xl' : 'text-lg'} text-slate-900`}>
            {score}/100
          </span>
          <span className="text-[10px] uppercase font-bold text-slate-400 mt-0.5">Rủi ro</span>
        </div>
      </div>

      <div className="flex flex-col">
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold w-fit ${config.bg} ${config.text} border ${config.border}`}>
          {level === 'NGUY_HIEM' ? (
            <ShieldAlert className="w-3.5 h-3.5" />
          ) : level === 'CANH_GIAC' ? (
            <AlertTriangle className="w-3.5 h-3.5" />
          ) : (
            <CheckCircle className="w-3.5 h-3.5" />
          )}
          <span>{config.label}</span>
        </div>
        <p className="text-xs text-slate-500 mt-1">Chỉ số phân tích thuật toán thời gian thực</p>
      </div>
    </div>
  );
};
