# Các bản SRS

## Bản ở thư mục chính

- `SRS_CyberAware_AI_Quy_trinh_theo_khung_v2.3.docx`: bản Word mới nhất của bộ SRS, đối chiếu mã nguồn tại commit `093c64b` ngày 12/11/2026; gồm 109 route API, 30 bảng dữ liệu, 40 test case, RTM từng mã yêu cầu và 28 use case.
- `SRS_CyberAware_AI_Quy_trinh_theo_khung_v2.3.pdf`: bản PDF xuất từ Word 2.3 để đọc và chia sẻ.

Tính năng Gmail được phát triển sau commit đối chiếu trên, nên SRS v2.3 **chưa mô tả đầy đủ trạng thái mã hiện tại**. Xem `deploy/GMAIL_TOOLS_DEPLOYMENT.md` và README của `browser-extension/`, `google-workspace-addon/` để biết phạm vi và cách triển khai hiện có. Khi chốt yêu cầu Gmail, cần tạo phiên bản SRS mới từ bản Word v2.3 và xuất PDF tương ứng; không sửa nội dung của v2.3 rồi giữ nguyên nhãn phiên bản.

## Bản lịch sử trong `archive/`

- `SRS_CyberAware_AI_Quy_trinh_theo_khung_v2.2.docx` và `.pdf`: bản 2.2.
- `SRS_CyberAware_AI_Quy_trinh_theo_khung_v2.1.docx` và `.pdf`: bản 2.1.
- `SRS_CyberAware_AI_Quy_trinh_theo_khung.docx` và `SRS_CyberAware_AI_Quy_trinh_theo_khung_final.pdf`: cặp bản 2.0.
- `SRS_CyberAware_AI.docx`: bản SRS cũ hơn để tham khảo.

Tên `final` trên PDF 2.0 là tên lịch sử, không chỉ bản mới nhất.
