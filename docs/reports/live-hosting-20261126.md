# Kiểm tra bản hosting CyberAware AI

Ngày kiểm tra: 26/11/2026, URL: https://cyberaware.click/. Kiểm tra trình duyệt với khách chưa đăng nhập.

| Mục | Kết quả quan sát |
| --- | --- |
| Trang chủ | Mở thành công; có điều hướng, công cụ quét nhanh và dữ liệu thống kê. |
| `GET /api/health` | Trả `status: ok`, `database: ok` lúc 06:40:04 UTC. |
| Các trang `/kiem-tra`, `/hoc-tap`, `/canh-bao`, `/bao-cao`, `/dang-nhap`, `/quen-mat-khau` | Mở đúng trang; không thấy cảnh báo lỗi trên giao diện. |
| `GET /api/chat/capabilities` | Chatbot bật, cho phép ảnh/tài liệu; khách còn 10 lượt trong ngày tại thời điểm kiểm tra. |
| Chatbot thực | Câu hỏi mẫu về tin nhắn yêu cầu OTP để nhận quà đã nhận câu trả lời và hai nguồn tham khảo; hạn mức khách giảm còn 9 lượt. |

## Kiểm tra và sửa câu trả lời thiếu căn cứ

Câu hỏi mẫu chỉ nói đến yêu cầu cung cấp mã OTP để nhận quà, **không chứa liên kết**. Câu trả lời trên hosting lại ghi dưới “Dấu hiệu”: “Tin nhắn có đính kèm đường liên kết lạ dẫn đến trang web giả mạo.” Đây là chi tiết chưa được cung cấp, dù lời khuyên không bấm liên kết lạ là hợp lý. Cần sửa cách diễn đạt để phân biệt dấu hiệu thực có trong đầu vào với tình huống giả định, sau đó triển khai và thử lại trên hosting.

Lần triển khai đầu tiên chỉ bổ sung chỉ dẫn phân biệt dấu hiệu có trong đầu vào với khả năng giả định tại `backend/chat/chat.ts`. Sau khi khởi động lại, health vẫn đạt nhưng Gemini thật tiếp tục ghi “Tin nhắn chứa đường liên kết lạ” dưới mục Dấu hiệu. Vì thế chỉ dẫn riêng không đủ để xử lý lỗi.

Đã bổ sung `groundObservedSigns` tại `shared/chatAnswer.ts` và gọi sau khi định dạng câu trả lời. Với đầu vào văn bản không nhắc tới URL hoặc liên kết, hàm bỏ các dòng liệt kê liên kết ở mục Dấu hiệu, đồng thời giữ lời khuyên phòng ngừa. Với ảnh có thể chứa chi tiết chưa trích xuất, hàm không áp dụng bộ lọc này. Bài kiểm thử hồi quy, `npm run lint` và `npm test` (37/37) đạt trên máy phát triển. Bản sandbox không cho API test kết nối tới `127.0.0.1`; bộ test đạt khi chạy ngoài sandbox.

Ngày 26/11 đã sao lưu `backend/chat/chat.ts` và `shared/chatAnswer.ts` trên VPS, tải lên hai tệp đã kiểm thử rồi khởi động lại `cyberaware.service`. SHA-256 trên VPS khớp tệp cục bộ: `chat.ts` = `CAC1162443A5F4AAD3ABC0E7336D6BA1804196618428D8013F65459F5A361C22`; `chatAnswer.ts` = `E3984039DE2BC8911672FF98E1639642B9EFC16F67FD76883A0A8830FAF18294`. `systemctl is-active cyberaware` trả `active`; `/api/health` tiếp tục trả `status: ok`, `database: ok` lúc 07:04:31 UTC. Lệnh lint trên VPS không chạy vì bản production không cài `tsc`; lint cục bộ đã đạt.

Thử lại cùng câu hỏi OTP trên hosting lúc 14:04 giờ Việt Nam: chatbot trả lời và mục Dấu hiệu chỉ nêu yêu cầu OTP để nhận quà, không ghi rằng tin nhắn có liên kết. Hạn mức khách giảm một lượt. Đây là xác nhận cho ca hồi quy cụ thể, chưa chứng minh mọi câu trả lời Gemini đều chính xác.

Kiểm tra này chưa xác nhận luồng đăng nhập bằng tài khoản thật, Gmail, Chrome extension, Workspace add-on, Safe Browsing provider, chất lượng truy xuất toàn bộ dữ liệu hoặc triển khai toàn bộ phiên bản mã nguồn mới nhất. Không sử dụng kết quả này để tuyên bố các mục đó hoàn thành.
