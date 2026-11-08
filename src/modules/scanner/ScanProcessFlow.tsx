import React from 'react';
import { BrainCircuit, FileSearch, Link2, ShieldCheck } from 'lucide-react';
import './ScanProcessFlow.css';

export const ScanProcessFlow: React.FC = () => (
  <section aria-labelledby="scan-process-title" className="relative mb-10 w-full max-w-[1120px] py-3 md:mb-14 md:py-7">
    <div className="relative grid grid-cols-1 items-center gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1.2fr_1fr] lg:gap-5">
      <div className="scan-flow-track" aria-hidden="true" />
      <div className="scan-flow-card flex min-h-44 flex-col items-center justify-center rounded-[1.75rem] border border-blue-100 bg-white/95 px-5 py-5 text-center shadow-[0_12px_28px_-18px_rgba(0,74,198,0.45)]">
        <span className="scan-flow-icon mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-[#004AC6]">
          <Link2 className="h-6 w-6" aria-hidden="true" />
        </span>
        <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-blue-500">Bước 01</span>
        <h3 className="mt-1 text-base font-bold text-slate-900">Dữ liệu bạn cung cấp</h3>
        <p className="mt-1 text-xs leading-5 text-slate-500">Đường dẫn hoặc nội dung tin nhắn cần kiểm tra</p>
      </div>

      <div className="scan-flow-card flex min-h-44 flex-col items-center justify-center rounded-[1.75rem] border border-amber-100 bg-white/95 px-5 py-5 text-center shadow-[0_12px_28px_-18px_rgba(180,83,9,0.4)]">
        <span className="scan-flow-icon mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
          <FileSearch className="h-6 w-6" aria-hidden="true" />
        </span>
        <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-amber-600">Bước 02</span>
        <h3 className="mt-1 text-base font-bold text-slate-900">Đối chiếu dấu hiệu</h3>
        <p className="mt-1 text-xs leading-5 text-slate-500">Bộ quy tắc và cảnh báo đã được duyệt</p>
      </div>

      <div className="scan-flow-ai relative flex min-h-64 items-center justify-center py-3 sm:col-span-2 lg:col-span-1 lg:py-0">
        <div className="scan-flow-glow pointer-events-none absolute h-64 w-64 rounded-full bg-cyan-100/60 blur-3xl" />
        <div className="scan-flow-orbit relative flex h-60 w-60 items-center justify-center rounded-full border border-cyan-100 bg-white/65 shadow-[0_0_55px_rgba(6,182,212,0.13)]">
          <div className="scan-flow-ring relative flex h-48 w-48 items-center justify-center rounded-full">
            <div className="scan-flow-core flex h-40 w-40 flex-col items-center justify-center rounded-full border-[3px] border-cyan-400 bg-gradient-to-br from-white via-cyan-50 to-blue-50 px-4 text-center shadow-[0_14px_36px_-20px_rgba(0,74,198,0.5)]">
              <BrainCircuit className="h-7 w-7 text-[#004AC6]" aria-hidden="true" />
              <span className="mt-2 text-[10px] font-bold uppercase tracking-[0.14em] text-cyan-700">AI hỗ trợ</span>
              <h3 className="mt-1 text-lg font-extrabold leading-tight text-slate-900">CyberAware AI</h3>
              <span className="mt-1 text-[10px] leading-4 text-slate-500">URL & SMS khi khả dụng</span>
            </div>
          </div>
        </div>
      </div>

      <div className="scan-flow-card flex min-h-44 flex-col items-center justify-center rounded-[1.75rem] border border-indigo-100 bg-white/95 px-5 py-5 text-center shadow-[0_12px_28px_-18px_rgba(67,56,202,0.4)] sm:col-span-2 sm:mx-auto sm:w-[calc(50%-0.5rem)] lg:col-span-1 lg:mx-0 lg:w-auto">
        <span className="scan-flow-icon mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
          <ShieldCheck className="h-6 w-6" aria-hidden="true" />
        </span>
        <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-indigo-500">Bước 03</span>
        <h3 className="mt-1 text-base font-bold text-slate-900">Kết quả có căn cứ</h3>
        <p className="mt-1 text-xs leading-5 text-slate-500">Điểm tham khảo, dấu hiệu và khuyến nghị</p>
      </div>
    </div>

    <div className="relative mt-6 text-center">
      <h2 id="scan-process-title" className="text-sm font-extrabold uppercase tracking-[0.2em] text-slate-600 md:text-base">
        Quy trình kiểm tra của CyberAware
      </h2>
      <p className="mx-auto mt-2 max-w-2xl text-xs leading-5 text-slate-500 md:text-sm">
        Kết quả giúp nhận diện dấu hiệu rủi ro; không xác nhận một đối tượng là an toàn hay đã lừa đảo.
      </p>
    </div>
  </section>
);
