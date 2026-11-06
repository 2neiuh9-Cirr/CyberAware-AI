<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

## Học tập và kiểm tra trắc nghiệm

Trang `/hoc-tap` hiện có bốn chủ đề: nhận diện deepfake, bảo mật ngân hàng/OTP, tự vệ số cho gia đình và xử lý sau khi gặp liên kết đáng ngờ. Mỗi chủ đề có 2–3 bài học với tình huống, cách kiểm tra và bước xử lý cụ thể, cộng một bài kiểm tra cuối khóa gồm 10 câu. Tổng cộng có 11 bài học và 40 câu hỏi. Mỗi câu có đúng bốn lựa chọn A–D. Năm câu mới của mỗi khóa là tình huống gần đời thực và có giải thích cho từng lựa chọn.

Người học có thể đọc nội dung mà không đăng nhập. Cần đăng nhập để nộp bài và lưu tiến độ. `GET /api/courses/:id/lessons/:lessonId` trả nội dung bài học và câu hỏi, không trả đáp án hay phần giải thích trước khi nộp. `GET /api/courses/:id` trả cả `incidentGuidance` (tiêu đề, mô tả tình huống, các bước xử lý sau khi gặp lừa đảo) của khóa học. `POST /api/quizzes/:id/submissions` nhận mảng `answers` theo thứ tự câu hỏi; giá trị `-1` biểu thị câu bỏ trống và được tính 0 điểm. Máy chủ trả `score`, `correctCount`, `total`, `passed` và `explanations[]`. Mỗi mục giải thích gồm đáp án đã chọn, đáp án đúng và lý do cho từng phương án. Đạt từ 80% mới có thể bấm hoàn thành khóa; thao tác này tự đánh dấu tất cả bài học trong khóa và lưu tiến độ vào SQLite. Quản trị viên có thể chỉnh `incidentGuidance` trong form khóa học hoặc qua API quản trị.

Nội dung bài học và đáp án gốc nằm ở `backend/education.ts`; 20 câu tình huống bổ sung nằm ở `backend/education-extra-questions.ts`. Danh mục được đưa vào SQLite khi khởi động. Với cơ sở dữ liệu đã có, server chỉ thêm câu hỏi mới còn thiếu theo ID và giữ nguyên các câu đã được quản trị viên chỉnh sửa. Dữ liệu cá nhân về tiến độ và lần nộp vẫn được giữ nguyên.

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/0da6e46b-c75c-467c-a9d3-6f41235ebdeb

## Run Locally

**Prerequisites:**  Node.js
For the authentication API, use Node.js 24 or later (the backend uses the built-in SQLite module).


1. Install dependencies:
   `npm install --legacy-peer-deps`
2. Copy `.env.example` to `.env` and set `GEMINI_API_KEY` to enable AI context analysis for URL and SMS scans. AI can raise the risk score only when its response cites text present in the user's input; scans fall back to stored rules if the service is unavailable. The admin AI setting must also be enabled.
3. Run the app:
   `npm run dev`

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

