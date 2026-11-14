# Tiện ích dự án

- `admin/`: tạo hoặc gán quản trị viên, nhập dữ liệu tri thức vào SQLite. Các lệnh này có thể thay đổi dữ liệu trong `data/`.
- `generators/`: tạo DOCX hướng dẫn, PDF cẩm nang và danh sách cụm từ giao diện quản trị. Phụ thuộc Python cho các script tạo DOCX/PDF nằm trong `generators/requirements.txt`; script PDF hiện dùng font Tahoma ở `C:\Windows\Fonts`.
- `deployment/`: chuẩn bị bản sao dữ liệu SQLite và đóng gói tiện ích Gmail hoặc bản triển khai VPS. `prepare-server-data.py` đọc dữ liệu thật và tạo ZIP trong `data/`; các script đóng gói ghi ZIP vào `public/downloads/` hoặc `deploy/packages/`.
- `verification/`: kiểm tra chatbot, Gemini và dữ liệu tri thức. Các bài kiểm tra live cần cấu hình dịch vụ tương ứng.
- `archive/`: mã giao diện và script tích hợp/lập kế hoạch cũ để tham khảo; không dùng trong quy trình chạy hiện tại. `build_api_plan.mjs` là script tạo kế hoạch một lần, chứa giả định và đường dẫn máy cũ; không chạy lại trên dự án hiện tại.

Chạy lệnh từ thư mục gốc của dự án. Để tạo lại hướng dẫn Google/Facebook, chạy lần lượt:

```powershell
.venv\Scripts\python.exe scripts\generators\guide_google_oauth.py
.venv\Scripts\python.exe scripts\generators\update_google_oauth_doc.py
```

Hai script trên ghi tài liệu vào `docs/guides/`. Script `generate-handbook.py` ghi PDF vào `public/` vì website phục vụ file này trực tiếp. Script chuẩn bị dữ liệu trong `deployment/` đọc SQLite thật, vì vậy hãy sao lưu và kiểm tra đúng môi trường trước khi dùng.
