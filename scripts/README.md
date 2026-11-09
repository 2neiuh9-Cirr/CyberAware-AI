# Tiện ích dự án

- `admin/`: tạo hoặc gán quản trị viên, nhập dữ liệu tri thức vào SQLite. Các lệnh này có thể thay đổi dữ liệu trong `data/`.
- `generators/`: tạo DOCX hướng dẫn, PDF cẩm nang và danh sách cụm từ giao diện quản trị. Thư viện Python cần thiết nằm trong `generators/requirements.txt`.
- `verification/`: kiểm tra chatbot, Gemini và dữ liệu tri thức. Các bài kiểm tra live cần cấu hình dịch vụ tương ứng.
- `archive/`: mã giao diện và script tích hợp cũ để tham khảo; không dùng trong quy trình chạy hiện tại.

Chạy lệnh từ thư mục gốc của dự án. Để tạo lại hướng dẫn Google/Facebook, chạy lần lượt:

```powershell
.venv\Scripts\python.exe scripts\generators\guide_google_oauth.py
.venv\Scripts\python.exe scripts\generators\update_google_oauth_doc.py
```

Hai script trên ghi tài liệu vào `docs/guides/`. Script `generate-handbook.py` ghi PDF vào `public/` vì website phục vụ file này trực tiếp.
