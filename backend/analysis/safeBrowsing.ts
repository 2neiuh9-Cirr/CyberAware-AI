import * as protobuf from 'protobufjs';

// Safe Browsing v5 returns Protocol Buffers even from its REST endpoint.
// Field numbers follow Google's SearchUrlsResponse, ThreatUrl and Duration messages.
const duration = new protobuf.Type('Duration')
  .add(new protobuf.Field('seconds', 1, 'int64'))
  .add(new protobuf.Field('nanos', 2, 'int32'));
const threatUrl = new protobuf.Type('ThreatUrl')
  .add(new protobuf.Field('url', 1, 'string'))
  .add(new protobuf.Field('threatTypes', 2, 'int32', 'repeated'));
const searchResponse = new protobuf.Type('SearchUrlsResponse')
  .add(new protobuf.Field('threats', 1, 'ThreatUrl', 'repeated'))
  .add(new protobuf.Field('cacheDuration', 2, 'Duration'));
new protobuf.Root().add(duration).add(threatUrl).add(searchResponse);

const threatNames: Record<number, string> = {
  1: 'MALWARE',
  2: 'SOCIAL_ENGINEERING',
  3: 'UNWANTED_SOFTWARE',
  4: 'POTENTIALLY_HARMFUL_APPLICATION',
};

export type SafeBrowsingResult =
  | { status: 'matched'; threatTypes: string[] }
  | { status: 'not_listed'; threatTypes: [] }
  | { status: 'unavailable'; threatTypes: [] };

const cache = new Map<string, { expiresAt: number; result: SafeBrowsingResult }>();

// Giải mã protobuf từ Safe Browsing và lấy thời hạn cache do dịch vụ cung cấp.
export function decodeSafeBrowsingResponse(bytes: Uint8Array): { threatTypes: string[]; cacheSeconds: number } {
  const response = searchResponse.toObject(searchResponse.decode(bytes), { longs: String, arrays: true }) as {
    threats?: Array<{ threatTypes?: number[] }>;
    cacheDuration?: { seconds?: string; nanos?: number };
  };
  const threats = response.threats || [];
  if (!response.cacheDuration) throw new Error('Missing Safe Browsing cache duration');
  const threatTypes = [...new Set(threats.flatMap(threat =>
    (threat.threatTypes || []).map(type => threatNames[type] || `UNKNOWN_${type}`)
  ))];
  if (threats.length && !threatTypes.length) threatTypes.push('UNKNOWN');
  const seconds = Number(response.cacheDuration.seconds || 0);
  const nanos = Number(response.cacheDuration.nanos || 0);
  if (!Number.isFinite(seconds) || seconds < 0 || !Number.isFinite(nanos) || nanos < 0) throw new Error('Invalid Safe Browsing cache duration');
  return { threatTypes, cacheSeconds: Math.min(86400, seconds + nanos / 1e9) };
}

// Tra cứu URL qua Safe Browsing; cache kết quả để tránh gọi lại trong thời hạn hợp lệ.
export async function checkSafeBrowsing(url: string): Promise<SafeBrowsingResult> {
  const cached = cache.get(url);
  if (cached && cached.expiresAt > Date.now()) return cached.result;
  if (cached) cache.delete(url);
  const key = process.env.SAFE_BROWSING_API_KEY?.trim();
  if (!key) return { status: 'unavailable', threatTypes: [] };
  const requestUrl = new URL('https://safebrowsing.googleapis.com/v5/urls:search');
  requestUrl.searchParams.append('urls', url);
  try {
    const response = await fetch(requestUrl, {
      headers: { 'X-goog-api-key': key },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok || Number(response.headers.get('content-length') || 0) > 65536) throw new Error('Safe Browsing unavailable');
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.length > 65536) throw new Error('Safe Browsing response too large');
    const decoded = decodeSafeBrowsingResponse(bytes);
    const result: SafeBrowsingResult = decoded.threatTypes.length
      ? { status: 'matched', threatTypes: decoded.threatTypes }
      : { status: 'not_listed', threatTypes: [] };
    // Google permits unsafe-site warnings only when threat information was refreshed within 30 minutes.
    const cacheSeconds = result.status === 'matched' ? Math.min(decoded.cacheSeconds, 29 * 60) : decoded.cacheSeconds;
    if (cacheSeconds > 0) cache.set(url, { expiresAt: Date.now() + cacheSeconds * 1000, result });
    if (cache.size > 1000) cache.delete(cache.keys().next().value!);
    return result;
  } catch {
    return { status: 'unavailable', threatTypes: [] };
  }
}
