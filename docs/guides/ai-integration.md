# Tích hợp AI trong CyberAware AI

Đối chiếu mã nguồn ngày 26/11/2026. Gemini chạy ở backend; khóa `GEMINI_API_KEY` nằm trong biến môi trường máy chủ theo `.env.example`. Không đưa khóa vào biến `VITE_*`, ứng dụng React hoặc tiện ích trình duyệt.

## Phân tích URL và tin nhắn

`backend/analysis/analysis.ts` luôn tạo kết quả từ quy tắc, cảnh báo đã duyệt và dữ liệu cộng đồng trước. Gemini chỉ được gọi với URL hoặc tin nhắn khi yêu cầu cho phép AI, cấu hình `analysis_settings.ai_enabled` bật và có khóa. Model chính lấy từ `GEMINI_MODEL`; kết quả JSON phải đúng schema và bằng chứng trích từ chính đầu vào. AI có thể nâng điểm khi có bằng chứng, không được hạ kết quả mạnh hơn của quy tắc.

Mỗi lượt quét có giới hạn tổng 15 giây, mỗi lần gọi model giới hạn 10 giây. Khi model lỗi, mã thử model dự phòng nếu lỗi cho phép và vẫn còn thời gian. Nếu lỗi mạng, timeout, phản hồi sai hoặc hết hạn mức, kết quả quy tắc được giữ lại và `aiStatus` báo không khả dụng. `tests/risk-calibration.test.ts` kiểm tra các nhánh này bằng mock; biên bản gọi Gemini thật trên môi trường phát triển là `docs/reports/TASK-086-gemini-verification-20261105.md`.

## Chatbot

`backend/chat/chat.ts` điều phối hội thoại, hạn mức, tệp và lời gọi Gemini. `backend/chat/chatKnowledge.ts` chọn nguồn từ bài học, tình huống và cảnh báo đã duyệt. Truy xuất kết hợp từ khóa và embeddings; vector được lưu đệm trong SQLite, còn tìm từ khóa là phương án dự phòng khi embeddings lỗi. `backend/chat/attachments.ts` kiểm tra và đọc ảnh, PDF, DOCX, XLSX. Chi tiết API, hạn mức, quyền riêng tư và luồng xử lý nằm trong [hướng dẫn chatbot](chatbot.md).

## Kiểm tra và giới hạn nghiệm thu

- `npm test`: API, truy xuất chatbot, QR và tiện ích; ngày 26/11/2026 đạt 36/36.
- `npm run test:ai`: hiệu chỉnh rủi ro, timeout, 429 và fallback; đạt 14/14.
- `npm run test:e2e`: luồng giao diện trong SQLite tạm, tắt tích hợp bên ngoài; đạt 17/17.
- `npm run lint` và `npm run build`: đạt; build cảnh báo bundle JavaScript chính 865,50 kB.
- `npm run verify:ai:live` và `npm run evaluate:chat:retrieval` sử dụng Gemini thật và quota API. Chỉ chạy ở môi trường, khóa và hạn mức được dành cho nghiệm thu; kết quả cục bộ ở trên không chứng minh chất lượng câu trả lời trên hosting.

Kết quả quét và câu trả lời chatbot là hỗ trợ nhận diện rủi ro, không xác minh chủ sở hữu số điện thoại, tài khoản ngân hàng hoặc khẳng định URL an toàn. Trước khi báo cáo nghiệm thu bản triển khai, kiểm tra cấu hình khóa, quyền riêng tư, hạn mức và ghi lại kết quả gọi nhà cung cấp thật trên hosting.
