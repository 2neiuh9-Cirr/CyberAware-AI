# CyberAware AI

CyberAware AI là ứng dụng web tiếng Việt hỗ trợ nhận diện dấu hiệu lừa đảo trực tuyến, tiếp nhận cảnh báo cộng đồng và hướng dẫn kỹ năng tự vệ số. Kết quả quét là đánh giá tham khảo dựa trên quy tắc, dữ liệu đã kiểm duyệt và, khi được cấu hình, Google Gemini; điểm thấp không xác nhận một đối tượng là an toàn.

## Chức năng chính

| Nhóm | Khả năng hiện có |
| --- | --- |
| Kiểm tra | Đánh giá URL, tin nhắn, số điện thoại và số tài khoản ngân hàng; hiển thị điểm rủi ro, dấu hiệu và bước tự xác minh. Tài khoản đăng nhập xem lại lịch sử quét của mình. |
| Cộng đồng | Gửi báo cáo, xem cảnh báo công khai và bình chọn báo cáo đã duyệt. Quản trị viên kiểm duyệt và quyết định trạng thái hiển thị. |
| Học tập | Xem tình huống, khóa học, bài học và câu hỏi tương tác. Người dùng đăng nhập có thể nộp bài, lưu tiến độ và nhận chứng nhận khi đáp ứng điều kiện của khóa. |
| Trợ lý AI | Trả lời câu hỏi về an toàn số, có thể nhận một ảnh mỗi lượt khi quản trị viên bật; tài khoản đăng nhập có lịch sử hội thoại. Cần khóa Gemini và chịu hạn mức sử dụng. |
| Tài khoản | Đăng ký có mã xác minh email, đăng nhập bằng mật khẩu hoặc Google/Facebook khi đã cấu hình, khôi phục mật khẩu, quản lý hồ sơ, phiên đăng nhập và quyền riêng tư. |
| Quản trị | Quản lý người dùng, báo cáo, khóa học, ngân hàng câu hỏi, tri thức và quy tắc phân tích, cấu hình AI, nhật ký và thống kê hệ thống. |
| Gmail và trình duyệt | Tiện ích Chrome quét thư hoặc kiểm tra URL của trang đang mở khi người dùng bấm; Google Workspace add-on hiển thị đánh giá cho thư đang mở. Kiểm tra URL đối chiếu thêm với Google Safe Browsing khi máy chủ được cấu hình khóa. |

Các trang chính: `/kiem-tra`, `/canh-bao`, `/hoc-tap`, `/bao-cao`, `/dang-nhap`, `/tong-quan` và mục Gmail tại `/#tien-ich-gmail`. Các trang tài khoản và quản trị kiểm tra quyền truy cập.

## Kiến trúc và dữ liệu

- Giao diện: React 19, TypeScript, React Router, Zustand, Vite và Tailwind CSS. `src/modules/` chứa từng chức năng; `src/components/` chứa thành phần dùng chung; `src/site/` chứa ngôn ngữ, tùy chọn và theme.
- Máy chủ: Express 4 và TypeScript trong `server.ts` và `backend/`. API công khai ở `backend/routes/public/`, API quản trị ở `backend/routes/admin/`; xác thực ở `backend/auth/`, phân tích ở `backend/analysis/`, chatbot ở `backend/chat/`, nội dung học tập ở `backend/content/`.
- Lưu trữ: SQLite trong `data/auth.sqlite` (hoặc `AUTH_DATA_DIR` đã cấu hình). `backend/database.ts` khởi tạo dữ liệu và các bảng nghiệp vụ. `data/` chứa dữ liệu chạy và được bỏ qua bởi Git; cần sao lưu riêng khi triển khai.
- Phân tích: quy tắc và dữ liệu đã lưu luôn là nền tảng. Gemini chỉ tham gia khi có `GEMINI_API_KEY` và tính năng AI tương ứng được bật. Nếu gọi Gemini thất bại, phần đánh giá bằng quy tắc vẫn hoạt động. Quét số điện thoại/tài khoản ngân hàng không xác minh chủ sở hữu tại nhà mạng hoặc ngân hàng.
- Xác thực: mật khẩu được băm bằng scrypt; trình duyệt dùng cookie HttpOnly gắn với phiên ở máy chủ. API có thể dùng JWT đã ký, có hiệu lực một giờ. Phiên ghi nhớ có cửa sổ không hoạt động tối đa 30 ngày; đổi mật khẩu thu hồi các phiên cũ.

```text
src/                       Giao diện, trang và trạng thái phía trình duyệt
backend/                   API, xác thực, phân tích, nội dung, SQLite
shared/                    Logic dùng chung giữa giao diện và máy chủ
tests/                     Kiểm thử API, AI và xác thực
browser-extension/         Nguồn tiện ích Chrome cho Gmail
google-workspace-addon/    Nguồn Apps Script của Gmail add-on
public/                    Tài nguyên được website phục vụ trực tiếp
scripts/                   Công cụ quản trị, tạo tài liệu, triển khai, xác minh
deploy/                    Hướng dẫn và cấu hình triển khai
docs/                      Hướng dẫn, kế hoạch, đặc tả, báo cáo và lưu trữ
data/                      Dữ liệu chạy cục bộ, không đưa vào Git
```

