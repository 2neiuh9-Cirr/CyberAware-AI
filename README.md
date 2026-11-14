# CyberAware AI

Ứng dụng nhận diện dấu hiệu lừa đảo trực tuyến, tiếp nhận báo cáo cộng đồng và hướng dẫn kỹ năng tự vệ số. Frontend dùng React/Vite; API dùng Express/TypeScript và SQLite. Các tính năng AI cần khóa Gemini và có thể chuyển về bộ quy tắc khi dịch vụ không khả dụng.

## Cấu trúc dự án

- `src/modules/`: các trang và thành phần riêng của từng chức năng; `src/components/`: thành phần dùng chung.
- `backend/auth/`, `backend/routes/`, `backend/analysis/`, `backend/chat/`, `backend/content/`: xác thực, API và dữ liệu nội dung.
- `tests/`: kiểm thử tự động; `scripts/`: công cụ quản trị, tạo tài liệu, xác minh và mã lưu trữ.
- `docs/`: hướng dẫn, kế hoạch, đặc tả và báo cáo. Xem `docs/specifications/README.md` để xác định bản SRS hiện hành.
- `public/`: tài nguyên website phục vụ trực tiếp. `data/` chứa SQLite và dữ liệu chạy, không đưa vào Git.
- `google-workspace-addon/`: mã Apps Script cho thẻ đánh giá thư đang mở trong Gmail; `browser-extension/`: tiện ích Chrome để chủ động bấm quét. Mục Gmail trên [trang chủ](https://cyberaware.click/#tien-ich-gmail) hướng dẫn cài và mô tả quyền truy cập.

## Học tập và kiểm tra trắc nghiệm

Trang `/hoc-tap` hiện có bốn chủ đề: nhận diện deepfake, bảo mật ngân hàng/OTP, tự vệ số cho gia đình và xử lý sau khi gặp liên kết đáng ngờ. Mỗi chủ đề có 2–3 bài học với tình huống, cách kiểm tra và bước xử lý cụ thể, cộng một bài kiểm tra cuối khóa gồm 10 câu. Tổng cộng có 11 bài học và 40 câu hỏi. Mỗi câu có đúng bốn lựa chọn A–D. Năm câu mới của mỗi khóa là tình huống gần đời thực và có giải thích cho từng lựa chọn.

Người học có thể đọc nội dung mà không đăng nhập. Cần đăng nhập để nộp bài và lưu tiến độ. `GET /api/courses/:id/lessons/:lessonId` trả nội dung bài học và câu hỏi, không trả đáp án hay phần giải thích trước khi nộp. `GET /api/courses/:id` trả cả `incidentGuidance` (tiêu đề, mô tả tình huống, các bước xử lý sau khi gặp lừa đảo) của khóa học. `POST /api/quizzes/:id/submissions` nhận mảng `answers` theo thứ tự câu hỏi; giá trị `-1` biểu thị câu bỏ trống và được tính 0 điểm. Máy chủ trả `score`, `correctCount`, `total`, `passed` và `explanations[]`. Mỗi mục giải thích gồm đáp án đã chọn, đáp án đúng và lý do cho từng phương án. Đạt từ 80% mới có thể bấm hoàn thành khóa; thao tác này tự đánh dấu tất cả bài học trong khóa và lưu tiến độ vào SQLite. Quản trị viên có thể chỉnh `incidentGuidance` trong form khóa học hoặc qua API quản trị.

Nội dung bài học và đáp án gốc nằm ở `backend/content/education.ts`; 20 câu tình huống bổ sung nằm ở `backend/content/education-extra-questions.ts`. Danh mục được đưa vào SQLite khi khởi động. Với cơ sở dữ liệu đã có, server chỉ thêm câu hỏi mới còn thiếu theo ID và giữ nguyên các câu đã được quản trị viên chỉnh sửa. Dữ liệu cá nhân về tiến độ và lần nộp vẫn được giữ nguyên.

## Chạy tại máy

Yêu cầu Node.js 24 trở lên và npm. Dùng npm làm trình quản lý gói của dự án.

1. Cài phụ thuộc: `npm install --legacy-peer-deps`.
2. Sao chép `.env.example` thành `.env`, rồi điền các biến cần dùng. `GEMINI_API_KEY` bật phân tích AI cho URL, SMS và thư Gmail khi quản trị viên cũng đã bật tính năng và người dùng Gmail đồng ý với bản AI. Nếu dịch vụ AI không khả dụng, hệ thống dùng bộ quy tắc đã lưu.
3. Chạy ứng dụng: `npm run dev`.

Kiểm tra trước khi triển khai: `npm run lint`, `npm run build`, `npm test`, `npm run test:ai`, `npm run test:auth`. Các bài kiểm tra live cần dịch vụ và cấu hình tương ứng; không nằm trong bộ test mặc định.

Nếu cổng 3000 đang được dùng, chế độ phát triển tự thử các cổng tiếp theo và in địa chỉ thực tế trong terminal, ví dụ `CyberAware AI: http://localhost:3001`. Hãy mở đúng địa chỉ được in ra; không cần chạy lại lệnh nhiều lần. Có thể chỉ định cổng bằng PowerShell: `$env:PORT=3100; $env:APP_URL='http://localhost:3100'; npm.cmd run dev`. Khi chỉ định `PORT`, cổng đó phải còn trống. Do Vite được nhúng trong Express và không mở WebSocket riêng, hãy tải lại trang sau khi sửa giao diện.

## Authentication API

The existing frontend sends requests to the same server. The backend now supports:

| Method | Path | Request body | Result |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | `{ "fullname", "email", "password" }` | Gửi mã xác minh email; chưa tạo phiên đăng nhập |
| POST | `/api/auth/verify-email` | `{ "email", "code" }` và cookie từ bước đăng ký | Tạo tài khoản, đánh dấu email đã xác minh và đăng nhập |
| POST | `/api/auth/resend-verification` | `{ "email" }` và cookie từ bước đăng ký | Gửi mã mới sau ít nhất 60 giây; mã cũ mất hiệu lực |
| POST | `/api/auth/login` | `{ "email", "password", "remember": true/false }` | `{ success, user, token }` và cookie phiên |
| GET | `/api/auth/oauth/providers` | Không có | Trạng thái cấu hình Google/Facebook |
| GET | `/api/auth/oauth/google/start` | Không có | Chuyển sang Google để người dùng xác nhận |
| GET | `/api/auth/oauth/facebook/start` | Không có | Chuyển sang Facebook để người dùng xác nhận |
| GET | `/api/auth/oauth/:provider/callback` | Mã và state từ nhà cung cấp | Tạo phiên CyberAware rồi chuyển về trang chủ |
| GET | `/api/auth/me` | Session cookie or `Authorization: Bearer <token>` | `{ success, user }` |
| POST | `/api/auth/logout` | None | Clears the authentication cookie |
| POST | `/api/auth/forgot-password` | `{ "email" }` | Trả cùng một phản hồi dù email có tài khoản hay không; nếu có, gửi mã 8 số có hiệu lực 5 phút |
| POST | `/api/auth/verify-reset-code` | `{ "email", "code" }` | Verifies the code, allows at most 5 wrong attempts, consumes it and sets a short-lived HttpOnly reset cookie |
| GET | `/api/auth/reset-password/status` | Recovery cookie | Confirms that code verification is still valid after a page reload |
| POST | `/api/auth/reset-password` | `{ "newPassword" }` and verified recovery cookie | Changes the password, consumes the recovery grant and revokes existing sessions; user must log in again |

Users and sessions are stored in `data/auth.sqlite`. Passwords are salted and hashed with scrypt. The JSON response still includes a signed one-hour JWT for API clients; the browser uses an HttpOnly cookie backed by a server-side session. The `data/` directory is ignored by Git. Set `AUTH_JWT_SECRET` to a random value of at least 32 bytes in production. For local development, the server creates a persistent secret in `data/jwt-secret` when this variable is absent.

The login form starts with blank email and password fields and an unchecked Remember box. With `remember: false`, the cookie is a browser-session cookie. With `remember: true`, it survives browser restarts for up to 30 days of inactivity. Opening the app renews the 30-day cookie and server-side idle window. Existing remembered sessions from the former 400-day setting are capped to 30 days at server startup. Clearing browser data may end the session earlier. Logout calls `/api/auth/logout`, revokes the server session and returns to the login screen. Password reset revokes all sessions for that user.

### Google/Facebook sign-in

Create a Web OAuth client in Google Cloud and a Facebook Login app in Meta for Developers. Configure `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `FACEBOOK_APP_ID`, and `FACEBOOK_APP_SECRET` in `.env`; keep secrets on the server. Register the exact callbacks `${APP_URL}/api/auth/oauth/google/callback` and `${APP_URL}/api/auth/oauth/facebook/callback` with the corresponding provider. `APP_URL` must match the actual origin, including the port used by the running server. Configure Facebook Login's `email` permission. If Meta changes its Graph API version, set `FACEBOOK_GRAPH_VERSION` to a supported version.

The browser redirects to the provider's consent screen. The callback checks a single-use state bound to the browser, exchanges the code on the server, and creates the same CyberAware session used by password login. Provider access tokens are not stored. A new social user gets a normal member account and can use learning, reporting, and scan history. A Google account with a verified email may join an existing CyberAware account with the same email. A Facebook login with an email already used by CyberAware does not automatically join that account; use the existing login method. Facebook accounts without an email cannot sign in. Provider credentials are required for live use; without them, the buttons explain that sign-in has not been configured.

To send registration and recovery email, set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, and `SMTP_FROM` in `.env` or the deployment environment. For Gmail SMTP, use the Gmail account's app password where required; never put credentials in source control. Restart the server after editing `.env`. New users must enter the single-use 8-digit registration code in the same browser within 10 minutes before the account is created. Existing accounts remain usable after this update; their `emailVerified` field stays false until a separate legacy verification flow is added.

In local development without SMTP, registration codes are written to `data/dev-verification-codes.log` and recovery codes to `data/dev-reset-codes.log`; the pages identify this mode. In production SMTP is required. Recovery requests return the same status, body and delivery mode for known and unknown addresses. Mail delivery occurs after the request is accepted, so SMTP failures are logged on the server rather than returned to the browser. The recovery code expires after five minutes. After successful verification, the user has ten minutes to enter a new password in the same browser. Sending a new code invalidates the old code and any pending password-reset grant. A successful password change triggers a notification email when SMTP is configured and does not log the user in automatically.

The login store does not use an offline demo account or fake success fallback.

