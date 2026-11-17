# Đưa công cụ Gmail và kiểm tra URL lên cyberaware.click

## 1. Server CyberAware AI

Gói sẵn cho WinSCP đặt trong `deploy/packages/` (tạo lại bằng `scripts/deployment/package-gmail-vps.ps1 -PackageName ten-goi.zip` sau khi sửa mã). ZIP chứa `backend/`, `shared/`, `src/`, `public/`, `dist/`, `server.ts`, `package.json`, `package-lock.json`, `vite.config.ts`, `tsconfig.json` và `index.html`. ZIP không chứa `.env`, `data/`, `node_modules/` hoặc khóa bí mật. Trước khi giải nén, sao lưu cấu hình và dữ liệu hiện có.

Trong WinSCP, tải ZIP vào `/root/` trên VPS. Kiểm tra SHA-256 và `unzip -t` trước khi dùng. Sao lưu `/srv/cyberaware/app` và cơ sở dữ liệu trong `/var/lib/cyberaware/`, rồi giải nén ZIP vào một thư mục riêng dưới `/srv/cyberaware/releases/`. Chép `.env` từ bản đang chạy vào bản mới với quyền `root:cyberaware 640`. Không giải nén đè trực tiếp lên `/srv/cyberaware/app` vì sẽ khó hoàn tác nếu bản mới không khởi động.

Trên server (tại thư mục bản mới), dùng Node.js 24 trở lên:

```sh
npm ci --legacy-peer-deps
npm run lint
npm run build
```

Kiểm tra các thư mục trong bản mới có quyền đi qua (`x`) cho tài khoản chạy dịch vụ `cyberaware`, đặc biệt là `backend/routes/`. Script đóng gói hiện tại tạo ZIP với quyền thư mục Linux `755`. Sau khi kiểm tra, dừng `cyberaware.service`, đổi tên thư mục `app` thành một thư mục giữ bản cũ, chuyển bản mới thành `app`, rồi khởi động dịch vụ và kiểm tra `http://127.0.0.1:3000/api/health`. Nếu kiểm tra thất bại, chuyển lại bản cũ ngay.

Đặt `GMAIL_ADDON_API_KEY` trong `.env` hoặc biến môi trường của dịch vụ bằng một giá trị ngẫu nhiên dài ít nhất 32 ký tự. Đặt `SAFE_BROWSING_API_KEY` (khóa Safe Browsing giới hạn theo IP gọi ra của VPS) trong `.env`; không đưa khóa vào ZIP hoặc mã tiện ích. Giữ nguyên `APP_URL=https://cyberaware.click`.

Trước khi chuyển bản mới thành `app`, chạy trong thư mục bản mới sau khi cài phụ thuộc và chép `.env`:

```sh
node --env-file=.env --import tsx -e "import('./backend/analysis/safeBrowsing.ts').then(async ({checkSafeBrowsing}) => { const result = await checkSafeBrowsing('https://example.com/'); console.log(result); if (result.status === 'unavailable') process.exitCode = 1; })"
```

Kết quả mong đợi là `not_listed` cho URL thử; `unavailable` nghĩa là khóa, kết nối hoặc giải mã phản hồi chưa hoạt động, cần xử lý trước khi chuyển bản chạy. Sau khi chuyển bản và khởi động lại dịch vụ Node, kiểm tra:

Từ bản kết hợp AI, chỉ yêu cầu có tiêu đề `x-cyberaware-ai-consent: v2` mới được gửi nội dung thư tới Gemini. Bản add-on và tiện ích Chrome cũ không gửi tiêu đề này nên vẫn chỉ dùng quy tắc. Khi phát hành mã mới, cập nhật thông báo quyền riêng tư, yêu cầu người dùng đồng ý lại và kiểm tra `aiStatus` trong kết quả. Nếu quản trị viên tắt AI hoặc Gemini lỗi, điểm quy tắc vẫn được trả về.

- `https://cyberaware.click/#tien-ich-gmail` cuộn tới mục Gmail trên trang chủ và hiển thị hai cách dùng.
- `https://cyberaware.click/downloads/cyberaware-gmail-extension.zip` tải được ZIP có `manifest.json` ở gốc.
- `https://cyberaware.click/images/cyberaware-addon.png` trả ảnh.
- `POST /api/gmail-addon/analyze` không có khóa trả 401; `POST /api/gmail-extension/analyze` với thư thử trả điểm, mức độ và dấu hiệu.
- `POST /api/url-reputation` với `{"url":"https://example.com/"}` trả riêng `google.status` và `cyberAware`. Nếu Google không liệt kê URL, không diễn giải là trang an toàn.

## 2. Google Workspace add-on

Làm theo [google-workspace-addon/README.md](../google-workspace-addon/README.md). Tạo Apps Script project, chép `Code.gs` và `appsscript.json`, đặt **cùng khóa** vào Script Properties, rồi chọn **Deploy → Test deployments → Install**. Kiểm tra trực tiếp trên một thư trong Gmail. Tài khoản thử phải có quyền chỉnh sửa Apps Script project và thuộc cùng miền với chủ dự án, theo [hướng dẫn của Google](https://developers.google.com/workspace/add-ons/how-tos/testing-workspace-addons).

Để người dùng bất kỳ tự cài, phải xuất bản add-on qua Google Workspace Marketplace. Việc xuất bản cần standard Google Cloud project, cấu hình OAuth consent và Google xét duyệt bản công khai. Sau khi được duyệt, thêm URL Marketplace vào mục Gmail trên trang chủ. Quyền `gmail.addons.current.message.readonly` chỉ đọc thư đang mở khi add-on chạy, nhưng vẫn là quyền *sensitive* theo [danh mục quyền Gmail](https://developers.google.com/workspace/gmail/api/auth/scopes).

## 3. Tiện ích Chrome

ZIP trong `public/downloads` cài thủ công qua Load unpacked sau khi giải nén. Để người dùng cài bằng một nút, đưa ZIP lên Chrome Web Store, hoàn tất thông tin quyền riêng tư và thay liên kết trong mục Gmail trên trang chủ bằng URL cửa hàng. Gói ZIP phải được tạo lại sau mỗi lần sửa `browser-extension/` bằng `scripts/deployment/package-gmail-extension.ps1`.

ZIP tiện ích 1.2 phải được đóng gói lại từ `browser-extension/` trước khi tạo gói VPS. Bản 1.2 thêm kiểm tra URL khi người dùng bấm và giữ luồng quét Gmail của bản 1.1.

## Giới hạn hiện tại

Các công cụ chỉ đánh giá thư hoặc trang người dùng chủ động bấm kiểm tra. Chúng không quét hàng loạt thư cũ, không đọc tệp đính kèm, không tự gắn nhãn Gmail và không tự chặn trang. Điểm thấp hoặc kết quả Google không liệt kê không xác nhận an toàn.
