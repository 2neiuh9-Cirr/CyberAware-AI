import assert from 'node:assert/strict';
import test from 'node:test';
import { parseVietQr } from '../src/modules/scanner/vietQr';
import { bankNameForBin } from '../src/modules/scanner/bankNames';

const example = '00020101021138560010A0000007270126000697041501121234567890120208QRIBFTTA53037045802VN63047858';

function withAmountAndName(value: string): string {
  const prefix = value.slice(0, -8).replace('5802VN', '54061200005802VN5904ÁNH');
  let crc = 0xffff;
  for (const byte of new TextEncoder().encode(`${prefix}6304`)) {
    crc ^= byte << 8;
    for (let bit = 0; bit < 8; bit++) crc = ((crc & 0x8000) ? (crc << 1) ^ 0x1021 : crc << 1) & 0xffff;
  }
  return `${prefix}6304${crc.toString(16).toUpperCase().padStart(4, '0')}`;
}

test('reads a valid payment QR without inventing an amount or verified recipient', () => {
  const result = parseVietQr(example);
  assert.deepEqual(result, {
    bankBin: '970415',
    account: '123456789012',
    nameInQr: null,
    service: 'QRIBFTTA',
    amount: null,
    currency: 'VND',
    crcValid: true,
  });
});

test('shows a bank name from BIN without claiming an account owner', () => {
  assert.equal(bankNameForBin('970415'), 'VietinBank');
  assert.equal(bankNameForBin('000000'), null);
});

test('reads optional amount and UTF-8 name when they are actually embedded', () => {
  const result = parseVietQr(withAmountAndName(example));
  assert.equal(result?.amount, '120000');
  assert.equal(result?.nameInQr, 'ÁNH');
  assert.equal(result?.crcValid, true);
});

test('accepts surrounding whitespace without changing the QR content', () => {
  assert.equal(parseVietQr(`\n${example}\n`)?.crcValid, true);
});

test('reports a modified payment QR as failing integrity check', () => {
  const result = parseVietQr(example.replace('123456789012', '123456789013'));
  assert.equal(result?.crcValid, false);
});

test('does not identify a URL as a payment QR', () => {
  assert.equal(parseVietQr('https://example.com'), null);
});
