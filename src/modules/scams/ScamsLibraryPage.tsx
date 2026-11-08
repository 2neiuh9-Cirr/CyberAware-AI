import React, { useState } from 'react';
import {
  ShieldAlert,
  Search,
  Filter,
  CreditCard,
  Sparkles,
  FileText,
  ShieldCheck,
  Brain,
  Video,
  PhoneCall,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

const iconThemes = {
  bank: {
    accent: 'bg-gradient-to-r from-rose-500 to-red-400',
    icon: 'bg-rose-50 text-rose-600 ring-rose-100',
    label: 'bg-rose-50 text-rose-700',
    title: 'group-hover:text-rose-700',
    signs: 'group-hover:border-rose-100 group-hover:bg-rose-50/40',
    action: 'border-rose-100 bg-rose-50/70 text-rose-700 hover:border-rose-600 hover:bg-rose-600',
  },
  gift: {
    accent: 'bg-gradient-to-r from-amber-400 to-orange-400',
    icon: 'bg-amber-50 text-amber-600 ring-amber-100',
    label: 'bg-amber-50 text-amber-700',
    title: 'group-hover:text-amber-700',
    signs: 'group-hover:border-amber-100 group-hover:bg-amber-50/40',
    action: 'border-amber-100 bg-amber-50/70 text-amber-700 hover:border-amber-600 hover:bg-amber-600',
  },
  job: {
    accent: 'bg-gradient-to-r from-blue-600 to-cyan-400',
    icon: 'bg-blue-50 text-blue-600 ring-blue-100',
    label: 'bg-blue-50 text-blue-700',
    title: 'group-hover:text-blue-700',
    signs: 'group-hover:border-blue-100 group-hover:bg-blue-50/40',
    action: 'border-blue-100 bg-blue-50/70 text-blue-700 hover:border-blue-600 hover:bg-blue-600',
  },
  police: {
    accent: 'bg-gradient-to-r from-emerald-500 to-teal-400',
    icon: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
    label: 'bg-emerald-50 text-emerald-700',
    title: 'group-hover:text-emerald-700',
    signs: 'group-hover:border-emerald-100 group-hover:bg-emerald-50/40',
    action: 'border-emerald-100 bg-emerald-50/70 text-emerald-700 hover:border-emerald-600 hover:bg-emerald-600',
  },
  phone: {
    accent: 'bg-gradient-to-r from-cyan-500 to-sky-400',
    icon: 'bg-cyan-50 text-cyan-700 ring-cyan-100',
    label: 'bg-cyan-50 text-cyan-800',
    title: 'group-hover:text-cyan-800',
    signs: 'group-hover:border-cyan-100 group-hover:bg-cyan-50/40',
    action: 'border-cyan-100 bg-cyan-50/70 text-cyan-800 hover:border-cyan-700 hover:bg-cyan-700',
  },
  deepfake: {
    accent: 'bg-gradient-to-r from-violet-600 to-fuchsia-400',
    icon: 'bg-violet-50 text-violet-600 ring-violet-100',
    label: 'bg-violet-50 text-violet-700',
    title: 'group-hover:text-violet-700',
    signs: 'group-hover:border-violet-100 group-hover:bg-violet-50/40',
    action: 'border-violet-100 bg-violet-50/70 text-violet-700 hover:border-violet-600 hover:bg-violet-600',
  },
} as const;

export const ScamsLibraryPage: React.FC = () => {
  const { setSelectedScenario, scenarios: SCAM_SCENARIOS } = useAppStore();
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchWord, setSearchWord] = useState('');

  const categories = [
    { id: 'all', label: 'Tất cả hình thức' },
    { id: 'Giả mạo ngân hàng', label: 'Mạo danh ngân hàng & OTP' },
    { id: 'Quà tặng ảo', label: 'Trúng thưởng & Tri ân' },
    { id: 'Lừa làm CTV', label: 'Việc nhẹ lương cao' },
    { id: 'Giả danh cơ quan nhà nước', label: 'Mạo danh Công an / Viện KS' },
    { id: 'Công nghệ AI giả mạo', label: 'Deepfake AI Voice & Video' },
    { id: 'Dịch vụ công giả mạo', label: 'Mạo danh VNeID' },
  ];

  const filtered = SCAM_SCENARIOS.filter((scam) => {
    const matchCategory = filterCategory === 'all' || scam.category === filterCategory;
    const matchSearch =
      searchWord === '' ||
      scam.title.toLowerCase().includes(searchWord.toLowerCase()) ||
      scam.summary.toLowerCase().includes(searchWord.toLowerCase()) ||
      scam.signs.toLowerCase().includes(searchWord.toLowerCase());
    return matchCategory && matchSearch;
  });

  return (
    <div className="w-full flex flex-col items-center py-8 md:py-12 px-4 md:px-12 max-w-[1280px] mx-auto">
      {/* Top Banner */}
      <div className="w-full flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 pb-8 border-b border-slate-200">
        <div>
          <div className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-bold text-red-700 mb-2">
            <ShieldAlert className="w-4 h-4" />
            <span className="min-w-0">RADAR CẢNH BÁO LỪA ĐẢO TOÀN QUỐC 2026</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
            Thư viện Kịch bản & Thủ đoạn tội phạm mạng
          </h1>
          <p className="text-slate-600 text-sm md:text-base mt-2 max-w-2xl">
            Tổng hợp và bóc tách chi tiết các kịch bản lừa đảo đang hoành hành tại Việt Nam. Nắm vững tâm lý thao túng để không bao giờ trở thành nạn nhân.
          </p>
        </div>

        {/* Live Threat Counter Badge */}
        <div className="flex items-center gap-4 bg-slate-900 text-white p-4 rounded-2xl shadow-lg shrink-0">
          <div className="w-10 h-10 bg-red-500/20 text-red-400 rounded-xl flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400">Kịch bản học tập minh họa</div>
            <div className="text-2xl font-bold font-mono text-red-400">{SCAM_SCENARIOS.length} kịch bản</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="w-full flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 mb-8">
        <div className="flex flex-wrap items-center gap-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setFilterCategory(cat.id)}
              className={`py-2 px-3.5 rounded-xl text-xs md:text-sm font-semibold transition-all cursor-pointer ${
                filterCategory === cat.id
                  ? 'bg-[#004AC6] text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="relative w-full min-w-0 md:w-auto md:min-w-[260px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchWord}
            onChange={(e) => setSearchWord(e.target.value)}
            placeholder="Tìm theo từ khóa (OTP, Shopee, VNeID...)"
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#004AC6]"
          />
        </div>
      </div>

      {/* Scenarios Grid */}
      {filtered.length === 0 ? (
        <div className="w-full bg-white rounded-2xl p-12 text-center text-slate-500 border border-slate-200">
          Không tìm thấy kịch bản nào khớp với từ khóa "{searchWord}".
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
          {filtered.map((scam) => {
            const theme = iconThemes[scam.iconType];
            return (
            <div
              key={scam.id}
              className="group relative flex h-full flex-col overflow-hidden rounded-[22px] border border-white/90 bg-white p-6 shadow-[0_8px_28px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70 transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_44px_rgba(15,23,42,0.13)] focus-within:-translate-y-1 focus-within:ring-blue-300"
            >
              <div aria-hidden="true" className={`absolute inset-x-0 top-0 h-1 transition-all duration-300 group-hover:h-1.5 ${theme.accent}`} />
              <div className="flex flex-1 flex-col">
                <div className="mb-5 flex items-start justify-between gap-3">
                  <div
                    className={`w-12 h-12 rounded-2xl flex shrink-0 items-center justify-center ring-1 ring-inset transition-transform duration-300 group-hover:rotate-[-5deg] group-hover:scale-110 ${theme.icon}`}
                  >
                    {scam.iconType === 'bank' && <CreditCard className="w-5 h-5" />}
                    {scam.iconType === 'gift' && <Sparkles className="w-5 h-5" />}
                    {scam.iconType === 'job' && <FileText className="w-5 h-5" />}
                    {scam.iconType === 'police' && <ShieldCheck className="w-5 h-5" />}
                    {scam.iconType === 'phone' && <PhoneCall className="w-5 h-5" />}
                    {scam.iconType === 'deepfake' && <Video className="w-5 h-5" />}
                  </div>

                  <span
                    className={`max-w-[70%] rounded-full px-3 py-1 text-right text-[11px] font-bold leading-tight ${theme.label}`}
                  >
                    {scam.category}
                  </span>
                </div>

                <h3 className={`text-lg font-bold leading-snug text-slate-900 transition-colors ${theme.title}`}>
                  {scam.title}
                </h3>
                <p className="mt-3 text-slate-600 text-sm leading-relaxed line-clamp-3">
                  {scam.summary}
                </p>

                <div className={`mt-5 rounded-xl border border-slate-100 bg-slate-50/80 p-3.5 transition-colors duration-300 ${theme.signs}`}>
                  <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Dấu hiệu lật tẩy:
                  </span>
                  <span className="text-[13px] font-medium leading-relaxed text-slate-800">
                    {scam.signs}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedScenario(scam)}
                className={`mt-6 flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl border px-4 py-3 text-left text-sm font-semibold transition-all duration-300 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${theme.action}`}
              >
                <span>Xem chi tiết kịch bản & Cách phòng chống</span>
                <ChevronRight className="h-4 w-4 shrink-0 transition-transform duration-300 group-hover:translate-x-1" />
              </button>
            </div>
          ); })}
        </div>
      )}
    </div>
  );
};
