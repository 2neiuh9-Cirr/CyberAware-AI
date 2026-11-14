import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownToLine, ArrowRight, Clock3, MailCheck, Puzzle, ShieldCheck, Sparkles } from 'lucide-react';
import './GmailToolsSection.css';

export function GmailToolsSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const elements = sectionRef.current?.querySelectorAll('.gmail-tools-reveal');
    if (!elements) return;
    if (!('IntersectionObserver' in window)) {
      elements.forEach(element => element.classList.add('gmail-tools-visible'));
      return;
    }
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('gmail-tools-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12 });
    elements.forEach(element => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} id="tien-ich-gmail" aria-labelledby="gmail-tools-heading" className="relative isolate w-full scroll-mt-24 overflow-hidden border-b border-slate-200 bg-gradient-to-br from-white via-[#F8FAFC] to-[#EFF6FF] px-4 py-16 md:px-12 md:py-20">
      <div aria-hidden="true" className="gmail-tools-grid pointer-events-none absolute inset-0 opacity-50" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-32 h-80 w-80 rounded-full bg-blue-100/60 blur-3xl" />
      <div className="relative mx-auto w-full max-w-[1184px] text-slate-800">
        <div className="gmail-tools-reveal mb-10 max-w-3xl">
          <p className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#004AC6] shadow-sm"><Sparkles aria-hidden="true" className="h-4 w-4" /> CyberAware AI trong Gmail</p>
          <h2 id="gmail-tools-heading" className="mt-5 text-3xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-4xl lg:text-[42px]">Kiểm tra email ngay khi đọc</h2>
          <p className="mt-4 text-sm leading-relaxed text-slate-600 sm:text-base">Hai cách dùng chung bộ đánh giá của CyberAware AI. Kết quả chỉ gợi ý dấu hiệu rủi ro; hãy tự xác minh người gửi qua kênh chính thức trước khi cung cấp thông tin hoặc chuyển tiền.</p>
        </div>

        <div className="grid items-stretch gap-6 lg:grid-cols-2">
          <article className="gmail-tools-reveal gmail-tools-card gmail-tools-card-first group relative flex min-w-0 flex-col overflow-hidden rounded-[28px] border border-blue-100 bg-white p-6 shadow-[0_20px_55px_-30px_rgba(15,23,42,0.22)] sm:p-8">
            <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#004AC6] via-blue-500 to-cyan-400" />
            <div className="flex items-start justify-between gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#004AC6] to-blue-600 text-white shadow-[0_12px_26px_-12px_rgba(0,74,198,0.9)]"><Puzzle aria-hidden="true" className="h-7 w-7 transition-transform duration-300 group-hover:rotate-[-10deg] group-hover:scale-110" /></span>
              <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-[#004AC6]">Chrome · Máy tính</span>
            </div>
            <h3 className="mt-6 text-2xl font-extrabold tracking-tight text-slate-900">Tiện ích trình duyệt</h3>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">Dành cho Chrome trên máy tính. Mở thư trong Gmail, bấm biểu tượng CyberAware AI rồi chọn “Quét thư này”. Chỉ quét khi bạn chủ động bấm.</p>
            <ol className="mt-7 space-y-4 border-t border-slate-100 pt-6 text-sm text-slate-700">
              <li className="flex items-start gap-3"><span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-[#004AC6]">1</span><span>Giải nén tệp ZIP vào một thư mục cố định.</span></li>
              <li className="flex items-start gap-3"><span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-[#004AC6]">2</span><span>Mở <strong>chrome://extensions</strong>, bật Developer mode, chọn Load unpacked và trỏ tới thư mục vừa giải nén.</span></li>
              <li className="flex items-start gap-3"><span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-[#004AC6]">3</span><span>Mở Gmail, ghim tiện ích lên thanh công cụ và bấm quét thư cần kiểm tra.</span></li>
            </ol>
            <div className="mt-auto pt-8">
              <a className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#004AC6] px-5 py-3 text-sm font-bold text-white shadow-[0_12px_24px_-12px_rgba(0,74,198,0.8)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#003EA8] hover:shadow-[0_18px_30px_-12px_rgba(0,74,198,0.65)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004AC6] sm:w-auto" href="/downloads/cyberaware-gmail-extension.zip" download><ArrowDownToLine aria-hidden="true" className="h-4 w-4" /> Tải tiện ích ZIP <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" /></a>
              <p className="mt-4 text-xs leading-relaxed text-amber-800">Tiện ích kết hợp quy tắc và Gemini khi AI khả dụng. Bạn cần đồng ý trước khi quét; nếu AI không khả dụng, kết quả dựa trên quy tắc. Tiện ích được cài thủ công trong giai đoạn thử nghiệm.</p>
            </div>
          </article>

          <article className="gmail-tools-reveal gmail-tools-card gmail-tools-card-second group relative flex min-w-0 flex-col overflow-hidden rounded-[28px] border border-blue-100 bg-white p-6 shadow-[0_20px_55px_-30px_rgba(15,23,42,0.22)] sm:p-8">
            <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-400 via-blue-400 to-[#004AC6]" />
            <div className="flex items-start justify-between gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-[#004AC6]"><MailCheck aria-hidden="true" className="h-7 w-7 transition-transform duration-300 group-hover:-translate-y-1" /></span>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-600">Google Workspace</span>
            </div>
            <h3 className="mt-6 text-2xl font-extrabold tracking-tight text-slate-900">Google Workspace add-on</h3>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">Hiển thị thẻ đánh giá ở thanh bên Gmail trên máy tính và thiết bị di động. Khi bạn đã bật quét và mở add-on, Gmail sẽ cập nhật đánh giá theo thư đang xem.</p>
            <div className="mt-7 flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50 p-5 text-sm leading-relaxed text-amber-900"><Clock3 aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" /><p>Mã add-on đã được chuẩn bị, nhưng cần hoàn tất triển khai và xét duyệt trên Google Workspace Marketplace trước khi người dùng có thể cài công khai.</p></div>
            <div aria-hidden="true" className="mt-auto flex justify-end pt-8"><div className="relative flex h-28 w-44 items-center justify-center rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white shadow-inner"><MailCheck className="h-14 w-14 text-blue-300 transition-transform duration-500 group-hover:scale-110" /><span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-[#004AC6] shadow-[0_0_0_5px_rgba(0,74,198,0.1)]" /></div></div>
          </article>
        </div>

        <div className="gmail-tools-reveal gmail-tools-privacy mt-7 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white/90 p-5 text-sm text-slate-700 shadow-sm sm:flex-row sm:items-start sm:p-6">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#004AC6]"><ShieldCheck aria-hidden="true" className="h-5 w-5" /></span>
          <div><h3 className="font-bold text-slate-900">Dữ liệu được xử lý</h3><p className="mt-1 leading-relaxed">Sau khi bạn đồng ý, hệ thống gửi chủ đề, người gửi, tối đa 4.500 ký tự nội dung và 10 liên kết của thư đang mở tới máy chủ CyberAware AI. Ở bản có AI, chủ đề, nội dung và liên kết có thể tiếp tục được gửi tới Google Gemini để đánh giá bổ sung; địa chỉ người gửi không được gửi riêng tới Gemini. Nếu AI không khả dụng, hệ thống vẫn chấm bằng quy tắc. Nội dung thư không được lưu vào lịch sử quét.</p><p className="mt-2">Xem <a className="font-semibold text-[#004AC6] underline underline-offset-2" href="/chinh-sach-quyen-rieng-tu.html">chính sách quyền riêng tư</a> hoặc quay lại <Link className="font-semibold text-[#004AC6] underline underline-offset-2" to="/kiem-tra">công cụ kiểm tra</Link>.</p></div>
        </div>
      </div>
    </section>
  );
}
