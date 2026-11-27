import { formatChatAnswer } from '../../../shared/chatAnswer';

// Hiển thị câu trả lời dạng văn bản thuần; định dạng từng dòng theo kiểu nội dung.
export function ChatAnswer({ content }: { content: string }) {

  // Chuẩn hóa ngắt dòng một lần nữa để cả câu trả lời mới và lịch sử hiển thị giống nhau.
  const lines = formatChatAnswer(content).split(/\n+/).map(line => line.trim()).filter(Boolean);

  return (
    <div className="space-y-2 break-words text-sm leading-relaxed text-slate-800">
      {lines.map((line, index) => {

        // Các bước có số thứ tự được tách số và phần chữ để căn đều khi xuống dòng.
        const numbered = line.match(/^([1-9]\d?)[.)]\s+(.+)$/);
        if (numbered) return (
          <div key={index} className="flex items-start gap-2.5">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white font-semibold text-[#004AC6]">{numbered[1]}</span>
            <p className="min-w-0 flex-1">{numbered[2]}</p>
          </div>
        );

        // Dấu gạch đầu dòng và các tiêu đề ngắn có kiểu chữ riêng; còn lại là đoạn văn.
        const bullet = line.match(/^[-•]\s+(.+)$/);
        if (bullet) return <p key={index} className="pl-2 before:mr-2 before:text-[#004AC6] before:content-['•']">{bullet[1]}</p>;
        if (/^(?:Dấu hiệu(?: trong nội dung)?|Việc nên làm ngay|Khuyến nghị|Lưu ý|Cách xử lý|Các bước|Kết luận)\s*:?$/i.test(line)) {
          return <p key={index} className="pt-1 font-bold text-[#0F172A]">{line.replace(/\s*:$/, '')}</p>;
        }
        if (line.endsWith(':') && line.length <= 80) return <p key={index} className="font-semibold text-[#0F172A]">{line}</p>;
        return <p key={index}>{line}</p>;
      })}
    </div>
  );
}
