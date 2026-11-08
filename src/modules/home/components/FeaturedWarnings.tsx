import { useEffect, useState } from 'react';
import { ArrowRight, CalendarDays, Clock3, Megaphone, TrendingUp, TriangleAlert, X } from 'lucide-react';
import { api } from '../../../api';

type Warning = {
  id: string;
  title: string;
  category: string;
  summary: string;
  sourceName: string;
  sourceUrl: string;
  sourceDate: string;
};

// One image taken from each linked article, stored locally in public/images.
const articleImages: Record<string, string> = {
  'vn-20261105-alert-11': '/images/vssid-gia-mao.jpg',
  'vn-20261105-alert-20': '/images/kich-ban-lua-dao-2026.jpg',
  'vn-20261105-alert-14': '/images/gia-mao-giong-noi-ai.jpg',
  'vn-20261105-alert-08': '/images/lua-dao-ma-qr.jpg',
  'vn-20261105-alert-17': '/images/sms-phat-nguoi-gia.jpg',
  'vn-20261105-alert-13': '/images/otp-evn-gia-mao.jpg',
  'vn-20261105-alert-19': '/images/vneid-gia-mao.jpg',
};

function formatDate(value: string) {
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

function WarningCard({ item, urgent = false }: { item: Warning; urgent?: boolean }) {
  return (
    <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" aria-label={`${item.title} — đọc tại ${item.sourceName} (mở tab mới)`}
      className={`group relative flex min-h-[132px] items-center gap-3 overflow-hidden rounded-2xl border border-slate-100 bg-white p-3 shadow-[0_2px_5px_rgba(15,23,42,.08)] transition-all duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-[0_12px_28px_rgba(15,23,42,.12)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 ${urgent ? 'before:absolute before:inset-y-2 before:left-0 before:w-1 before:rounded-r-full before:bg-rose-500' : ''}`}>
      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-100"><img src={articleImages[item.id]} alt="" loading="lazy" className={`h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 ${item.id === 'vn-20261105-alert-20' ? 'object-top' : ''}`} /></div>
      <div className="min-w-0">
        <p className={`mb-1 text-[10px] font-bold uppercase tracking-wide ${urgent ? 'text-rose-600' : 'text-orange-600'}`}>
          {urgent && <span className="mr-1 inline-block h-2 w-2 rounded-full bg-rose-400" />}{item.sourceName}
        </p>
        <h4 className="line-clamp-3 text-[13px] font-bold leading-snug text-slate-950 transition-colors group-hover:text-emerald-700">{item.title}</h4>
      </div>
    </a>
  );
}

export function FeaturedWarnings() {
  const [items, setItems] = useState<Warning[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    api<{ items: Warning[] }>('/public-warnings/featured')
      .then(result => { if (mounted) setItems(result.items); })
      .catch(() => { if (mounted) setError(true); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!noticeOpen) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setNoticeOpen(false); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [noticeOpen]);

  const featured = items[0];
  return (
    <section className="w-full bg-[#F8FAFC] px-4 py-16 md:px-12 md:py-20" aria-labelledby="featured-warnings-title">
      <div className="mx-auto w-full max-w-[1184px]">
        <div className="mb-9 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-rose-100 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-rose-600"><Megaphone className="h-4 w-4" />Tin tức &amp; Cảnh báo</span>
            <h2 id="featured-warnings-title" className="mt-3 text-2xl font-bold tracking-tight text-slate-950 md:text-4xl">Cập nhật An toàn mạng</h2>
          </div>
          <button type="button" onClick={() => setNoticeOpen(true)} className="group inline-flex w-fit items-center gap-2 text-sm font-semibold text-emerald-600 transition-colors hover:text-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-500">
            Xem tất cả tin tức <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </button>
        </div>

        {loading && <div className="grid gap-7 lg:grid-cols-2" aria-label="Đang tải cảnh báo"><div className="h-[540px] animate-pulse rounded-3xl bg-slate-200" /><div className="h-[540px] animate-pulse rounded-3xl bg-slate-200" /></div>}
        {!loading && error && <p className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-600">Chưa tải được cảnh báo. Vui lòng thử lại sau.</p>}
        {!loading && !error && !featured && <p className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-600">Chưa có cảnh báo đã duyệt để hiển thị.</p>}
        {!loading && featured && (
          <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <a href={featured.sourceUrl} target="_blank" rel="noopener noreferrer" aria-label={`${featured.title} — đọc tại ${featured.sourceName} (mở tab mới)`}
              className="group overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-[0_8px_22px_rgba(15,23,42,.08)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_36px_rgba(15,23,42,.14)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-500">
              <div className="relative h-56 overflow-hidden sm:h-72 lg:h-80">
                <img src={articleImages[featured.id]} alt="" loading="lazy" className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.03]" />
                <span className="absolute left-4 top-4 rounded-full bg-emerald-400 px-3 py-1 text-xs font-bold text-white shadow-sm">Cảnh báo nổi bật</span>
              </div>
              <div className="p-6">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500"><span className="inline-flex items-center gap-1.5"><CalendarDays className="h-4 w-4" />{formatDate(featured.sourceDate)}</span><span className="inline-flex items-center gap-1.5"><Clock3 className="h-4 w-4" />{featured.sourceName}</span></div>
                <h3 className="mt-4 text-xl font-bold leading-snug text-slate-950 transition-colors group-hover:text-emerald-700 md:text-2xl">{featured.title}</h3>
                <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-slate-600">{featured.summary}</p>
                <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-emerald-600">Đọc chi tiết <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
              </div>
            </a>
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="flex min-w-0 flex-col gap-5">
                <h3 className="flex h-8 items-center gap-2 text-lg font-bold text-slate-950"><TrendingUp className="h-5 w-5 text-orange-500" />Xu hướng Lừa đảo</h3>
                {items.slice(1, 4).map(item => <WarningCard key={item.id} item={item} />)}
              </div>
              <div className="flex min-w-0 flex-col gap-5">
                <h3 className="flex h-8 items-center gap-2 text-lg font-bold text-slate-950"><TriangleAlert className="h-5 w-5 text-rose-500" />Cảnh báo Khẩn cấp</h3>
                {items.slice(4, 7).map(item => <WarningCard key={item.id} item={item} urgent />)}
              </div>
            </div>
          </div>
        )}
      </div>
      {noticeOpen && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 px-4" onMouseDown={event => { if (event.target === event.currentTarget) setNoticeOpen(false); }}>
        <div role="dialog" aria-modal="true" aria-labelledby="news-notice-title" className="relative w-full max-w-sm rounded-2xl bg-white p-7 text-center shadow-2xl">
          <button type="button" onClick={() => setNoticeOpen(false)} aria-label="Đóng thông báo" className="absolute right-4 top-4 rounded-lg p-1 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50"><Megaphone className="h-7 w-7 text-emerald-600" /></div>
          <h3 id="news-notice-title" className="text-xl font-bold text-slate-950">Tính năng đang phát triển</h3>
          <p className="mt-2 text-sm text-slate-600">Trang xem tất cả tin tức sẽ sớm ra mắt.</p>
          <button type="button" onClick={() => setNoticeOpen(false)} className="mt-6 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">Đã hiểu</button>
        </div>
      </div>}
    </section>
  );
}
