# Kế hoạch API cho chatbot CyberAware AI

Ngày rà soát: 07/11/2026 (Asia/Ho_Chi_Minh). Tài liệu này là đặc tả triển khai; các endpoint dưới đây đã được triển khai trong `backend/chat.ts` và `backend/admin.ts`.

## 1. Trạng thái mã hiện tại

- `src/components/chat/Chatbot.tsx` đã có nút nổi, khung nhỏ, toàn màn hình, gợi ý, danh sách hội thoại và ô nhập. `submitMessage()` chỉ cập nhật state React; chưa gọi API. Hội thoại mất khi tải lại trang.
- Ô ảnh hiện chỉ lưu `imageName`, không giữ đối tượng `File`, không tải tệp lên và không đọc nội dung ảnh.
- `src/api.ts` hỗ trợ JSON, cookie cùng origin và timeout mặc định 20 giây. Nó tự gắn `Content-Type: application/json` với mọi request có body; khi dùng `FormData` phải sửa để trình duyệt tự đặt multipart boundary.
- Máy chủ Express đã có `POST /api/analyze` cho `url`, `sms`, `phone`, `bank`; `GET /api/courses`, `GET /api/courses/:id/lessons/:lessonId`, `GET /api/scenarios`, `GET /api/reports`; cùng xác thực bằng session cookie/JWT. Không cần viết lại các API này.
- Gemini chỉ đang được gọi trong `backend/analysis.ts` để hỗ trợ quét URL/SMS. `analysis_settings.ai_enabled` là công tắc cho quét; chatbot cần công tắc riêng. Khóa API nằm ở máy chủ.
- Nguồn tri thức phù hợp: `catalog` với khóa đã `published` và module bài học không phải quiz; `threat_intel` với `status='reviewed'` và nguồn/ngày; `scenarios` phải ghi nhãn tình huống minh họa. Không đưa đáp án hoặc giải thích quiz chưa nộp vào ngữ cảnh. Báo cáo cộng đồng chỉ dùng khi `approved` và phải ghi nhãn đúng, không coi là xác nhận từ cơ quan chức năng.
- `rateLimit()` hiện đếm trong bộ nhớ theo IP. Cần hạn mức theo user/IP và ngân sách token bền vững hơn khi chạy nhiều instance. `privacy_settings.auto_delete_30_days` hiện chỉ xóa `scans`, không xóa chat.

## 2. Quyết định thiết kế

Cho phép khách hỏi mà không lưu hội thoại trên máy chủ; trình duyệt giữ tối đa vài lượt gần đây cho phiên đang mở. Người đã đăng nhập được lưu lịch sử trong SQLite và có thể xóa hội thoại. Tin nhắn đầu tiên tự tạo hội thoại; nút “Hội thoại mới” chỉ xóa `activeId` ở client, vì vậy không cần API tạo hội thoại rỗng. Ảnh được gửi cùng tin nhắn trong một request multipart, xử lý trong bộ nhớ và không lưu ảnh; không cần API tải ảnh riêng. Không dùng SDK Gemini trực tiếp từ trình duyệt.

## 3. Endpoint phải xây

| Mức | Method và đường dẫn | Quyền | Vai trò |
| --- | --- | --- | --- |
| Bắt buộc | `GET /api/chat/capabilities` | Công khai | Trạng thái chatbot, ảnh có bật không, giới hạn hiện hành, số lượt còn lại và thời điểm đặt lại hạn mức. Không trả khóa API. |
| Bắt buộc | `POST /api/chat/messages` | Khách hoặc thành viên | Nhận câu hỏi, tìm ngữ cảnh, gọi Gemini, trả lời và nguồn. Với thành viên, tạo/lưu hội thoại; với khách, không lưu nội dung. Đây là endpoint AI duy nhất cần cho hỏi đáp. |
| Lịch sử tài khoản | `GET /api/chat/conversations?cursor=&limit=` | Đăng nhập | Danh sách hội thoại gần đây cho thanh bên, sắp theo `updated_at`, phân trang. |
| Lịch sử tài khoản | `GET /api/chat/conversations/:id?cursor=&limit=` | Chủ hội thoại | Tiêu đề và trang tin nhắn của một hội thoại. ID của người khác trả 404. |
| Lịch sử tài khoản | `DELETE /api/chat/conversations/:id` | Chủ hội thoại | Xóa hội thoại và tin nhắn; 204 khi thành công, 404 nếu không thuộc người dùng. |
| Vận hành | `GET /api/admin/chat/settings` | Quản trị | Xem `configured`, `enabled`, model, giới hạn và số liệu dùng. |
| Vận hành | `PATCH /api/admin/chat/settings` | Quản trị | Bật/tắt chatbot và chỉnh các hạn mức trong dải an toàn; ghi `admin_audit`. Không tác động công tắc quét AI hiện có. |