Chi tiết từng phần xem [README của scripts](scripts/README.md), [README triển khai](deploy/README.md), [README tiện ích Chrome](browser-extension/README.md) và [README add-on](google-workspace-addon/README.md).

## Chạy trên máy phát triển

Yêu cầu **Node.js 24 trở lên** và npm. `package-lock.json` là khóa phụ thuộc dùng cho các lệnh npm trong tài liệu này; `bun.lock` vẫn được giữ trong kho nhưng không phải quy trình cài đặt được hướng dẫn.

1. Cài phụ thuộc từ khóa hiện có: `npm ci --legacy-peer-deps`.
2. Sao chép `.env.example` thành `.env`, rồi điền các biến cần cho chức năng sẽ dùng. Không đưa `.env` hoặc khóa vào Git.
3. Chạy `npm run dev` và mở địa chỉ được in trong terminal.

Trong PowerShell có thể dùng `Copy-Item .env.example .env` và `npm.cmd` thay cho `npm`. Mặc định ứng dụng dùng cổng 3000. Nếu cổng này bận, chế độ phát triển tự thử cổng kế tiếp và cập nhật `APP_URL` khi giá trị đang là `http://localhost:<cổng>`. Muốn chọn cổng cố định trong PowerShell: `$env:PORT=3100; $env:APP_URL='http://localhost:3100'; npm.cmd run dev`. Khi đổi giao diện, tải lại trang vì Vite đang chạy qua middleware Express với HMR tắt.

### Cấu hình môi trường

| Biến | Vai trò |
| --- | --- |
| `APP_URL` | Origin công khai của ứng dụng, dùng cho OAuth và kiểm tra nguồn yêu cầu API; phải khớp giao thức, tên miền và cổng thực tế. |
| `GEMINI_API_KEY` | Khóa Gemini trên máy chủ cho phân tích, chatbot và dịch giao diện khi tính năng tương ứng được bật. Không dùng biến `VITE_*` cho khóa này. |
| `GEMINI_MODEL`, `GEMINI_CHAT_MODEL`, `GEMINI_TRANSLATION_MODEL` | Model chính cho phân tích, chatbot và dịch giao diện. Model dịch là tùy chọn; nếu không đặt, server dùng model chatbot. `.env.example` có giá trị mẫu cho hai model đầu. |
| `AUTH_JWT_SECRET`, `AUTH_DATA_DIR` | Khóa ký xác thực và vị trí dữ liệu. Production cần khóa ngẫu nhiên dài ít nhất 32 byte. Máy phát triển tự tạo khóa bền vững trong `data/jwt-secret` nếu để trống. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` | Gửi mã đăng ký, mã khôi phục và thông báo đổi mật khẩu. Production cần SMTP cho các luồng gửi mã. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET` | Bật đăng nhập OAuth; callback phải đăng ký đúng theo `APP_URL`. `FACEBOOK_GRAPH_VERSION` có thể đổi khi cần. |
| `GMAIL_ADDON_API_KEY` | Khóa dùng chung của server và Apps Script, dài ít nhất 32 ký tự. Tiện ích Chrome không dùng khóa này. |
| `PORT`, `HOST`, `NODE_ENV`, `TRUST_PROXY_HOPS` | Cổng, địa chỉ lắng nghe và cấu hình chạy sau proxy. Ở production, server mặc định lắng nghe trên `127.0.0.1` nếu không đặt `HOST`. |

Không có SMTP ở môi trường phát triển, mã đăng ký và khôi phục được ghi vào `data/dev-verification-codes.log` và `data/dev-reset-codes.log`. Đây là chế độ thử cục bộ. Sau khi sửa `.env`, khởi động lại server.

## Luồng nghiệp vụ và API tiêu biểu

### Đăng nhập và khôi phục

Đăng ký gọi `POST /api/auth/register`, nhận mã 8 chữ số qua email, rồi xác minh tại `POST /api/auth/verify-email` trong cùng trình duyệt để tạo tài khoản và phiên. Có thể gửi lại mã sau thời gian chờ. Đăng nhập bằng `POST /api/auth/login`, kiểm tra phiên ở `GET /api/auth/me` và đăng xuất bằng `POST /api/auth/logout`.

Quên mật khẩu dùng `POST /api/auth/forgot-password` → `POST /api/auth/verify-reset-code` → `POST /api/auth/reset-password`. Mã khôi phục có hiệu lực 5 phút, tối đa 5 lần nhập sai; sau xác minh có 10 phút để đặt mật khẩu mới trong cùng trình duyệt. Đổi mật khẩu không tự đăng nhập lại. Tài khoản đã tồn tại trước khi có bước xác minh email vẫn sử dụng được.

