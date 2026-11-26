# Đánh giá truy xuất nguồn cho chatbot

Ngày chạy: 26/11/2026. Lệnh `npm run evaluate:chat:retrieval` dùng Gemini Embedding thật với khóa đã cấu hình và 8 ca trong `tests/fixtures/chat-retrieval-evaluation.json`. Script yêu cầu có embedding thực, không chấp nhận fallback từ khóa trong phép đo này.

Kết quả: recall@3 = **0,8125**, MRR = **0,8125**; vượt ngưỡng script là 0,75 và 0,6. Bảy trong tám ca lấy được ít nhất một nguồn mong đợi. Ca `credential-exposure-response` không lấy được hai nguồn hướng dẫn xử lý sau khi lộ thông tin đăng nhập. Ca `recovery-fee-scam` chỉ lấy được một trong hai nguồn mong đợi.

Đây là phép đo truy xuất trên 8 truy vấn biên soạn sẵn, không đo độ đúng của câu trả lời cuối, tính ổn định nhiều lần hay trường hợp tài liệu người dùng tải lên. Ca OTP trên hosting và bản sửa dấu hiệu thiếu căn cứ được ghi riêng tại `docs/reports/live-hosting-20261126.md`. Cần mở rộng tập truy vấn và xử lý ca truy xuất thiếu nguồn trước khi nghiệm thu chất lượng chatbot toàn diện.