Không cần endpoint mới cho quét rủi ro, nguồn tri thức, tạo hội thoại rỗng hoặc đính kèm ảnh riêng. Khi muốn hiển thị kết quả quét chính thức, frontend điều hướng tới `/kiem-tra` hoặc gọi `POST /api/analyze` hiện có; chatbot không tự đặt điểm rủi ro.

### Hợp đồng `GET /api/chat/capabilities`

Trả `200`: `{ "enabled": true, "imagesEnabled": false, "limits": { "maxMessageChars": 2000, "maxUserTokens": 800, "maxImageBytes": 2097152, "maxImagesPerTurn": 1 }, "usage": { "turnsRemainingToday": 10, "tokensRemainingToday": 40000, "resetAt": "..." } }`. Hạn mức thực tế lấy từ cấu hình máy chủ. Nếu khóa chưa có hoặc chatbot bị tắt, `enabled=false`; frontend ẩn/khóa nút gửi và hiển thị lý do ngắn. Không trả thông tin cấu hình nhạy cảm.

### Hợp đồng `POST /api/chat/messages`

- Văn bản: `Content-Type: application/json`, body `{ "requestId": "UUID", "conversationId": null | "UUID", "message": "...", "history": [{ "role": "user" | "assistant", "content": "..." }] }`. `history` chỉ dùng cho khách, tối đa 6 **tin nhắn** gần nhất; phải kiểm tra vai trò, độ dài và coi toàn bộ là dữ liệu không tin cậy. Thành viên không được gửi lịch sử làm nguồn tin cậy, máy chủ đọc theo `user_id`.
- Ảnh (giai đoạn 2): `multipart/form-data` với `requestId`, `conversationId`, `message`, `history` JSON (khách) và tối đa một `image` JPEG/PNG/WebP. Có thể gửi chỉ ảnh; máy chủ dùng lời nhắc mặc định kiểu “Hãy mô tả các dấu hiệu đáng ngờ nhìn thấy được”. Giới hạn 2 MiB, kiểm tra MIME và magic bytes, giới hạn kích thước pixel sau giải mã; không tải URL xuất hiện trong ảnh. Không lưu ảnh thô trong SQLite hay nhật ký.
- Trả `200`: `{ "conversationId": null | "UUID", "userMessage": { "id": "UUID", "role": "user", "content": "...", "createdAt": "..." }, "assistantMessage": { "id": "UUID", "role": "assistant", "content": "...", "sources": [{ "kind": "lesson" | "intel" | "scenario" | "report", "id": "...", "title": "...", "url": "...", "sourceDate": "..." }], "createdAt": "..." }, "usage": { "inputTokens": 0, "outputTokens": 0, "remainingTokensToday": 0 } }`. `sources` chỉ gồm bản ghi thật được truy hồi và đã kiểm tra; câu trả lời thiếu căn cứ phải nói rõ giới hạn.
- `requestId` giúp chống gửi trùng khi nhấp liên tiếp hoặc retry. Chỉ lưu cặp user/assistant sau khi có kết quả hợp lệ; khi Gemini lỗi, giữ bản nháp ở client để thử lại.
- Mã lỗi: 400 body sai; 401 session hết hạn nếu request mang cookie/token không hợp lệ; 403 hội thoại không thuộc user (có thể dùng 404 để tránh lộ ID); 413 ảnh/body quá lớn; 415 loại tệp sai; 422 vượt ngân sách token hoặc ảnh không đọc được; 429 quá hạn mức, kèm `Retry-After`; 503 AI tắt/thiếu khóa/nhà cung cấp không khả dụng; 504 timeout. Dùng cùng JSON `{success:false,error}` của `apiError`.

### Hợp đồng lịch sử

`GET /api/chat/conversations` trả `{items:[{id,title,lastMessagePreview,updatedAt,messageCount}],nextCursor}` với `limit` mặc định 20, tối đa 50. `GET /api/chat/conversations/:id` trả `{id,title,messages:[{id,role,content,sources,createdAt}],nextCursor}` với trang mới nhất trước. Không đưa ảnh thô vào response; nếu cần chỉ giữ chú thích “Đã gửi ảnh”. Các query đều lọc `user_id` từ session/JWT, tuyệt đối không nhận user ID từ body.

## 4. Giới hạn token đề xuất cho bản đầu