OAuth cần cấu hình thông tin ứng dụng phía Google/Meta và callback `${APP_URL}/api/auth/oauth/google/callback`, `${APP_URL}/api/auth/oauth/facebook/callback`. Người dùng còn có thể liên kết tài khoản mạng xã hội từ phần cài đặt tài khoản. Xem tài liệu cấu hình trong `docs/guides/`.

### Kiểm tra, báo cáo và học tập

- `POST /api/analyze` nhận loại `url`, `sms`, `phone` hoặc `bank` và nội dung cần kiểm tra. `GET /api/scans` trả lịch sử của người dùng đăng nhập. Nội dung quét của khách không được lưu nguyên văn trong lịch sử.
- `GET /api/reports` trả báo cáo theo quyền và bộ lọc; `POST /api/report` yêu cầu đăng nhập; chỉ báo cáo đã duyệt và đang hiển thị mới được bình chọn.
- `GET /api/courses` và `GET /api/courses/:id/lessons/:lessonId` cung cấp nội dung đã phát hành mà không lộ đáp án trước khi nộp. `POST /api/quizzes/:id/submissions` yêu cầu đăng nhập và trả điểm, đáp án, giải thích. Để hoàn thành khóa, người học cần đánh dấu đã đọc mọi bài học và đạt ít nhất 80% ở mọi bài kiểm tra của khóa.
- `POST /api/chat/messages` phục vụ chatbot khi AI sẵn sàng. Lịch sử hội thoại của tài khoản được lưu trong SQLite; khách không có lịch sử tài khoản. Quản trị viên có thể đặt hạn mức lượt, token và ảnh.

API kiểm tra sức khỏe: `GET /api/health`. Các router quản trị dưới `/api/admin/` kiểm tra vai trò quản trị ở máy chủ, ngoài kiểm tra quyền trong giao diện.

### Công cụ Gmail

Tiện ích Chrome trong `browser-extension/` được đóng gói ở `public/downloads/cyberaware-gmail-extension.zip`; người dùng giải nén và cài thủ công bằng `chrome://extensions` → **Developer mode** → **Load unpacked**. Add-on trong `google-workspace-addon/` là mã Apps Script; bản thử cần cài qua **Test deployments**. Mã add-on chưa đồng nghĩa đã phát hành công khai trên Google Workspace Marketplace.

Sau khi đồng ý, hai công cụ gửi chủ đề, người gửi, tối đa 4.500 ký tự nội dung và 10 liên kết của **thư đang mở** tới server. Chỉ khi có tiêu đề `x-cyberaware-ai-consent: v2`, khóa Gemini và cấu hình AI được bật thì chủ đề, nội dung và liên kết mới có thể được chuyển tiếp để đánh giá AI; địa chỉ người gửi không được gửi riêng tới Gemini. Máy chủ không lưu nguyên văn thư vào lịch sử quét. Hai công cụ không quét toàn hộp thư, tệp đính kèm hoặc tự gắn nhãn. Xem [chính sách quyền riêng tư](public/chinh-sach-quyen-rieng-tu.html) và [hướng dẫn triển khai Gmail](deploy/GMAIL_TOOLS_DEPLOYMENT.md).

## Kiểm tra và triển khai

Chạy từ gốc dự án:

```sh
npm run lint
npm run build
npm test
npm run test:ai
npm run test:auth
```

`npm run lint` kiểm tra TypeScript; `npm run build` tạo `dist/`; các lệnh test kiểm tra API, phân tích AI và luồng xác thực. `npm run verify:ai:live` cần khóa và kết nối Gemini thật, không thuộc bộ kiểm thử mặc định. Các lệnh quản trị `npm run admin` và `npm run admin:bootstrap` có thể sửa dữ liệu thật; đọc [README của scripts](scripts/README.md) trước khi chạy.

Với VPS, dùng `NODE_ENV=production`, cài phụ thuộc, build và khởi động bằng `npm run start` theo cấu hình dịch vụ. Production phục vụ `dist/` qua Express. Giữ riêng `.env`, `data/` và bản sao lưu SQLite; không đưa chúng vào ZIP triển khai. Xem [hướng dẫn trong deploy](deploy/README.md) và [quy trình Gmail](deploy/GMAIL_TOOLS_DEPLOYMENT.md) trước khi thay bản chạy.

## Tài liệu và giới hạn

- `docs/guides/`: hướng dẫn cấu hình và vận hành; `docs/plans/`: kế hoạch; `docs/reports/`: báo cáo; `docs/archive/`: bản nháp lưu trữ.
- [Danh mục SRS](docs/specifications/README.md) xác định v2.3 là bản tài liệu mới nhất trong thư mục chính, nhưng bản này đối chiếu mã ở một commit cũ và chưa bao quát đầy đủ tính năng Gmail. Mã nguồn và các README theo chức năng mô tả trạng thái triển khai hiện tại.
- Kết quả phân tích không thay cho việc xác minh trực tiếp với tổ chức, ngân hàng hoặc người gửi bằng kênh chính thức. AI và tài nguyên Gmail ngoài hệ thống cần cấu hình, quyền và dịch vụ tương ứng để dùng thực tế.
