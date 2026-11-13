# Tệp triển khai

- `packages/`: các bản ZIP tải lên VPS bằng WinSCP. Tạo các ZIP triển khai tiếp theo tại đây. Thư mục này được bỏ qua bởi Git qua quy tắc `*.zip`.
- `nginx/cyberaware.click.conf`: cấu hình Nginx HTTP ban đầu để tham khảo. Cấu hình HTTPS đang chạy trên VPS đã được Certbot bổ sung chứng chỉ và chuyển hướng; không chép đè tệp mẫu này lên cấu hình đang chạy.

Không đưa `.env`, khóa bí mật, cơ sở dữ liệu hoặc dữ liệu người dùng vào ZIP triển khai.

Triển khai công cụ Gmail: xem `GMAIL_TOOLS_DEPLOYMENT.md`.
