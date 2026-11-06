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
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-700 text-xs font-bold mb-2 border border-red-200">
            <ShieldAlert className="w-4 h-4" />
            <span>RADAR CẢNH BÁO LỪA ĐẢO TOÀN QUỐC 2026</span>
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

        <div className="relative min-w-[260px]">
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
          {filtered.map((scam) => (
            <div
              key={scam.id}
              className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between hover:shadow-lg transition-all group"
            >
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                      scam.badgeColor === 'red'
                        ? 'bg-red-50 text-red-600'
                        : scam.badgeColor === 'purple'
                        ? 'bg-purple-50 text-purple-600'
                        : scam.badgeColor === 'amber'
                        ? 'bg-amber-50 text-amber-600'
                        : 'bg-blue-50 text-[#004AC6]'
                    }`}
                  >
                    {scam.iconType === 'bank' && <CreditCard className="w-5 h-5" />}
                    {scam.iconType === 'gift' && <Sparkles className="w-5 h-5" />}
                    {scam.iconType === 'job' && <FileText className="w-5 h-5" />}
                    {scam.iconType === 'police' && <ShieldCheck className="w-5 h-5" />}
                    {scam.iconType === 'phone' && <PhoneCall className="w-5 h-5" />}
                    {scam.iconType === 'deepfake' && <Video className="w-5 h-5" />}
                  </div>

                  <span
                    className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                      scam.badgeColor === 'red'
                        ? 'bg-red-100 text-red-700'
                        : scam.badgeColor === 'purple'
                        ? 'bg-purple-100 text-purple-700'
                        : scam.badgeColor === 'amber'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-blue-100 text-[#004AC6]'
                    }`}
                  >
                    {scam.category}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-slate-900 group-hover:text-[#004AC6] transition-colors">
                  {scam.title}
                </h3>
                <p className="text-slate-600 text-xs md:text-sm leading-relaxed line-clamp-3">
                  {scam.summary}
                </p>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 mt-1">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block mb-1">
                    Dấu hiệu lật tẩy:
                  </span>
                  <span className="text-xs text-slate-800 font-medium leading-snug">
                    {scam.signs}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setSelectedScenario(scam)}
                className="w-full mt-6 py-2.5 px-4 bg-slate-100 hover:bg-[#004AC6] hover:text-white text-slate-800 font-semibold text-xs md:text-sm rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Xem chi tiết kịch bản & Cách phòng chống</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
