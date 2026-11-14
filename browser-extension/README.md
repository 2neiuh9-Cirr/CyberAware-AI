# Tiện ích Chrome CyberAware AI

Manifest V3. Người dùng mở một thư ở `mail.google.com`, bấm biểu tượng tiện ích, đồng ý chính sách, rồi chọn **Quét thư này**. `manifest.json` khai báo `activeTab`, `scripting`, `storage` và quyền truy cập `https://cyberaware.click/*`. Tiện ích dùng bộ nhớ cục bộ để ghi lựa chọn đồng ý, chỉ lấy nội dung thư khi người dùng bấm quét và không chạy nền trên mọi trang.

Bản 1.1 xin đồng ý lại trước khi gửi thư tới máy chủ. Tiêu đề `x-cyberaware-ai-consent: v2` cho phép đánh giá bổ sung bằng Gemini khi máy chủ có khóa và quản trị viên đã bật AI. Nếu AI chưa bật hoặc tạm không khả dụng, kết quả dựa trên quy tắc. ZIP trong `public/downloads` là bản 1.1 sau khi chạy `scripts/deployment/package-gmail-extension.ps1`.

Sau khi sửa các tệp trong thư mục này, chạy `powershell -ExecutionPolicy Bypass -File scripts/deployment/package-gmail-extension.ps1` từ gốc dự án để cập nhật `public/downloads/cyberaware-gmail-extension.zip`. ZIP này dùng cách cài thủ công qua `chrome://extensions` → Developer mode → Load unpacked sau khi giải nén. Khi phát hành trên Chrome Web Store, thay hướng dẫn tải ZIP bằng liên kết cửa hàng.

Việc lấy nội dung dựa vào giao diện Gmail hiện tại (`h2.hP`, `div.a3s.aiL`, `span.gD`), nên cần kiểm tra lại khi Gmail thay đổi giao diện. Nếu không tìm thấy thư, tiện ích báo lỗi thay vì đưa ra kết quả.
