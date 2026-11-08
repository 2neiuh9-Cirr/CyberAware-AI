import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, BookOpen, FileText, GraduationCap, Info, Search, ShieldAlert, ShieldCheck, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { tr, useSitePreferences } from '../../sitePreferences';

type SearchItem = { id: string; title: string; detail: string; kind: 'page' | 'scenario' | 'course'; path: string; keywords?: string; scenarioId?: string };

const normalize = (value: string) => value.toLocaleLowerCase('vi').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').trim();

export function SiteSearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const { language } = useSitePreferences();
  const { scenarios, courses, setSelectedScenario } = useAppStore();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) { setQuery(''); setSelected(0); return; }
    inputRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener('keydown', onKeyDown); };
  }, [open, onClose]);

  const pages: SearchItem[] = [
    { id: 'home', title: tr(language, 'Trang chủ', 'Home'), detail: tr(language, 'Tổng quan CyberAware AI', 'CyberAware AI overview'), kind: 'page', path: '/', keywords: 'trang chu home cyberaware' },
    { id: 'scan', title: tr(language, 'Kiểm tra lừa đảo', 'Scam check'), detail: tr(language, 'Phân tích URL và tin nhắn đáng ngờ', 'Analyze suspicious URLs and messages'), kind: 'page', path: '/kiem-tra', keywords: 'kiem tra lua dao scan url sms phone bank dien thoai ngan hang' },
    { id: 'warnings', title: tr(language, 'Cảnh báo', 'Scam warnings'), detail: tr(language, 'Kịch bản và thủ đoạn lừa đảo', 'Scam scenarios and warning signs'), kind: 'page', path: '/canh-bao', keywords: 'canh bao thu doan kich ban scam warning' },
    { id: 'learning', title: tr(language, 'Học tập', 'Learning'), detail: tr(language, 'Khóa học và bài kiểm tra tự vệ số', 'Digital safety courses and quizzes'), kind: 'page', path: '/hoc-tap', keywords: 'hoc tap khoa hoc quiz bai hoc learning course' },
    { id: 'reports', title: tr(language, 'Báo cáo cộng đồng', 'Community reports'), detail: tr(language, 'Xem báo cáo lừa đảo công khai', 'Browse public scam reports'), kind: 'page', path: '/bao-cao', keywords: 'bao cao cong dong report scam' },
    { id: 'about', title: tr(language, 'Giới thiệu', 'About'), detail: tr(language, 'Thông tin về dự án CyberAware AI', 'About the CyberAware AI project'), kind: 'page', path: '/gioi-thieu', keywords: 'gioi thieu about du an project' },
  ];

  // Only catalog data returned by public endpoints is indexed. Private scans,
  // account records, reports and every administrator route stay out of search.
  const items = useMemo<SearchItem[]>(() => [
    ...pages,
    ...scenarios.map(scenario => ({ id: `scenario-${scenario.id}`, title: scenario.title, detail: scenario.summary, kind: 'scenario' as const, path: '/canh-bao', scenarioId: scenario.id, keywords: scenario.category })),
    ...courses.map(course => ({ id: `course-${course.id}`, title: course.title, detail: course.description, kind: 'course' as const, path: `/hoc-tap?course=${encodeURIComponent(course.id)}`, keywords: course.category })),
  ], [language, scenarios, courses]);

  const results = useMemo(() => {
    const needle = normalize(query);
    if (!needle) return items.filter(item => item.kind === 'page').slice(0, 6);
    const terms = needle.split(/\s+/).filter(Boolean);
    return items.filter(item => {
      const content = normalize(`${item.title} ${item.detail} ${item.keywords || ''}`);
      return terms.every(term => content.includes(term));
    })
      .sort((a, b) => Number(normalize(b.title).startsWith(needle)) - Number(normalize(a.title).startsWith(needle)))
      .slice(0, 10);
  }, [items, query]);

  const choose = (item: SearchItem) => {
    onClose();
    navigate(item.path);
    if (item.scenarioId) {
      const scenario = scenarios.find(entry => entry.id === item.scenarioId);
      if (scenario) void setSelectedScenario(scenario);
    }
  };

  if (!open) return null;
  return <div className="fixed inset-0 z-[100] flex items-start justify-center bg-slate-950/65 px-3 pt-[9vh] backdrop-blur-sm sm:px-6" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div role="dialog" aria-modal="true" aria-label={tr(language, 'Tìm kiếm trong CyberAware', 'Search CyberAware')} className="w-full max-w-2xl overflow-hidden rounded-[1.75rem] border border-blue-100 bg-white shadow-[0_30px_90px_-20px_rgba(0,30,90,0.48)]">
      <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3 sm:px-5">
        <Search className="h-5 w-5 shrink-0 text-[#004AC6]" aria-hidden="true" />
        <input ref={inputRef} value={query} maxLength={120} onChange={event => { setQuery(event.target.value); setSelected(0); }} onKeyDown={event => {
          if (event.key === 'ArrowDown' && results.length) { event.preventDefault(); setSelected(index => Math.min(results.length - 1, index + 1)); }
          if (event.key === 'ArrowUp' && results.length) { event.preventDefault(); setSelected(index => Math.max(0, index - 1)); }
          if (event.key === 'Enter' && results[selected]) { event.preventDefault(); choose(results[selected]); }
        }} placeholder={tr(language, 'Tìm trang, kịch bản hoặc khóa học...', 'Search pages, scenarios or courses...')} aria-label={tr(language, 'Từ khóa tìm kiếm', 'Search query')} className="min-w-0 flex-1 bg-transparent py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 sm:text-base" />
        {query && <button type="button" onClick={() => { setQuery(''); setSelected(0); inputRef.current?.focus(); }} aria-label={tr(language, 'Xóa từ khóa', 'Clear search')} className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"><X className="h-4 w-4" /></button>}
        <button type="button" onClick={onClose} aria-label={tr(language, 'Đóng tìm kiếm', 'Close search')} className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-bold text-slate-500 hover:bg-slate-100">ESC</button>
      </div>
      <div className="max-h-[min(60vh,480px)] overflow-y-auto p-2 sm:p-3">
        <p className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">{query ? tr(language, 'Kết quả tìm kiếm', 'Search results') : tr(language, 'Khám phá CyberAware', 'Explore CyberAware')}</p>
        {results.length ? <ul className="space-y-1">{results.map((item, index) => {
          const Icon = item.kind === 'scenario' ? ShieldAlert : item.kind === 'course' ? GraduationCap : item.id === 'scan' ? ShieldCheck : item.id === 'learning' ? BookOpen : FileText;
          return <li key={item.id}><button type="button" onMouseEnter={() => setSelected(index)} onClick={() => choose(item)} className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition-colors ${selected === index ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#004AC6] ring-1 ring-blue-100"><Icon className="h-5 w-5" aria-hidden="true" /></span>
            <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-slate-900">{item.title}</span><span className="mt-0.5 block truncate text-xs text-slate-500">{item.detail}</span></span>
            <span className="hidden rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-slate-500 ring-1 ring-slate-200 sm:block">{item.kind === 'scenario' ? tr(language, 'Kịch bản', 'Scenario') : item.kind === 'course' ? tr(language, 'Khóa học', 'Course') : tr(language, 'Trang', 'Page')}</span>
            <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
          </button></li>;
        })}</ul> : <div className="flex flex-col items-center px-6 py-12 text-center"><Info className="h-9 w-9 text-slate-300" aria-hidden="true" /><p className="mt-3 font-bold text-slate-800">{tr(language, 'Không tìm thấy kết quả nào', 'No results found')}</p><p className="mt-1 text-sm text-slate-500">{tr(language, 'Thử từ khóa khác hoặc tìm trong các trang công khai của CyberAware.', 'Try another keyword or browse CyberAware’s public pages.')}</p></div>}
      </div>
      <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-2.5 text-[11px] text-slate-500 sm:px-5"><span>{tr(language, 'Chỉ tìm trong nội dung công khai', 'Public content only')}</span><span>{tr(language, '↑ ↓ chọn · Enter mở · Esc đóng', '↑ ↓ select · Enter open · Esc close')}</span></div>
    </div>
  </div>;
}
