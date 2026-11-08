import { formatChatAnswer } from '../../../shared/chatAnswer';

export function ChatAnswer({ content }: { content: string }) {
  const lines = formatChatAnswer(content).split(/\n+/).map(line => line.trim()).filter(Boolean);

  return (
    <div className="space-y-2 break-words text-sm leading-relaxed text-slate-800">
      {lines.map((line, index) => {
        const numbered = line.match(/^([1-9]\d?)[.)]\s+(.+)$/);
        if (numbered) return (
          <div key={index} className="flex items-start gap-2.5">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white font-semibold text-[#004AC6]">{numbered[1]}</span>
            <p className="min-w-0 flex-1">{numbered[2]}</p>
          </div>
        );
        const bullet = line.match(/^[-•]\s+(.+)$/);
        if (bullet) return <p key={index} className="pl-2 before:mr-2 before:text-[#004AC6] before:content-['•']">{bullet[1]}</p>;
        if (line.endsWith(':') && line.length <= 80) return <p key={index} className="font-semibold text-[#0F172A]">{line}</p>;
        return <p key={index}>{line}</p>;
      })}
    </div>
  );
}
