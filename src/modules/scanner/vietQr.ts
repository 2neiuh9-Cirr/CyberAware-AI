export type VietQr = {
  bankBin: string;
  account: string;
  nameInQr: string | null;
  service: string;
  amount: string | null;
  currency: string;
  crcValid: boolean;
};

function fields(value: string): Map<string, string> | null {
  const result = new Map<string, string>();
  const bytes = new TextEncoder().encode(value);
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let position = 0;
  while (position < bytes.length) {
    if (position + 4 > bytes.length) return null;
    const tag = String.fromCharCode(bytes[position], bytes[position + 1]);
    const lengthText = String.fromCharCode(bytes[position + 2], bytes[position + 3]);
    if (!/^\d{2}$/.test(tag) || !/^\d{2}$/.test(lengthText) || result.has(tag)) return null;
    const length = Number(lengthText);
    position += 4;
    if (position + length > bytes.length) return null;
    try { result.set(tag, decoder.decode(bytes.subarray(position, position + length))); }
    catch { return null; }
    position += length;
  }
  return result;
}

function crc16(value: string): string {
  let crc = 0xffff;
  for (const byte of new TextEncoder().encode(value)) {
    crc ^= byte << 8;
    for (let bit = 0; bit < 8; bit++) crc = ((crc & 0x8000) ? (crc << 1) ^ 0x1021 : crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export function parseVietQr(value: string): VietQr | null {
  const payload = value.trim();
  if (!payload.startsWith('000201')) return null;
  const root = fields(payload);
  if (!root || !root.has('38')) return null;
  const merchant = fields(root.get('38')!);
  if (!merchant || merchant.get('00') !== 'A000000727') return null;
  const beneficiary = fields(merchant.get('01') ?? '');
  const bankBin = beneficiary?.get('00');
  const account = beneficiary?.get('01');
  if (!bankBin || !account || !/^\d{6}$/.test(bankBin)) return null;
  const crc = root.get('63');
  const crcPosition = payload.length - 8;
  const crcValid = !!crc && /^[\dA-Fa-f]{4}$/.test(crc) && payload.slice(crcPosition, crcPosition + 4) === '6304' && crc16(payload.slice(0, payload.length - 4)) === crc.toUpperCase();
  return { bankBin, account, nameInQr: root.get('59')?.trim() || null, service: merchant.get('02') ?? '', amount: root.get('54') ?? null, currency: root.get('53') === '704' ? 'VND' : (root.get('53') ?? 'không rõ'), crcValid };
}
