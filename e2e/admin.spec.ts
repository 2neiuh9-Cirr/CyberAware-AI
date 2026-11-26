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

test('visitors cannot open administration pages', async ({ page }) => {
  for (const route of ['/quan-tri-khoa-hoc', '/quan-tri-ngan-hang-cau-hoi', '/quan-tri-nguoi-dung']) {
    await page.goto(route);
    await expect(page).toHaveURL(/\/dang-nhap$/);
  }
});

test('administrator creates and edits a draft course in the isolated database', async ({ page }) => {
  const code = `E2E-${Date.now()}`;
  const title = `Khóa học kiểm thử ${code}`;
  await loginAsAdmin(page);
  await page.goto('/quan-tri-khoa-hoc');
  await page.getByRole('button', { name: 'Tạo khóa học mới' }).click();
  const form = page.locator('form').filter({ has: page.getByRole('button', { name: 'Lưu khóa học' }) });
  await form.locator('input[type="text"]').first().fill(code);
  await form.getByPlaceholder('Ví dụ: Phòng ngừa lừa đảo Deepfake trong 5 phút').fill(title);
  await form.getByPlaceholder('Mô tả mục tiêu và nội dung học viên sẽ đạt được...').fill('Nội dung E2E trong cơ sở dữ liệu tạm.');
  const created = page.waitForResponse(res => res.url().endsWith('/api/admin/courses') && res.request().method() === 'POST');
  await form.getByRole('button', { name: 'Lưu khóa học' }).click();
  expect((await created).status()).toBe(201);
  const row = page.getByRole('row').filter({ hasText: code });
  await expect(row).toContainText(title);
  await expect(row).toContainText('Bản nháp');

  await row.getByTitle('Chỉnh sửa khóa học').click();
  const editedTitle = `${title} cập nhật`;
  await form.getByPlaceholder('Ví dụ: Phòng ngừa lừa đảo Deepfake trong 5 phút').fill(editedTitle);
  const updated = page.waitForResponse(res => res.url().includes('/api/admin/courses/') && res.request().method() === 'PATCH');
  await form.getByRole('button', { name: 'Lưu khóa học' }).click();
  expect((await updated).status()).toBe(200);
  await expect(row).toContainText(editedTitle);
});

test('administrator can sort courses by Vietnamese title', async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto('/quan-tri-khoa-hoc');
  const titles = page.locator('table tbody tr td:nth-child(2) p:first-child');
  await expect(titles.first()).toBeVisible();
  await page.locator('#course-sort-order').selectOption('title-asc');
  const ascending = await titles.allTextContents();
  expect(ascending.length).toBeGreaterThan(1);
  expect(ascending).toEqual([...ascending].sort((a, b) => a.localeCompare(b, 'vi', { sensitivity: 'base' })));
  await page.locator('#course-sort-order').selectOption('title-desc');
  const descending = await titles.allTextContents();
  expect(descending).toEqual([...ascending].reverse());
});

test('administrator creates a review question and sees validation errors', async ({ page }) => {
  const scenario = `Tình huống E2E ${Date.now()}: tin nhắn yêu cầu mở liên kết giả.`;
  await loginAsAdmin(page);
  await page.goto('/quan-tri-ngan-hang-cau-hoi');
  await page.getByRole('button', { name: 'Thêm câu hỏi mới' }).click();
  const editor = page.locator('#editorPanel');
  await editor.getByRole('button', { name: 'Lưu câu hỏi vào ngân hàng' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Câu hỏi phải dài từ 10 đến 2000 ký tự.' }).first()).toBeVisible();

  await editor.getByPlaceholder('Nhập kịch bản chi tiết mà đối tượng lừa đảo sử dụng để tiếp cận nạn nhân...').fill(scenario);
  const options = editor.locator('input[type="text"]');
  for (const [index, value] of ['Không mở liên kết', 'Mở ngay', 'Gửi mã OTP', 'Chuyển tiền'].entries()) {
    await options.nth(index).fill(value);
  }
  const optionReasons = editor.getByPlaceholder('Vì sao đáp án này đúng hoặc sai?');
  for (let index = 0; index < 4; index++) await optionReasons.nth(index).fill('Cần xác minh qua kênh chính thức.');
  await editor.locator('textarea').last().fill('Không mở liên kết lạ; xác minh qua kênh chính thức.');
  const created = page.waitForResponse(res => res.url().endsWith('/api/admin/questions') && res.request().method() === 'POST');
  await editor.getByRole('button', { name: 'Lưu câu hỏi vào ngân hàng' }).click();
  expect((await created).status()).toBe(201);
  await expect(page.getByText(scenario).first()).toBeVisible();
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
