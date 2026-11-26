import { expect, type Page } from '@playwright/test';

export async function checkResponsiveJourney(page: Page, viewport: { width: number; height: number }) {
  await page.setViewportSize(viewport);
  for (const route of ['/', '/kiem-tra', '/hoc-tap', '/canh-bao', '/bao-cao', '/dang-nhap']) {
    await page.goto(route);
    await expect(page.locator('h1').first()).toBeVisible();
    const widths = await page.evaluate(() => ({ document: document.documentElement.scrollWidth, viewport: document.documentElement.clientWidth }));
    expect(widths.document, `${route} spills horizontally at ${viewport.width}px`).toBeLessThanOrEqual(widths.viewport + 2);
  }
  await page.goto('/kiem-tra');
  await page.getByRole('button', { name: 'Tin nhắn SMS / Chat' }).click();
  await expect(page.getByPlaceholder(/Ví dụ: VCB Digibank/)).toBeVisible();
  await page.goto('/bao-cao');
  await page.getByRole('button', { name: /Gửi báo cáo mới/ }).click();
  await expect(page.getByRole('dialog', { name: 'Báo cáo trường hợp lừa đảo' })).toBeVisible();
}
