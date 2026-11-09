import fs from 'node:fs';
const change = (file, replacements) => { let source = fs.readFileSync(file, 'utf8'); for (const [from,to] of replacements) { if (!source.includes(from)) throw new Error(`Missing replacement in ${file}: ${from}`); source = source.replaceAll(from,to); } fs.writeFileSync(file,source); };
change('src/modules/scanner/ScannerPage.tsx', [
 ['Hệ thống đối chiếu dữ liệu thời gian thực với hơn 100.000 tên miền độc hại, số điện thoại spam và tài khoản ngân hàng đen được ghi nhận bởi NCSC và cộng đồng.', 'Kiểm tra dấu hiệu bằng bộ quy tắc và báo cáo đã được quản trị viên duyệt. Không xác minh chủ tài khoản ngân hàng, thuê bao hoặc kết luận an toàn.'],
 ['Báo cáo link này cho cơ quan chức năng','Gửi báo cáo tới quản trị viên CyberAware'],
 ['    </div>\n  );', '      <ScanHistory />\n    </div>\n  );'],
 ['rows={4}', 'rows={4} maxLength={5000} aria-label="Nội dung tin nhắn"'],
 ['type="text"', 'type="text" maxLength={activeTab === \'url\' ? 2048 : 200} aria-label="Nội dung cần kiểm tra"'],
 ['{scanResult && (','{scanResult && ('],
 ['{/* AI Reasoning */}', '<p className="text-xs text-slate-500">Nguồn: {scanResult.source} • AI: {scanResult.aiStatus === \'available\' ? \'Đã bổ sung giải thích\' : scanResult.aiStatus === \'unavailable\' ? \'Tạm không khả dụng, dùng bộ quy tắc\' : \'Chưa cấu hình\'}. Điểm rủi ro không phải xác suất lừa đảo.</p>'],
]);
change('src/components/common/RiskGauge.tsx', [['AN TOÀN CAO','ÍT DẤU HIỆU'],['{score}%','{score}/100']]);
change('src/modules/home/HomePage.tsx', [
 ['CÔNG CỤ THẨM ĐỊNH AI SỐ 1 VIỆT NAM','CÔNG CỤ NHẬN DIỆN DẤU HIỆU LỪA ĐẢO'],
 ['ĐỘNG CƠ THẨM ĐỊNH AI: ĐANG TRỰC NHẬT','KIỂM TRA DẤU HIỆU RỦI RO'],
 ['CHUẨN AN TOÀN NCSC 2026','KẾT QUẢ THAM KHẢO'],
 ['Đang phân tích AI...','Đang phân tích...'],
 ['CyberAware AI cam kết bảo vệ dữ liệu cá nhân, không chia sẻ thông tin tra cứu.','Không nhập OTP/mật khẩu. Lịch sử được lưu khi đăng nhập; nếu bật Gemini, nội dung đã che mẫu bí mật được gửi đến Gemini để giải thích.'],
 ['Cập nhật blacklist NCSC 2026','Nguồn: {scanResult.source} • AI: {scanResult.aiStatus}'],
]);
change('src/components/cyber/CyberScanningOverlay.tsx', [['AI ĐANG PHÂN TÍCH ĐA TẦNG THỜI GIAN THỰC','ĐANG KIỂM TRA DẤU HIỆU RỦI RO'],['ĐỘ TRỄ: ~0.24s','ĐANG XỬ LÝ'],['Bóc tách tên miền &amp; chứng chỉ SSL','Phân tích cấu trúc đầu vào'],['Đối chiếu cơ sở dữ liệu Blacklist NCSC','Đối chiếu báo cáo CyberAware đã duyệt']]);
change('src/components/cyber/DeepfakeWaveformVisualizer.tsx', [['PHÂN TÍCH PHỔ TẦN SỐ GIỌNG NÓI','MINH HỌA SÓNG ÂM • KHÔNG PHẢI BỘ PHÁT HIỆN']]);
change('src/modules/about/AboutPage.tsx', [['Kết hợp mô hình ngôn ngữ lớn (Gemini AI) với cơ chế phân tích cú pháp tĩnh, quét đồ thị liên kết và đối chiếu danh sách đen thời gian thực từ cơ quan an ninh mạng.','Kết hợp bộ quy tắc phân tích đầu vào và báo cáo cộng đồng đã duyệt. Gemini có thể bổ sung giải thích khi được cấu hình. Hệ thống chưa kết nối danh sách đen của cơ quan chức năng.'], ['Hàng chục nghìn lượt đóng góp cảnh báo mỗi tuần từ người dân trên cả nước giúp cập nhật các thủ đoạn mới xuất hiện trong vòng vài phút.','Báo cáo được lưu và chuyển tới quản trị viên kiểm duyệt trước khi công khai. Số liệu trên trang chủ được tính từ hoạt động thực tế của ứng dụng.']]);
change('src/components/layout/Footer.tsx', [['Miễn trừ trách nhiệm: Hệ thống cung cấp chỉ số rủi ro tham khảo dựa trên mô hình máy học và dữ liệu phân tích công khai từ NCSC & cộng đồng.','Hệ thống cung cấp điểm rủi ro tham khảo từ bộ quy tắc và báo cáo CyberAware đã duyệt; chưa kết nối cơ sở dữ liệu NCSC.']]);
const pkg = JSON.parse(fs.readFileSync('package.json','utf8'));
pkg.scripts.test = 'tsx --test tests/api.test.ts';
pkg.scripts['test:auth'] = 'tsx auth-smoke.ts';
pkg.scripts.admin = 'tsx scripts/set-admin.ts';
pkg.scripts.clean = 'node -e "require(\'node:fs\').rmSync(\'dist\',{recursive:true,force:true})"';
fs.writeFileSync('package.json',JSON.stringify(pkg,null,2)+'\n');
