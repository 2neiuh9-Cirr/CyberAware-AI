type BrowserTranslator = { translate: (text: string) => Promise<string> };
type BrowserTranslatorFactory = {
  create: (options: { sourceLanguage: string; targetLanguage: string }) => Promise<BrowserTranslator>;
};

let browserTranslator: Promise<BrowserTranslator | null> | null = null;
let browserRetryAfter = 0;
const translations = new Map<string, string>();

export const translatedText = (source: string) => translations.get(source);

export function prepareBrowserTranslator() {
  if (browserTranslator || Date.now() < browserRetryAfter) return;
  const factory = (window as Window & { Translator?: BrowserTranslatorFactory }).Translator;
  if (!factory?.create) { browserRetryAfter = Date.now() + 60_000; return; }
  // Called from the language button so browsers can use that user activation
  // to download their local VI→EN language pack when needed.
  browserTranslator = factory.create({ sourceLanguage: 'vi', targetLanguage: 'en' })
    .then(session => {
      window.dispatchEvent(new Event('cyberaware-translator-ready'));
      return session;
    })
    .catch(() => { browserTranslator = null; browserRetryAfter = Date.now() + 60_000; return null; });
}

async function localTranslator(): Promise<BrowserTranslator | null> {
  prepareBrowserTranslator();
  if (!browserTranslator) return null;
  return Promise.race([browserTranslator, new Promise<null>(resolve => setTimeout(() => resolve(null), 1500))]);
}

async function cloudTranslate(texts: string[], path: string): Promise<string[] | null> {
  if (!texts.length) return [];
  try {
    const response = await fetch('/api/site-translate', {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, texts }),
      signal: AbortSignal.timeout(32_000),
    });
    if (!response.ok) return null;
    const data = await response.json();
    if (!Array.isArray(data.translations) || data.translations.length !== texts.length ||
      data.translations.some((value: unknown) => typeof value !== 'string')) return null;
    return data.translations;
  } catch { return null; }
}

export async function translateVisibleTexts(entries: { text: string; cloudEligible: boolean }[], path: string) {
  const publicTexts = entries.filter(entry => entry.cloudEligible).map(entry => entry.text);
  const privateTexts = entries.filter(entry => !entry.cloudEligible).map(entry => entry.text);
  for (let offset = 0; offset < publicTexts.length;) {
    const chunk: string[] = [];
    let characters = 0;
    while (offset < publicTexts.length && chunk.length < 40 && characters + publicTexts[offset].length <= 8000) {
      chunk.push(publicTexts[offset]);
      characters += publicTexts[offset].length;
      offset += 1;
    }
    if (!chunk.length) { offset += 1; continue; }
    const result = await cloudTranslate(chunk, path);
    if (result) chunk.forEach((value, index) => { if (result[index]?.trim()) translations.set(value, result[index].trim()); });
  }
  const remaining = [...new Set([...publicTexts, ...privateTexts])].filter(value => !translations.has(value));
  if (remaining.length) {
    const translator = await localTranslator();
    if (translator) for (const value of remaining) {
      try {
        const result = await translator.translate(value);
        if (result.trim()) translations.set(value, result.trim());
      } catch { /* Keep the original when the browser cannot translate it. */ }
    }
  }
  return translations;
}
