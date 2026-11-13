# CyberAware AI Google Workspace add-on

Mã trong thư mục này là một dự án Apps Script độc lập. `Code.gs` tạo thẻ trong thanh bên Gmail; `appsscript.json` chỉ xin quyền đọc thư hiện tại, gọi API của CyberAware và lưu lựa chọn đồng ý của từng người dùng.

## Cài bản thử trên Gmail thật

1. Tạo dự án Apps Script độc lập tại [script.google.com](https://script.google.com/), bật hiển thị `appsscript.json` trong Project Settings, thay hai tệp của dự án bằng hai tệp ở thư mục này.
2. Tạo một khóa ngẫu nhiên dài ít nhất 32 ký tự. Cấu hình cùng giá trị thành `GMAIL_ADDON_API_KEY` trong môi trường của server CyberAware và trong **Project Settings → Script Properties** của Apps Script. Không ghi khóa vào Git hoặc `Code.gs`.
3. Triển khai mã server và `dist` mới lên `https://cyberaware.click`; kiểm tra `GET /api/health` và biểu tượng `https://cyberaware.click/images/cyberaware-addon.png`.
4. Trong Apps Script, chọn **Deploy → Test deployments → Install**. Mở lại Gmail, bấm biểu tượng CyberAware AI ở thanh bên, đồng ý xử lý dữ liệu, rồi mở một thư để xem phân loại. Bản thử chỉ dành cho tài khoản có quyền chỉnh sửa dự án trong cùng miền với chủ dự án.
5. Kiểm tra thư lành tính và thư mô phỏng lừa đảo, bật/tắt đồng ý, thư nhiều liên kết và tình huống API lỗi. Quan sát Apps Script Executions và nhật ký máy chủ; không ghi nội dung thư vào log.

## Phát hành cho người dùng

Liên kết Apps Script với **standard Google Cloud project**, cấu hình OAuth consent và Google Workspace Marketplace SDK, tạo version/deployment, rồi gửi bản công khai để Google xét duyệt. Sau khi có URL Marketplace, cập nhật trang `/tien-ich-gmail` bằng nút cài chính thức. Không gọi bản test là bản công khai.

Tài liệu Google: [thẻ Gmail theo thư đang mở](https://developers.google.com/workspace/add-ons/gmail/extending-message-ui), [cài bản thử](https://developers.google.com/workspace/add-ons/how-tos/testing-workspace-addons), [phát hành](https://developers.google.com/workspace/add-ons/how-tos/publish-add-on-overview).

## Giới hạn phiên bản đầu

Add-on chỉ đọc thư đang mở khi người dùng đã bật quét và mở add-on. Nó không đọc toàn hộp thư, tự gắn nhãn Gmail, hay đọc tệp đính kèm. Phân tích dùng quy tắc trên máy chủ; nội dung thư không lưu lịch sử và không gửi tới Gemini.
