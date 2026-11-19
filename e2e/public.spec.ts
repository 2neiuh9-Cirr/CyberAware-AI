import { expect, test } from '@playwright/test';

test.describe('Public pages and visitor flows', () => {
  test('public routes render their page instead of redirecting to the home page', async ({ page }) => {
    for (const route of ['/', '/kiem-tra', '/canh-bao', '/hoc-tap', '/bao-cao', '/gioi-thieu', '/dang-nhap', '/dang-ky', '/quen-mat-khau']) {
      await page.goto(route);
      await expect(page.locator('h1').first(), `expected a visible heading on ${route}`).toBeVisible();
      expect(new URL(page.url()).pathname).toBe(route);
    }
  });

  test('SMS and URL scan journeys return results; phone and bank tabs explain their availability', async ({ page }) => {
    await page.goto('/kiem-tra');
    await page.getByRole('button', { name: 'Tin nhắn SMS / Chat' }).click();
    await page.getByPlaceholder(/Ví dụ: VCB Digibank/).fill('VCB: tài khoản bị khóa, bấm https://example.test/verify để xác minh OTP ngay.');
    const smsResponse = page.waitForResponse(response => response.url().endsWith('/api/analyze') && response.request().method() === 'POST');
    await page.getByRole('button', { name: 'Phân tích tin nhắn này' }).click();
    expect((await smsResponse).status()).toBe(200);
    await expect(page.getByText('Kết quả kiểm tra')).toBeVisible();

    await page.getByRole('button', { name: 'Website / URL' }).click();
    await page.getByPlaceholder('https://nhan-qua-tri-an-tet2025.top').fill('https://example.test/e2e-check');
    const urlResponse = page.waitForResponse(response => response.url().endsWith('/api/analyze') && response.request().method() === 'POST');
    await page.getByRole('button', { name: 'Phân tích', exact: true }).click();
    expect((await urlResponse).status()).toBe(200);
    await expect(page.getByText('Kết quả kiểm tra')).toBeVisible();

    await page.getByRole('button', { name: 'Số điện thoại' }).click();
    let comingSoon = page.getByRole('dialog', { name: 'Tính năng đang phát triển' });
    await expect(comingSoon.getByText(/kiểm tra số điện thoại sẽ sớm ra mắt/)).toBeVisible();
    await comingSoon.getByRole('button', { name: 'Đã hiểu' }).click();

    await page.getByRole('button', { name: 'Tài khoản ngân hàng' }).click();
    comingSoon = page.getByRole('dialog', { name: 'Tính năng đang phát triển' });
    await expect(comingSoon.getByText(/kiểm tra tài khoản ngân hàng sẽ sớm ra mắt/)).toBeVisible();
  });

  test('QR image checker rejects unsupported files with a clear validation message', async ({ page }) => {
    await page.goto('/kiem-tra');
    await expect(page.getByRole('heading', { name: 'Kiểm tra mã QR trước khi mở' })).toBeVisible();
    await page.locator('#qr-image').setInputFiles({
      name: 'not-an-image.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('E2E validation only'),
    });
    await expect(page.getByRole('alert')).toContainText('Hãy chọn ảnh PNG, JPG hoặc WebP.');
  });

  test('visitor can browse reports and gets the report form without submitting it', async ({ page }) => {
    await page.goto('/bao-cao');
    await expect(page.getByRole('heading', { name: 'Báo cáo Cảnh báo từ cộng đồng' })).toBeVisible();
    await page.getByRole('button', { name: /Gửi báo cáo mới/ }).click();
    const dialog = page.getByRole('dialog', { name: 'Báo cáo trường hợp lừa đảo' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Cần đăng nhập để gửi.')).toBeVisible();
    await dialog.getByRole('button', { name: 'Hủy bỏ' }).click();
    await expect(dialog).toBeHidden();
  });

  test('chat assistant opens and closes without contacting an external AI provider', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Mở trợ lý AI' }).click();
    const chat = page.getByRole('dialog', { name: 'Trợ lý AI CyberAware' });
    await expect(chat).toBeVisible();
    await expect(chat.getByRole('status')).toContainText(/Trợ lý AI đang tắt|Đang kiểm tra kết nối/);
    await chat.getByRole('button', { name: 'Đóng chatbot' }).click();
    await expect(chat).toBeHidden();
  });
});
