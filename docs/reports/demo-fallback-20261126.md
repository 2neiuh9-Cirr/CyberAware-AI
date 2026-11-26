# Kịch bản demo CyberAware AI khi Gemini hoặc mạng lỗi

Ngày chuẩn bị: 26/11/2026. Mục tiêu: trình bày luồng MVP bằng dữ liệu mẫu, không dựa vào quota Gemini hoặc dịch vụ Safe Browsing. Không dùng dữ liệu cá nhân thật trong buổi demo.

## Chuẩn bị

1. Khởi động ứng dụng theo README. Kiểm tra `/api/health` và mở trang chủ.
2. Dùng tài khoản thử nghiệm, kiểm tra trước luồng đăng nhập và bài học. Không sử dụng tài khoản production cho thao tác tạo/sửa dữ liệu demo.
3. Chuẩn bị hai đầu vào: URL `https://vietcombank.com.vn.attacker.invalid/login` để minh họa tên miền mạo danh; tin nhắn `Vui lòng gửi mã OTP để nhận tiền hoàn thuế ngay.` để minh họa yêu cầu bí mật và lợi ích giả.
4. Chuẩn bị một URL tham chiếu lành tính như `https://example.org/login`. Giải thích điểm thấp chỉ có nghĩa là hệ thống chưa phát hiện nhiều dấu hiệu, không xác minh URL an toàn.

## Luồng trình bày 5 phút

1. Mở trang quét, chọn URL, nhập URL mạo danh và chỉ ra tên miền thật nằm ở cuối chuỗi `attacker.invalid`. Đọc điểm rủi ro, dấu hiệu và khuyến nghị tự xác minh.
2. Chọn tin nhắn, nhập mẫu OTP, giải thích vì sao yêu cầu cung cấp mã là dấu hiệu nguy hiểm. So sánh với một lời khuyên an toàn không yêu cầu hành động nguy hiểm.
3. Mở thư viện tình huống, bài học và quiz; trình bày nguồn nội dung và cách chấm kết quả.
4. Nếu Gemini sẵn sàng, giới thiệu phần AI hỗ trợ. Nếu AI lỗi hoặc hết hạn mức, chỉ ra kết quả quy tắc vẫn xuất hiện và trạng thái AI báo không khả dụng. Không giới thiệu kết quả quy tắc như kết luận của Gemini.
5. Kết thúc bằng giới hạn: hệ thống không xác minh chủ số điện thoại/tài khoản ngân hàng, không mở URL để xác nhận an toàn và cần người dùng tự đối chiếu kênh chính thức.

## Bằng chứng dự phòng đã kiểm tra

- `npm run test:ai` ngày 26/11 đạt 14/14, gồm timeout, lỗi hạn mức 429 và giữ kết quả quy tắc.
- `npm test` đạt 36/36; có kiểm tra URL, Safe Browsing mock, phân quyền và API.
- `npm run test:e2e` đạt 17/17 trong môi trường cô lập, gồm luồng quét URL/SMS, đăng nhập, bài học, quiz và quản trị.

Nếu bản hosting không truy cập được, dùng bản chạy cục bộ đã chuẩn bị trước và nêu rõ đó là môi trường demo. Nếu không thể chạy ứng dụng, dùng ảnh chụp hoặc video do nhóm tự quay sau khi kiểm tra lại nội dung; hiện chưa có video dự phòng được xác nhận trong repository.
