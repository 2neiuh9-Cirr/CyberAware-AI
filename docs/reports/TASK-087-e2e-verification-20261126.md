# TASK-087 — Kiểm thử E2E tài khoản và quản trị

Ngày kiểm tra: 26/11/2026. Môi trường: Chromium headless, máy chủ localhost, SQLite tạm. `playwright.config.ts` và `scripts/e2e-server.ts` tắt SMTP, Gemini và Safe Browsing thật; dữ liệu thử nghiệm được tạo trong thư mục tạm.

| Phạm vi | Kết quả | Bằng chứng |
| --- | --- | --- |
| Đăng ký, xác minh email, đăng nhập, đăng xuất, quên và đặt lại mật khẩu | Đạt | `e2e/auth.spec.ts` |
| Hồ sơ, quyền riêng tư, bài học và quiz | Đạt | `e2e/account-learning.spec.ts` |
| Truy cập các trang quản trị và chặn khách chưa đăng nhập | Đạt | `e2e/admin.spec.ts` |
| Tạo và sửa khóa học nháp, tạo câu hỏi chờ duyệt, báo lỗi dữ liệu câu hỏi thiếu | Đạt | `e2e/admin.spec.ts` |
| Sắp xếp khóa học theo tên tiếng Việt | Đạt | `e2e/admin.spec.ts` |
| Gửi, duyệt và rút báo cáo thử nghiệm | Đạt | `e2e/admin.spec.ts` |
| Phân quyền thành viên và quản trị ở API, quản lý nội dung học tập | Đạt | `tests/api.test.ts` |

Lệnh chạy và kết quả: `npm.cmd run test:e2e` **17/17 đạt**; `npm.cmd test` **36/36 đạt**; `npm.cmd run test:ai` **14/14 đạt**; `npm.cmd run lint` và `npm.cmd run build` đạt. Build cảnh báo bundle JavaScript chính 865,50 kB vượt ngưỡng khuyến nghị 500 kB.

Kết luận: các luồng theo tiêu chí TASK-087 đã được kiểm tra và đạt trong môi trường cô lập. Kết quả này không thay thế nghiệm thu trên hosting, Gmail thật, Gemini thật, Safe Browsing thật hoặc tiện ích Chrome đã cài trong trình duyệt người dùng.
