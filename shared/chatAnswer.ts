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
  const answer = value.trim();
  const markers = [...answer.matchAll(/(^|\s)([1-9]\d?)[.)]\s+(?=\p{L})/gu)];
  if (markers.length < 2 || markers.some((match, index) => Number(match[2]) !== index + 1)) return answer;

  let formatted = answer;
  for (let index = markers.length - 1; index >= 0; index--) {
    const marker = markers[index];
    const position = marker.index + marker[1].length;
    if (position === 0 || marker[1].includes('\n')) continue;
    const before = formatted.slice(0, position).trimEnd();
    const after = formatted.slice(position);
    formatted = before + (index === 0 ? '\n\n' : '\n') + after;
  }
  return formatted;
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
