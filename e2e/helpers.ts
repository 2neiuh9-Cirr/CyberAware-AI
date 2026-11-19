import { expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import path from 'node:path';

export const E2E_ADMIN_EMAIL = 'e2e-admin@example.test';
export const E2E_ADMIN_PASSWORD = 'E2eAdmin!2026';
export const E2E_ADMIN_NAME = 'E2E Admin';

export async function loginAsAdmin(page: Page) {
  await page.goto('/dang-nhap');
  await page.locator('#email').fill(E2E_ADMIN_EMAIL);
  await page.locator('#password').fill(E2E_ADMIN_PASSWORD);
  await page.locator('form').getByRole('button', { name: /Đăng nhập/ }).click();
  await expect(page.getByRole('button', { name: `Menu người dùng: ${E2E_ADMIN_NAME}` })).toBeVisible();
}

export async function logout(page: Page) {
  await page.getByRole('button', { name: 'Đăng xuất', exact: true }).first().click();
  await expect(page.getByRole('button', { name: 'Đăng nhập tài khoản' })).toBeVisible();
}

export function latestLocalCode(filename: 'dev-verification-codes.log' | 'dev-reset-codes.log') {
  const dataDir = readFileSync(path.join(process.cwd(), '.e2e-temp-path'), 'utf8').trim();
  if (!dataDir || !path.basename(dataDir).startsWith('cyberaware-playwright-')) {
    throw new Error('E2E_DATA_DIR is missing or is not the disposable E2E directory.');
  }
  const lines = readFileSync(path.join(dataDir, filename), 'utf8').trim().split(/\r?\n/);
  const code = lines.at(-1)?.trim().split(/\s+/).at(-1);
  if (!code || !/^\d{8}$/.test(code)) throw new Error(`No local verification code found in ${filename}.`);
  return code;
}
