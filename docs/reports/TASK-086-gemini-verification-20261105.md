# TASK-086 — Xác nhận tích hợp Gemini

Ngày kiểm tra: 05/11/2026 (Asia/Saigon). Phạm vi: backend chạy trên máy phát triển, kết nối dịch vụ Gemini thật bằng khóa trong `.env`. Chưa kiểm tra bản triển khai trên máy chủ hosting.

| Tiêu chí | Kết quả | Bằng chứng |
| --- | --- | --- |
| Khóa qua biến môi trường | Đạt | `server.ts` tải `.env`; `backend/analysis.ts` chỉ đọc `process.env.GEMINI_API_KEY` ở backend. `.env` có khóa và được `.gitignore` loại khỏi Git. Không ghi giá trị khóa vào biên bản. |
| Gọi Gemini thật | Đạt | `npx.cmd tsx scripts/verify-gemini-live.ts` thành công lúc `2026-11-05T10:00:33.075Z`. Kết quả: `aiStatus=available`, `source=rules`, `analysisTimeMs=5572`, cấu hình `gemini-3.6-flash`. `source=rules` là bình thường với tin nhắn lành tính: AI trả lời nhưng không nâng điểm rủi ro. Không có log chuyển sang mô hình dự phòng trong lượt này. |
| Timeout | Đạt ở mức kiểm thử xử lý lỗi | SDK được cấu hình timeout 30.000 ms. Bài kiểm thử mô phỏng `TimeoutError` tại lời gọi mô hình; kết quả quy tắc và điểm rủi ro được giữ, `aiStatus=unavailable`. Chưa cố ý gây timeout thật trên dịch vụ. |
| Hết hạn mức | Đạt ở mức kiểm thử xử lý lỗi | Bài kiểm thử mô phỏng lỗi Gemini HTTP 429; không thử gọi mô hình khác, giữ kết quả quy tắc và đặt `aiStatus=unavailable`. Không cố ý tiêu hết hạn mức thật. |
| Fallback | Đạt ở mức kiểm thử xử lý lỗi | Bài kiểm thử mô phỏng lỗi 503 của mô hình chính, xác nhận thử `gemini-3.1-flash-lite` và xử lý phản hồi thành công. Timeout/429 quay về bộ quy tắc. |

Kiểm tra hồi quy: `npm.cmd run lint` đạt; `npx.cmd tsx --test tests/risk-calibration.test.ts` đạt 7/7; `npm.cmd test` đạt 17/17. Các lệnh dùng mạng cần chạy ngoài sandbox của phiên làm việc này. Lần gọi Gemini đầu tiên trong sandbox trả `aiStatus=unavailable` do hạn chế mạng; lần chạy có quyền mạng đã thành công.

Kết luận: hoàn thành tiêu chí TASK-086 cho môi trường phát triển kết nối Gemini thật. Nếu nghiệm thu yêu cầu bản triển khai hosting, cần chạy lại `npm run verify:ai:live` tại hosting và lưu kết quả riêng. Lệnh kiểm tra dùng nội dung mẫu vô hại, cơ sở dữ liệu tạm và không in khóa API.
