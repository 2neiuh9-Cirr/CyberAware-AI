export interface ChatKnowledgeSource {
  id?: string;
  title: string;
  kind: string;
  url: string;
  sourceDate?: string;
}

export interface PublicChatSource {
  title: string;
  kind: string;
  url: string;
  sourceDate?: string;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function publicChatSources(sources: ChatKnowledgeSource[]): PublicChatSource[] {
  return sources.map(({ title, kind, url, sourceDate }) => ({
    title,
    kind,
    url,
    ...(sourceDate ? { sourceDate } : {}),
  }));
}

export function formatChatAnswer(value: string): string {
  let answer = value.replace(/\r\n?/g, '\n').trim();
  if (!answer) return '';

  // Put inline list markers and common section labels on their own lines.
  answer = answer
    .replace(/([^\n])\s+([•●▪])\s+(?=\S)/g, '$1\n$2 ')
    .replace(/([^\n])\s+-\s+(?=[\p{Lu}\p{N}])/gu, '$1\n- ')
    .replace(/\s+(?=(?:Dấu hiệu(?: trong nội dung)?|Việc nên làm ngay|Khuyến nghị|Lưu ý|Cách xử lý|Các bước|Kết luận)\s*:)/giu, '\n\n');

  const markers = [...answer.matchAll(/(^|\s)([1-9]\d?)[.)]\s+(?=\p{L})/gu)];
  if (markers.length >= 2 && markers.every((match, index) => Number(match[2]) === index + 1)) {
    for (let index = markers.length - 1; index >= 0; index--) {
      const marker = markers[index];
      const position = marker.index + marker[1].length;
      if (position === 0 || marker[1].includes('\n')) continue;
      const before = answer.slice(0, position).trimEnd();
      const after = answer.slice(position);
      answer = before + (index === 0 ? '\n\n' : '\n') + after;
    }
  }

  // Long, sentence-heavy paragraphs are easier to scan when broken into pairs.
  return answer.split(/\n\s*\n+/).map(block => {
    const lines = block.split('\n');
    if (lines.length > 1 || /^\s*(?:[-•●▪]|\d{1,2}[.)])\s/u.test(block)) return block.trim();
    const sentences = block.split(/(?<=[.!?])\s+(?=[\p{Lu}“"'])/gu).map(sentence => sentence.trim()).filter(Boolean);
    if (sentences.length < 3 && block.length <= 360) return block.trim();
    const groups: string[] = [];
    let group = '';
    for (const sentence of sentences) {
      if (group && (group.length + sentence.length > 240 || /^(?:Ngoài ra|Bên cạnh đó|Đồng thời|Tuy nhiên|Tiếp theo|Cuối cùng|Lưu ý|Hãy|Bạn nên|Nếu bạn)\b/i.test(sentence))) {
        groups.push(group);
        group = '';
      }
      group = group ? `${group} ${sentence}` : sentence;
    }
    if (group) groups.push(group);
    return groups.join('\n\n');
  }).join('\n\n');
}

export function sanitizeChatAnswer(value: string, sources: ChatKnowledgeSource[]): string {
  let answer = value;
  for (const source of sources) {
    if (!source.id) continue;
    answer = answer.replace(new RegExp(`\\[${escapeRegExp(source.id)}\\]`, 'gi'), source.title);
    answer = answer.replace(new RegExp(escapeRegExp(source.id), 'gi'), source.title);
  }
  answer = answer.replace(/\[(?:course|scenario|intel)-[a-z0-9_-]+\]/gi, '');
  return formatChatAnswer(answer.replace(/\s+([.,;:!?])/g, '$1'));
}

// Retrieved examples can describe details that were never reported by the user.
// Keep those examples as advice, but do not present them as observed signs.
export function groundObservedSigns(answer: string, userContext: string): string {
  if (/\b(?:url|link|https?:\/\/|www\.)\b|liên kết|đường dẫn|trang web|website/iu.test(userContext)) return answer;
  const lines = answer.split('\n');
  let inSigns = false;
  return lines.filter(line => {
    if (/^\s*Dấu hiệu(?: trong nội dung)?\s*:?[\s]*$/iu.test(line)) {
      inSigns = true;
      return true;
    }
    if (inSigns && /^\s*(?:Việc nên làm ngay|Khuyến nghị|Lưu ý|Cách xử lý|Các bước|Kết luận)\s*:?\s*$/iu.test(line)) inSigns = false;
    return !(inSigns && /^\s*(?:[-•●▪]|\d{1,2}[.)])\s+/u.test(line) && /liên kết|đường dẫn|\blink\b|\burl\b|trang web|website/iu.test(line));
  }).join('\n').replace(/\n{3,}/g, '\n\n');
}
