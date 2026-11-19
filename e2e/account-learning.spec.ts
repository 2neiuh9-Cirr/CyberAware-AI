import { expect, test } from '@playwright/test';
import { loginAsAdmin, logout } from './helpers';

test('account dashboard and settings are accessible to the signed-in account', async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto('/tong-quan');
  await expect(page.getByRole('heading', { name: 'Xin chào, E2E Admin!' })).toBeVisible();
  await expect(page.getByText('Dữ liệu tài khoản của bạn')).toBeVisible();

  await page.goto('/cai-dat');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.locator('#section-profile')).toBeVisible();
  await expect(page.locator('#section-privacy')).toBeVisible();
  await expect(page.locator('#section-sessions')).toBeVisible();
  await logout(page);
});

test('profile changes save and privacy choices persist across reloads', async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto('/cai-dat');

  const name = page.locator('#fullName');
  const phone = page.locator('#phoneNumber');
  const originalName = await name.inputValue();
  const originalPhone = await phone.inputValue();
  const changedName = `${originalName} E2E`;

  try {
    await name.fill(changedName);
    await phone.fill('0900000000');
    await page.getByRole('button', { name: 'Lưu thay đổi' }).click();
    await expect(name).toHaveValue(changedName);
    await expect(page.getByRole('button', { name: `Menu người dùng: ${changedName}` })).toBeVisible();
    await page.reload();
    await expect(name).toHaveValue(changedName);
    await expect(phone).toHaveValue('0900000000');
  } finally {
    await name.fill(originalName);
    await phone.fill(originalPhone);
    await page.getByRole('button', { name: 'Lưu thay đổi' }).click();
    await expect(page.getByRole('button', { name: `Menu người dùng: ${originalName}` })).toBeVisible();
  }

  const privacy = page.locator('#section-privacy');
  const firstChoice = privacy.locator('input[type="checkbox"]').first();
  const originalChoice = await firstChoice.isChecked();
  const toggle = async () => {
    const response = page.waitForResponse(res => res.url().endsWith('/api/me/privacy-settings') && res.request().method() === 'PATCH');
    await privacy.locator('label').first().click();
    expect((await response).status()).toBe(200);
  };

  await toggle();
  await expect(firstChoice).toHaveJSProperty('checked', !originalChoice);
  await page.reload();
  await expect(firstChoice).toHaveJSProperty('checked', !originalChoice);
  await toggle();
  await expect(firstChoice).toHaveJSProperty('checked', originalChoice);
  await logout(page);
});

test('course content opens and a lesson can be marked read', async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto('/hoc-tap');
  await expect(page.getByRole('heading', { name: 'Học viện Tự vệ số & Phòng chống lừa đảo' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2 }).first()).toBeVisible();
  const markRead = page.getByRole('button', { name: 'Tôi đã đọc bài này' });
  await expect(markRead).toBeVisible();
  await markRead.click();
  await expect(page.getByRole('button', { name: 'Đã đọc bài này' })).toBeVisible();
  await logout(page);
});

test('course quiz accepts answers and submits a scored attempt', async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto('/hoc-tap');
  const quizModule = page.getByRole('button').filter({ hasText: 'Bài kiểm tra' }).first();
  await expect(quizModule).toBeVisible();
  await quizModule.click();

  const questionNav = page.locator('[aria-label="Chọn câu hỏi"]');
  const questions = questionNav.getByRole('button');
  const submit = page.getByRole('button', { name: /^Nộp bài kiểm tra \(/ });
  await expect(submit).toBeVisible();
  const questionCount = await questions.count();
  expect(questionCount).toBeGreaterThan(0);
  for (let index = 0; index < questionCount; index++) {
    await questions.nth(index).click();
    await page.locator('main button[aria-pressed="false"]').first().click();
    await expect(questions.nth(index)).toHaveAttribute('aria-label', new RegExp(`Câu ${index + 1}, đã chọn đáp án`));
  }

  await expect(submit).toHaveText(`Nộp bài kiểm tra (${questionCount}/${questionCount})`);
  await expect(submit).toBeEnabled();
  await submit.click();
  await expect(page.getByRole('status').filter({ hasText: 'Kết quả:' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Làm lại bài kiểm tra' })).toBeVisible();
  await logout(page);
});
