import { useEffect, useRef } from 'react';
import { Bot, CircleAlert, Image as ImageIcon, MessageSquareText, PlayCircle, Send, Sparkles, Zap } from 'lucide-react';
import { openChatFullScreen } from '../../../components/chat/chatEvents';
import './AiChatShowcase.css';

export function AiChatShowcase() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const elements = sectionRef.current?.querySelectorAll('.ai-chat-demo-card, .ai-chat-demo-copy');
    if (!elements) return;
    if (!('IntersectionObserver' in window)) {
      elements.forEach(element => element.classList.add('ai-chat-demo-visible'));
      return;
    }
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('ai-chat-demo-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.15 });
    elements.forEach(element => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} aria-labelledby="ai-chat-showcase-title" className="relative w-full overflow-hidden border-b border-slate-100 bg-gradient-to-br from-white via-[#F8FAFC] to-[#EFF6FF] px-4 py-14 md:px-12 md:py-20">
      <div className="pointer-events-none absolute inset-0 opacity-40" style={{ backgroundImage: 'linear-gradient(to right, #dbeafe 1px, transparent 1px), linear-gradient(to bottom, #dbeafe 1px, transparent 1px)', backgroundSize: '56px 56px' }} />
      <div className="relative mx-auto grid w-full max-w-[1184px] items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
        <div aria-label="Minh họa cuộc trò chuyện với trợ lý AI, có thể cuộn bên trong" className="ai-chat-demo-card order-2 mx-auto flex h-[565px] max-h-[calc(100dvh-32px)] w-full max-w-[448px] flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_60px_-18px_rgba(15,23,42,0.22)] lg:order-1">
          <div className="flex shrink-0 items-center gap-3 border-b border-slate-100 bg-white px-4 py-4">
            <span className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#004AC6] to-[#003896] text-white shadow-sm">
              <Bot className="h-6 w-6" />
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-[#0F172A]">Trợ lý AI CyberAware</p>
              <p className="text-xs font-medium text-emerald-700">Sẵn sàng hỗ trợ</p>
            </div>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-[#004AC6]">Minh họa</span>
          </div>

          <div tabIndex={0} role="region" aria-label="Hội thoại minh họa, cuộn để xem thêm" className="ai-chat-demo-scroll min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain bg-[#F8FAFC] px-5 py-5 touch-pan-y sm:px-6">
            <div className="ml-auto max-w-[88%] rounded-2xl rounded-br-sm bg-[#004AC6] px-4 py-3 text-sm leading-relaxed text-white shadow-sm">
              Mình nhận được tin nhắn yêu cầu chuyển phí trước để nhận quà. Có đáng nghi không?
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-white/25 bg-white/15 px-3 py-2 text-xs">
                <ImageIcon className="h-5 w-5 shrink-0" />
                <span>Ảnh chụp tin nhắn</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-medium text-[#004AC6]">
              <Sparkles className="ai-chat-demo-sparkle h-4 w-4" />
              Đã xem các dấu hiệu trong tình huống
            </div>

            <div className="max-w-[92%] rounded-2xl rounded-bl-sm border border-slate-200 bg-white p-4 text-sm leading-relaxed text-slate-700 shadow-sm">
              <div className="flex items-center gap-2 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 font-bold text-rose-700">
                <CircleAlert className="h-4 w-4 shrink-0" />
                Có dấu hiệu cần cảnh giác
              </div>
              <p className="mt-3">Yêu cầu chuyển tiền trước để nhận quà là một dấu hiệu đáng nghi. Chưa thể xác minh người gửi chỉ từ tin nhắn này.</p>
              <p className="mt-2 font-medium text-[#0F172A]">Hãy kiểm tra qua kênh chính thức và không cung cấp OTP hoặc mật khẩu.</p>
            </div>

            <div className="ml-auto max-w-[82%] rounded-2xl rounded-br-sm bg-[#004AC6] px-4 py-3 text-sm leading-relaxed text-white shadow-sm">
              Nếu mình đã bấm vào đường dẫn trong tin nhắn thì nên làm gì?
            </div>

            <div className="max-w-[92%] rounded-2xl rounded-bl-sm border border-slate-200 bg-white p-4 text-sm leading-relaxed text-slate-700 shadow-sm">
              <p className="font-bold text-[#0F172A]">Việc nên làm ngay</p>
              <p className="mt-2">Đóng trang đó, không nhập thêm thông tin. Nếu đã nhập mật khẩu hoặc thông tin thanh toán, hãy đổi mật khẩu qua ứng dụng chính thức và liên hệ ngân hàng.</p>
            </div>
          </div>

          <div className="shrink-0 border-t border-slate-100 bg-white px-4 py-4">
            <div className="flex items-center justify-between rounded-full border border-slate-200 bg-[#F8FAFC] px-4 py-3 text-sm text-slate-400">
              <span>Hỏi CyberAware AI…</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#004AC6] text-white"><Send className="h-4 w-4" /></span>
            </div>
          </div>
        </div>

        <div className="ai-chat-demo-copy order-1 lg:order-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-xs font-bold uppercase tracking-wide text-[#004AC6]">
            <Bot className="h-4 w-4" /> Trợ lý AI CyberAware
          </div>
          <h2 id="ai-chat-showcase-title" className="mt-6 text-3xl font-extrabold leading-tight tracking-tight text-[#0F172A] sm:text-4xl lg:text-5xl">
            Trợ lý AI <span className="block text-[#004AC6]">chống lừa đảo 24/7</span>
          </h2>
          <p className="mt-5 max-w-[580px] text-sm leading-relaxed text-[#434655] sm:text-base">
            Hỏi về tin nhắn, đường dẫn hoặc ảnh chụp đáng ngờ. CyberAware AI giúp bạn nhận diện dấu hiệu rủi ro và gợi ý những bước tự bảo vệ phù hợp.
          </p>

          <div className="mt-9 grid gap-6 sm:grid-cols-2">
            <div>
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-[#004AC6]"><MessageSquareText className="h-6 w-6" /></span>
              <h3 className="mt-4 text-lg font-bold text-[#0F172A]">Hỏi đáp tự nhiên</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#565E74]">Đặt câu hỏi bằng tiếng Việt hoặc gửi ảnh chụp tình huống cần xem xét.</p>
            </div>
            <div>
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-[#004AC6]"><Zap className="h-6 w-6" /></span>
              <h3 className="mt-4 text-lg font-bold text-[#0F172A]">Gợi ý bước tiếp theo</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#565E74]">Nhận giải thích dấu hiệu đáng nghi và cách kiểm tra qua kênh chính thức.</p>
            </div>
          </div>

          <div className="mt-10 flex flex-wrap gap-3">
            <button type="button" onClick={openChatFullScreen} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#004AC6] px-6 py-3.5 text-sm font-bold text-white shadow-[0_10px_20px_-8px_rgba(0,74,198,0.55)] transition-colors hover:bg-[#003EA8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004AC6]">
              <Bot className="h-5 w-5" /> Chat với AI miễn phí
            </button>
            <button type="button" onClick={openChatFullScreen} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-semibold text-[#0F172A] shadow-sm transition-colors hover:border-blue-200 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004AC6]">
              <PlayCircle className="h-5 w-5 text-[#004AC6]" /> Xem demo
            </button>
          </div>
          <p className="mt-5 text-xs leading-relaxed text-[#565E74]">AI có thể mắc sai sót. Hãy kiểm chứng thông tin quan trọng và không gửi OTP, mật khẩu.</p>
        </div>
      </div>
    </section>
  );
}
