# Tiện ích Chrome CyberAware AI

Manifest V3. Người dùng mở một thư ở `mail.google.com`, bấm biểu tượng tiện ích, đồng ý chính sách, rồi chọn **Quét thư này**. Tiện ích chỉ xin quyền tab đang hoạt động và máy chủ CyberAware; nó không chạy nền trên mọi trang.

Sau khi sửa các tệp trong thư mục này, chạy `powershell -ExecutionPolicy Bypass -File scripts/package-gmail-extension.ps1` từ gốc dự án để cập nhật `public/downloads/cyberaware-gmail-extension.zip`. ZIP này dùng cách cài thủ công qua `chrome://extensions` → Developer mode → Load unpacked sau khi giải nén. Khi phát hành trên Chrome Web Store, thay hướng dẫn tải ZIP bằng liên kết cửa hàng.

Việc lấy nội dung dựa vào giao diện Gmail hiện tại (`h2.hP`, `div.a3s.aiL`, `span.gD`), nên cần kiểm tra lại khi Gmail thay đổi giao diện. Nếu không tìm thấy thư, tiện ích báo lỗi thay vì đưa ra kết quả.
