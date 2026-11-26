# Đánh giá phân loại SMS bằng bộ quy tắc

Ngày chạy: 26/11/2026. Dữ liệu: `tests/fixtures/sms-risk-evaluation.json`, gồm 30 SMS tổng hợp do nhóm gán nhãn và ghi dấu hiệu mong đợi: 15 tình huống đáng ngờ, 15 tin thông thường. Không dùng dữ liệu cá nhân thật. Chạy lại bằng `npm run evaluate:sms`.

Ngưỡng quyết định của phép đo là điểm rủi ro từ 30 trở lên. Gemini tắt để đo riêng bộ quy tắc; đây không phải phép đo toàn hệ thống khi AI và nguồn cảnh báo bên ngoài hoạt động.

| Lần chạy | Đúng cảnh báo | Bỏ sót | Cảnh báo nhầm | Đúng bình thường | Precision | Recall | Accuracy |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Trước chỉnh quy tắc | 12 | 3 | 0 | 15 | 100% | 80% | 90% |
| Sau chỉnh quy tắc | 15 | 0 | 0 | 15 | 100% | 100% | 100% |

Ba trường hợp bị bỏ sót ban đầu là yêu cầu chuyển tiền thuế sau khi báo trúng giải (`S02`), yêu cầu đọc mã khôi phục ví (`S09`) và người tự nhận quen biết nhờ chuyển tiền gấp vào tài khoản mới nhưng ngăn gọi xác minh (`S13`). Đã bổ sung mẫu nhận diện có điều kiện cho các trường hợp này tại `backend/analysis/analysis.ts`. Kiểm tra hồi quy: `npm run lint`, `npm test` (37/37), `npm run test:ai` (14/14) và `npm run evaluate:sms` đều đạt.

**Giới hạn:** Đây là bộ mẫu nhỏ, được soạn thủ công và dùng lại để điều chỉnh quy tắc; kết quả 100% trên chính bộ này không ước lượng độ chính xác ngoài thực tế. Bộ mẫu chưa đại diện cho mọi kiểu viết, ngôn ngữ, đối tượng gửi, mức độ nhiễu, hình ảnh hay trang web. Một số tin bình thường vẫn nhận cờ từ khóa không phù hợp dù điểm cuối dưới ngưỡng, cần tiếp tục rà chất lượng giải thích. Cần một bộ dữ liệu độc lập có gán nhãn, đánh giá mù và kiểm thử trên bản hosting trước khi tuyên bố hiệu quả thực tế.
