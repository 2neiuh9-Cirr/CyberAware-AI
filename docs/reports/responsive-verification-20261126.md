# Kiểm thử responsive và trình duyệt

Ngày chạy: 26/11/2026, trên máy phát triển với cơ sở dữ liệu E2E cô lập. Bài kiểm thử ở `e2e/responsive-journey.ts` mở sáu trang công khai (`/`, `/kiem-tra`, `/hoc-tap`, `/canh-bao`, `/bao-cao`, `/dang-nhap`), xác nhận tiêu đề hiển thị và trang không tràn ngang. Bài kiểm thử cũng chọn tab SMS và mở biểu mẫu báo cáo.

| Trình duyệt | 390 × 844 | 1440 × 900 |
| --- | --- | --- |
| Google Chrome | Đạt | Đạt |
| Microsoft Edge | Đạt | Đạt |
| Chromium của Playwright | Đạt | Đạt |

Lần chạy đầu phát hiện `/bao-cao` tràn ngang 171 px ở 390 px và 91 px ở 1440 px. Nguyên nhân là lớp nền trang trí `::after` vượt khỏi khung trang. Đã giới hạn phần tràn trong `src/modules/report/ReportPage.css`, sau đó kiểm thử lại đạt. `npm run lint`, `npm run build` và bộ E2E 19/19 (trước khi thêm hai cấu hình trình duyệt) đạt; các bài responsive Chrome/Edge/Chromium đều đạt sau khi thêm cấu hình.

Giới hạn: bài kiểm thử mới chỉ bao phủ sáu trang công khai và hai thao tác mẫu; chưa kiểm tra toàn bộ quiz, thống kê, tài khoản và quản trị ở kích thước mobile, thiết bị cảm ứng thật hoặc bản CSS mới trên hosting. Vì vậy kết quả này đủ cho hạng mục kiểm tra tràn/nút công khai trên Chrome và Edge, nhưng chưa đóng toàn bộ hạng mục E2E giao diện.
