import { expect, test } from '@playwright/test';
import { loginAsAdmin, logout } from './helpers';

test('administrator can open all administration sections in read-only mode', async ({ page }) => {
  await loginAsAdmin(page);
  const routes = [
    '/quan-tri-tong-quan',
    '/quan-tri-nguoi-dung',
    '/quan-tri-bao-cao',
    '/quan-tri-khoa-hoc',
    '/quan-tri-ngan-hang-cau-hoi',
    '/quan-tri-kho-tri-thuc',
  ];

  for (const route of routes) {
    await page.goto(route);
    await expect(page).toHaveURL(new RegExp(`${route}$`));
    await expect(page.locator('h1').first(), `expected administration page ${route}`).toBeVisible();
    await expect(page.getByRole('alert')).toHaveCount(0);
  }
});

test('administrator can submit, review, approve, and retract a test report', async ({ page }) => {
  const target = `https://example.test/playwright-${Date.now()}`;
  await loginAsAdmin(page);
  await page.goto('/bao-cao');
  await page.getByRole('button', { name: /Gửi báo cáo mới/ }).click();

  const form = page.getByRole('dialog', { name: 'Báo cáo trường hợp lừa đảo' });
  await form.getByPlaceholder('https://vcb-xac-thuc-online2026.com').fill(target);
  await form.locator('textarea').fill('Báo cáo E2E trong CSDL tạm dùng để kiểm tra luồng kiểm duyệt.');
  await form.getByRole('button', { name: 'Gửi báo cáo ngay' }).click();
  await expect(form.getByRole('heading', { name: 'Gửi báo cáo thành công!' })).toBeVisible();
  await expect(form).toBeHidden({ timeout: 5_000 });

  await page.getByRole('button', { name: 'Chờ kiểm duyệt' }).click();
  const report = page.locator('article').filter({ hasText: target });
  await expect(report).toBeVisible();
  await report.getByRole('button', { name: 'Xem chi tiết' }).click();
  const detail = page.getByRole('dialog', { name: 'Chi tiết báo cáo' });
  await detail.getByLabel('Lý do kiểm duyệt').fill('Đã xác nhận nội dung kiểm thử E2E.');
  await detail.getByRole('button', { name: 'Duyệt', exact: true }).click();
  await expect(detail.getByText('Quản trị viên đã duyệt')).toBeVisible();
  await detail.getByRole('button', { name: 'Đóng chi tiết' }).click();

  await page.getByRole('button', { name: 'Tất cả công khai' }).click();
  const approvedReport = page.locator('article').filter({ hasText: target });
  await expect(approvedReport).toBeVisible();
  await approvedReport.getByRole('button', { name: /Bình chọn/ }).click();
  await expect(approvedReport.getByRole('button', { name: /Bỏ bình chọn/ })).toBeVisible();
  await approvedReport.getByRole('button', { name: /Bỏ bình chọn/ }).click();
  await expect(approvedReport.getByRole('button', { name: /Bình chọn/ })).toBeVisible();
  await logout(page);
});