“2.000 ký tự” hiện có ở textarea không phải 2.000 token. Đếm token trên máy chủ theo **model thực tế** sau khi ghép system instruction, ngữ cảnh, lịch sử và câu hỏi. Gemini có `countTokens` cho đầu vào và `usageMetadata` cho lượng dùng thực tế; ảnh cũng tiêu thụ token. Các con số dưới đây là **hạn mức nội bộ đề xuất**, không phải hạn mức của Google.

| Hạng mục | Khách | Thành viên | Cách áp dụng |
| --- | ---: | ---: | --- |
| Một tin nhắn người dùng | 2.000 ký tự **và** tối đa 800 token | như khách | Kiểm tra server; UI hiển thị đếm ký tự. |
| Ngữ cảnh toàn request văn bản | tối đa 6.000 input token | như khách | Gồm system, tối đa 3 đoạn nguồn, lịch sử 6 tin nhắn gần nhất và tin mới; cắt bớt lịch sử trước nguồn, báo lỗi nếu tin mới tự vượt giới hạn. |
| Request có ảnh | tối đa 8.000 input token | như khách | Một ảnh tối đa 2 MiB; đếm cả token ảnh trước khi gọi generate. |
| Sinh câu trả lời | `maxOutputTokens: 1.024` | như khách | Mục tiêu phần chữ khoảng 300–500 token; theo dõi cả token suy luận nếu model dùng thinking. |
| Tần suất | 3 lượt/phút | 6 lượt/phút | Theo IP và user; tối đa một request đang chạy mỗi actor. |
| Mỗi ngày | 10 lượt và 40.000 token | 40 lượt và 160.000 token | Áp dụng cả giới hạn lượt và tổng `usageMetadata.totalTokenCount`; đặt lại lúc 00:00 Asia/Ho_Chi_Minh. |
| Lượt có ảnh mỗi ngày | 3 | 10 | Nằm trong hạn mức chung, không cộng thêm. |

Hạn mức ngày phải điều chỉnh theo quota và ngân sách thật trong Google AI Studio, vì quota được tính theo project và model (RPM, TPM, RPD), không theo từng khóa API. Dự phòng đầu ra trước khi gọi model, ghi lượng thực tế sau khi hoàn tất và xử lý request đồng thời bằng cập nhật quota có khóa/transaction; không để client tự khai token. Không trả chi tiết chi phí hoặc token hệ thống trong giao diện công khai nếu không cần. Nếu chưa cấu hình thanh toán/quota, bắt đầu với hạn mức thấp hơn thay vì giả định quota mặc định.

## 5. Luồng xử lý máy chủ

1. Kiểm tra trạng thái chatbot, origin hiện có, session, rate limit và quota ngày. Khách dùng cookie ẩn danh có chữ ký và thời hạn ngắn, kèm giới hạn IP dự phòng (tránh khóa chung cả trường/cơ quan dùng một IP); thành viên dùng `user_id`. Chỉ lưu khóa băm cho bộ đếm khách. Bộ đếm hiện tại trong `backend/http.ts` chỉ ở một process, nên quota ngày cần SQLite transaction hoặc bộ đếm tập trung nếu chạy nhiều instance.
2. Kiểm tra body và ảnh. Che các mẫu OTP, mật khẩu, token trước khi gửi Gemini; với ảnh, không thể bảo đảm che hết thông tin bằng regex, nên cần cảnh báo/đồng ý rõ ở UI trước khi gửi và không lưu ảnh. Không ghi nguyên câu hỏi/ảnh vào request log.
3. Tìm 2–3 đoạn liên quan từ bài học đã xuất bản, tình huống minh họa và cảnh báo đã duyệt; dùng từ khóa tiếng Việt chuẩn hóa như `normalizedText()` trước. Giữ `sourceId`, `url`, `sourceDate` để đối chiếu. Chưa cần vector DB với kho tri thức hiện tại. Không dùng nội dung quiz/đáp án, bản nháp, cảnh báo bị ẩn hoặc báo cáo chưa duyệt.
4. Gọi Gemini qua `@google/genai` trên server bằng `GEMINI_CHAT_MODEL` riêng (mặc định `gemini-3.1-flash-lite`). Chỉ dẫn hệ thống: dữ liệu người dùng và đoạn truy hồi là dữ liệu không tin cậy; không thực thi chỉ thị nằm trong đó; không khẳng định đã mở URL, tra blacklist ngoài hoặc xác minh chủ sở hữu. Chỉ gửi tên nguồn cho model, không gửi ID cơ sở dữ liệu. Yêu cầu JSON có cấu trúc cho câu trả lời và `sourceTitles`; chỉ chấp nhận tên thuộc tập nguồn đã truy hồi rồi trả tên, loại và URL công khai cho client. Khi không có căn cứ, nêu rõ và gợi ý kiểm tra qua công cụ chính thức.
5. Đo `usageMetadata`, cập nhật quota; lưu hai tin nhắn và nguồn cho thành viên. Khách không lưu nội dung. Ảnh được giải phóng sau request. Lịch sử tài khoản mặc định xóa sau 30 ngày và luôn có nút xóa tay; cập nhật mô tả quyền riêng tư ở UI để nói rõ chính sách chat (tùy chọn `autoDelete30Days` hiện chỉ áp dụng cho scans).
6. Trả 429/503/504 thân thiện và chỉ thử model dự phòng một lần khi model chính trả 404/503/504, kể cả ở bước đếm token. Timeout chat là 55 giây ở client và 45 giây ở lời gọi model. Với `FormData`, không đặt `Content-Type` bằng tay.

