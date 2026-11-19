import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { latestLocalCode, logout } from './helpers';

test('registration, email verification, login, logout, password recovery, and login with the new password', async ({ page }) => {
  const email = `playwright-${randomUUID()}@example.test`;
  const originalPassword = 'E2eUser!2026';
  const newPassword = 'E2eReset!2026';

  await page.goto('/dang-ky');
  await page.locator('#fullname').fill('E2E Test User');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(originalPassword);
  await page.locator('#confirmPassword').fill(originalPassword);
  await page.locator('#termsCheckbox').check();
  await page.locator('#submitBtn').click();
  await expect(page.locator('#emailVerificationCode')).toBeVisible();
  await page.locator('#emailVerificationCode').fill(latestLocalCode('dev-verification-codes.log'));
  await page.getByRole('button', { name: 'Xác minh và hoàn tất đăng ký' }).click();
  await expect(page.getByRole('button', { name: 'Menu người dùng: E2E Test User' })).toBeVisible();

  await page.goto('/tong-quan');
  await expect(page.getByRole('heading', { name: 'Xin chào, E2E Test User!' })).toBeVisible();
  await logout(page);

  await page.goto('/dang-nhap');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(originalPassword);
  await page.locator('form').getByRole('button', { name: /Đăng nhập/ }).click();
  await expect(page.getByRole('button', { name: 'Menu người dùng: E2E Test User' })).toBeVisible();
  await logout(page);

  await page.goto('/quen-mat-khau');
  await page.locator('#recoveryEmail').fill(email);
  await page.getByRole('button', { name: 'Gửi mã xác thực' }).click();
  await expect(page.locator('#verificationCode')).toBeVisible();
  await page.locator('#verificationCode').fill(latestLocalCode('dev-reset-codes.log'));
  await page.getByRole('button', { name: 'Xác minh mã' }).click();
  await expect(page.locator('#newPassword')).toBeVisible();
  await page.locator('#newPassword').fill(newPassword);
  await page.locator('#confirmPassword').fill(newPassword);
  await page.getByRole('button', { name: 'Cập nhật mật khẩu' }).click();
  await expect(page.getByRole('heading', { name: 'Mật khẩu đã được cập nhật thành công!' })).toBeVisible();

  await page.goto('/dang-nhap');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(newPassword);
  await page.locator('form').getByRole('button', { name: /Đăng nhập/ }).click();
  await expect(page.getByRole('button', { name: 'Menu người dùng: E2E Test User' })).toBeVisible();
  await logout(page);
});

test('a fresh password-recovery page does not announce an already-closed reset session', async ({ page }) => {
  const resetStatus = page.waitForResponse(response => response.url().endsWith('/api/auth/reset-password/status'));
  await page.goto('/quen-mat-khau');
  await resetStatus;
  await page.waitForTimeout(250);
  await expect(page.getByText('Phiên đặt lại mật khẩu đã đóng. Vui lòng xác thực mã mới.', { exact: true })).toHaveCount(0);
});