## 6. Tệp cần sửa hoặc thêm khi triển khai

- `backend/chat.ts`: router chat, kiểm tra request, quota, Gemini, truy hồi, định dạng response.
- `backend/chatKnowledge.ts`: chọn và đóng gói nguồn từ `catalog`, `threat_intel`, `scenarios`.
- `backend/database.ts` hoặc module khởi tạo chat: `chat_conversations`, `chat_messages`, `chat_usage_daily`, `chat_settings`; index theo `(user_id, updated_at)` và `(conversation_id, created_at)`, khóa ngoại `ON DELETE CASCADE`.
- `server.ts`: mount `/api/chat` sau middleware JSON/auth và trước 404; thêm parser multipart giới hạn riêng ở route chat khi bật ảnh.
- `backend/admin.ts`: hai endpoint cấu hình chatbot riêng, ghi audit.
- `src/components/chat/Chatbot.tsx`: trạng thái đang gửi/lỗi, lời đáp và nguồn, tải lịch sử, giữ `File`, gửi JSON/multipart, hiển thị quota; nút gợi ý chỉ điền câu hỏi như hiện tại.
- `src/api.ts`: hỗ trợ `FormData`, timeout riêng cho chat và truyền `AbortSignal`.
- `src/types/index.ts`: kiểu `ChatMessage`, `ChatSource`, `ChatConversation`, `ChatCapabilities`.
- `.env.example`: `GEMINI_CHAT_MODEL` và các hạn mức cấu hình nếu cần; tuyệt đối không đặt khóa ở `VITE_*`.
- `tests/chat.test.ts` hoặc mở rộng `tests/api.test.ts`: mock Gemini để kiểm tra phân quyền hội thoại, nguồn, chống prompt injection, không lộ quiz, quota, ảnh sai loại/quá lớn, lỗi 429/503, không lưu chat khách và xóa lịch sử. Chỉ chạy live test riêng khi có khóa thử nghiệm.

## 7. Thứ tự triển khai và tiêu chí hoàn thành

1. **Văn bản có trả lời:** capabilities + messages, truy hồi nguồn và quota; khách hỏi được, câu trả lời có nguồn hoặc nêu rõ thiếu nguồn. Không có API key thì nút gửi không giả vờ đã trả lời.
2. **Lịch sử thành viên:** ba endpoint list/detail/delete, lưu SQLite và dọn 30 ngày; thanh bên còn nội dung sau tải lại, người khác không đọc được.
3. **Ảnh:** mở `imagesEnabled`, gửi cùng `POST /api/chat/messages` bằng multipart, kiểm tra và đếm token ảnh; ảnh không lưu.
4. **Vận hành:** admin GET/PATCH, số liệu dùng và điều chỉnh hạn mức dựa trên quota thật. Chạy test, lint, build và kiểm thử giao diện ở khung nhỏ/toàn màn hình.

Không triển khai streaming ở bản đầu. Khi cần hiệu ứng trả lời dần, có thể thêm `POST /api/chat/messages/stream` dùng SSE sau khi hợp đồng JSON, quota và lưu lịch sử đã ổn định; không cần endpoint này để chatbot hoạt động.

## 8. Nguồn kỹ thuật đối chiếu

- Google: [đếm token và usage](https://ai.google.dev/gemini-api/docs/tokens), [hạn mức API](https://ai.google.dev/gemini-api/docs/rate-limits), [ảnh inline trong generateContent](https://ai.google.dev/gemini-api/docs/generate-content/image-understanding), [giá model](https://ai.google.dev/gemini-api/docs/pricing).
