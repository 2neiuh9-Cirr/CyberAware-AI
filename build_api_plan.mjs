import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
const bundledRequire = createRequire('C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/resolver.js');
const { FileBlob, SpreadsheetFile } = await import(pathToFileURL(bundledRequire.resolve('@oai/artifact-tool')).href);

const source = 'D:/6_VTI Academy/CyberAware AI/CyberAware_AI_Ke_hoach_tien_do_bo_sung.xlsx';
const outputDir = 'outputs/cyberaware-api-plan-20261029';
const outputPath = `${outputDir}/CyberAware_AI_Ke_hoach_tien_do_bo_sung.xlsx`;
const wb = await SpreadsheetFile.importXlsx(await FileBlob.load(source));
const set = (sheet, cell, value) => sheet.getRange(cell).values = [[value]];
const cv = wb.worksheets.getItem('Cong_viec');
const tq = wb.worksheets.getItem('Tong_quan');
const tl = wb.worksheets.getItem('Timeline');
const hd = wb.worksheets.getItem('Huong_dan');
const risk = wb.worksheets.getItem('Rui_ro_Van_de');
const weekly = wb.worksheets.getItem('Bao_cao_tuan');

// Align existing tasks with the supplied React/Express project and its actual UI flows.
const updates = {
  6: ['Rà soát và hoàn thiện UI/UX hiện có', 'Rà soát các màn hình React hiện có; bổ sung trạng thái rỗng, tải, lỗi và kết quả rủi ro thấp/vừa/cao; giữ thiết kế giao diện đã đạt yêu cầu.'],
  7: ['Thiết kế kiến trúc và hợp đồng API', 'Chốt hợp đồng JSON cho React ↔ Express/TypeScript ↔ SQLite ↔ Gemini; giữ các đường dẫn frontend đang gọi và quy ước lỗi chung.'],
  8: ['Thiết kế cơ sở dữ liệu SQLite', 'ERD cho người dùng/phiên, lần quét, báo cáo/bình chọn/kiểm duyệt, kịch bản, khóa học/bài học, câu hỏi và tiến độ học.'],
  9: ['Rà soát nền tảng frontend React hiện có', 'Xác nhận routing, layout, cấu hình môi trường và hướng dẫn chạy; không dựng lại các màn hình đã có.'],
  10: ['Hoàn thiện backend Express/TypeScript', 'Tách server.ts mẫu thành router/service/schema, cấu hình biến môi trường, SQLite và GET /api/health; giữ tương thích endpoint đang gọi.'],
  12: ['Rà soát trang chủ và điều hướng hiện có', 'Kiểm tra luồng trang chủ → quét, báo cáo cộng đồng, thư viện kịch bản và học tập; hoàn thiện liên kết và trạng thái lỗi.'],
  13: ['Hoàn thiện giao diện quét 4 loại dữ liệu', 'Đồng bộ URL/SMS/số điện thoại/tài khoản ngân hàng với POST /api/analyze; có giới hạn đầu vào, trạng thái tải/lỗi và hướng dẫn không nhập OTP.'],
  14: ['Hoàn thiện POST /api/analyze và bộ quy tắc', 'Nhận {type,query} với type=url|sms|phone|bank; chuẩn hóa URL/số điện thoại, giới hạn độ dài; trả ScanResult hiện có với mức độ và nguồn đánh giá.'],
  16: ['Hoàn thiện thẻ kết quả quét', 'Hiển thị riskScore, level, flags, recommendations, aiReasoning; khi API lỗi, không gắn nhãn kết quả giả lập là kết quả xác minh.'],
  17: ['Xây dựng API thư viện kịch bản', 'GET /api/scenarios và GET /api/scenarios/:id; hỗ trợ q/category và trả cấu trúc ScamScenario tương thích giao diện.'],
  18: ['Kết nối thư viện kịch bản hiện có', 'Thay dữ liệu SCAM_SCENARIOS tĩnh bằng API; giữ tìm kiếm, lọc, modal chi tiết và trạng thái không có kết quả.'],
  19: ['Xây dựng API câu hỏi và chấm quiz', 'GET bài học/quiz không trả đáp án đúng; POST bài làm để chấm, trả điểm và giải thích sau khi nộp.'],
  20: ['Kết nối quiz trong trang học tập', 'Lấy câu hỏi từ API, nộp đáp án và hiển thị kết quả; tránh chấm điểm và lưu hoàn thành chỉ ở trình duyệt.'],
  21: ['Xây dựng thống kê từ dữ liệu thật', 'GET /api/stats/overview và GET /api/me/stats; chỉ hiển thị số liệu có nguồn và thời gian cập nhật, không dùng tỷ lệ chính xác cố định.'],
  22: ['Tích hợp frontend với toàn bộ API MVP', 'Nối quét, xác thực, báo cáo, kịch bản, khóa học, quiz, tiến độ và thống kê; xử lý lỗi HTTP, tải/rỗng và phiên hết hạn.'],
  32: ['Thiết kế schema JSON kết quả phân tích', 'Giữ các trường ScanResult đang dùng: query,type,riskScore,level,title,flags,recommendations,scannedAt,analysisTimeMs; bổ sung id, confidence, source khi có dữ liệu.'],
  45: ['Tạo GET /api/health', 'Trả trạng thái ứng dụng và kết nối database ở mức an toàn; không lộ API key hay cấu hình nhạy cảm.'],
  50: ['Soạn 20–30 kịch bản lừa đảo mẫu', 'Bám cấu trúc ScamScenario hiện có: tình huống, dấu hiệu, tâm lý nạn nhân, lời khuyên và tin nhắn mẫu; dùng dữ liệu giả lập.'],
  51: ['Soạn tối thiểu 20 câu hỏi quiz', 'Gắn câu hỏi với khóa học/bài học hiện có; có phương án, đáp án và giải thích; không trả đáp án trước khi nộp.'],
  54: ['Lưu lịch sử quét và kết quả quiz', 'Lưu theo người dùng đã xác thực; GET /api/scans và tiến độ học có phân trang/trạng thái rỗng; không lưu bí mật hoặc OTP.'],
  55: ['Tính thống kê cá nhân và cộng đồng', 'Tổng hợp số lần quét, báo cáo xác minh, điểm quiz theo chủ đề; tránh chỉ số chưa có nguồn kiểm chứng.'],
  56: ['Kết nối thẻ thống kê hiện có', 'Thay số liệu minh họa bằng GET /api/stats/overview và GET /api/me/stats; hiển thị thời điểm cập nhật và trạng thái rỗng.'],
};
for (const [row, [title, description]] of Object.entries(updates)) {
  set(cv, `B${row}`, title);
  set(cv, `C${row}`, description);
}

const newTasks = [
  ['TASK-066','Thiết kế xác thực và phiên đăng nhập','Lưu user, hash mật khẩu và phiên/token hợp lệ; ràng buộc quyền truy cập, giới hạn thử đăng nhập.','Backend','TASK-007; TASK-009','Cao',10,'MVP'],
  ['TASK-067','Hoàn thiện API đăng ký, đăng nhập và hồ sơ','POST /api/auth/register, POST /api/auth/login, GET /api/me, POST /api/auth/logout; phản hồi User tương thích frontend.','Backend','TASK-066','Cao',10,'MVP'],
  ['TASK-068','Hoàn thiện API khôi phục mật khẩu','POST /api/auth/forgot-password tạo token hết hạn/gửi email; POST /api/auth/reset-password kiểm tra token và cập nhật hash.','Backend','TASK-066','Cao',8,'MVP'],
  ['TASK-069','Xây dựng API báo cáo cộng đồng','GET /api/reports có lọc/phân trang; GET /api/reports/:id; POST /api/report tương thích frontend, lưu báo cáo ở trạng thái chờ duyệt.','Backend','TASK-010','Cao',10,'MVP'],
  ['TASK-070','Xây dựng bình chọn và kiểm duyệt báo cáo','POST /api/reports/:id/votes chống bình chọn lặp; PATCH /api/admin/reports/:id/status giới hạn cho quản trị viên.','Backend','TASK-067; TASK-069','Trung bình',8,'MVP'],
  ['TASK-071','Lưu kết quả quét và cung cấp lịch sử','GET /api/scans, GET /api/scans/:id; lưu kết quả theo người dùng, phân trang và giới hạn dữ liệu nhạy cảm.','Backend','TASK-013; TASK-066','Cao',7,'MVP'],
  ['TASK-072','Xây dựng API khóa học và bài học','GET /api/courses, GET /api/courses/:id, GET /api/courses/:id/lessons/:lessonId; trả Course/CourseLesson phù hợp giao diện hiện có.','Backend','TASK-010','Cao',8,'MVP'],
  ['TASK-073','Xây dựng API tiến độ học','GET /api/me/learning-progress và PUT /api/me/learning-progress/:courseId; chỉ đánh dấu hoàn thành khi đạt điều kiện bài học/quiz.','Backend','TASK-067; TASK-072; TASK-018','Trung bình',7,'MVP'],
  ['TASK-074','Kết nối frontend với API tài khoản/báo cáo','Nạp /api/me và /api/reports; gửi báo cáo/bình chọn qua API; bỏ đăng nhập thành công giả và báo cáo cục bộ khi lỗi mạng.','Tích hợp','TASK-067; TASK-068; TASK-069; TASK-070','Cao',10,'MVP'],
  ['TASK-075','Kết nối frontend với API học tập và lịch sử','Thay COURSES và completedCourseIds cục bộ bằng API; hiển thị lịch sử quét, tiến độ và trạng thái rỗng.','Tích hợp','TASK-071; TASK-072; TASK-073','Cao',8,'MVP'],
  ['TASK-076','Hoàn thiện quét QR tại trình duyệt','Giải mã ảnh QR phía client, kiểm tra nội dung rồi gửi URL/chuỗi vào POST /api/analyze; giới hạn loại và dung lượng ảnh.','Frontend','TASK-012; TASK-013','Trung bình',5,'Sau MVP'],
  ['TASK-077','Kiểm thử hợp đồng API và quyền truy cập','Kiểm tra request/response cho bốn loại quét, auth, báo cáo, vote, khóa học, quiz, lịch sử và thống kê; kiểm tra 400/401/403/404/429.','Kiểm thử','TASK-067; TASK-069; TASK-071; TASK-072; TASK-073','Cao',8,'MVP'],
];
let row = 67;
for (const [id, title, description, group, depends, priority, hours, phase] of newTasks) {
  const values = [id,title,description,group,depends,group==='Frontend'?'Thành viên 1':'Thành viên 2','Cả nhóm',null,null,null,priority,'Chưa bắt đầu',0,hours,0,null,null,`Phạm vi: ${phase}; ngày KH cần nhóm chốt sau khi rà soát năng lực.`];
  cv.getRange(`A${row}:R${row}`).values = [values];
  cv.getRange(`P${row}`).formulas = [[`=IF(OR(A${row}="",J${row}=""),"",J${row}-I${row})`]];
  row++;
}
cv.getRange('A67:R78').format.wrapText = true;
cv.getRange('A67:R78').format.rowHeight = 56;
cv.getRange('A67:R78').format.verticalAlignment = 'center';

// Clarify scope and replace planning assumptions that contradict the codebase.
set(tq,'B4','MVP: quét URL/SMS/số điện thoại/tài khoản ngân hàng; báo cáo cộng đồng; thư viện kịch bản; khóa học/quiz; tài khoản và tiến độ. Frontend React đã có; hoàn thiện Express API, SQLite và tích hợp dữ liệu thật.');
set(tq,'B13','Rủi ro chính: server hiện là bản mẫu trong RAM; đăng nhập/khôi phục mật khẩu chưa xác thực thật; một số trang dùng mockData; AI có thể sai và hạn mức gọi. Ưu tiên hợp đồng API, dữ liệu bền vững, an toàn tài khoản và kiểm thử theo mẫu.');
set(tq,'B14',new Date('2026-10-29T00:00:00'));
set(tl,'C4','Rà soát frontend React hiện có, kiến trúc Express/TypeScript–SQLite–AI, hợp đồng API và ERD');
set(tl,'C5','Hoàn thiện Express backend, database, xác thực và seed dữ liệu; rà soát frontend hiện có');
set(tl,'C7','API báo cáo, thư viện kịch bản, khóa học/quiz, lịch sử quét, tiến độ học và thống kê');
set(tl,'C8','Kết nối các trang hiện có với API thật; xử lý phiên, tải, lỗi và dữ liệu rỗng');
set(hd,'B12','TASK-031 đến TASK-065 chi tiết hóa AI, dữ liệu, kiểm thử. TASK-066 đến TASK-077 bổ sung xác thực, báo cáo, lịch sử quét, khóa học/tiến độ và tích hợp. Các task mới chưa có ngày KH; nhóm cần chốt lịch trước khi tính tiến độ.');
set(risk,'I4','Chốt API MVP theo mức ưu tiên; tái sử dụng frontend React/Express mẫu; đặt lịch cho TASK-066 đến TASK-077 trước khi cam kết mốc bàn giao.');
set(weekly,'C2','Rà soát frontend hiện có, chốt hợp đồng API React–Express, ERD SQLite, luồng xác thực và báo cáo cộng đồng.');
set(weekly,'G2','Hoàn thiện Express backend, database, đăng nhập và báo cáo; kiểm tra health endpoint và seed dữ liệu mẫu.');
set(weekly,'C3','API phân tích, xác thực, báo cáo; bộ quy tắc, AI, chuẩn JSON, timeout và fallback.');
set(weekly,'C4','Tích hợp frontend/API; thư viện, khóa học/quiz, lịch sử quét, tiến độ học và thống kê; rà soát quyền riêng tư.');

const api = wb.worksheets.add('Danh_muc_API');
api.showGridLines = false;
api.getRange('A1:J1').values = [['Nhóm','Phương thức','Endpoint','Mục đích / giao diện sử dụng','Request chính','Response chính','Quyền truy cập','Ưu tiên','Task phụ trách','Tình trạng mã hiện tại']];
const apiRows = [
  ['Hệ thống','GET','/api/health','Kiểm tra server và database','—','status, timestamp','Công khai','MVP','TASK-044','Chưa có'],
  ['Phân tích','POST','/api/analyze','Quét trên Home/Scanner','type=url|sms|phone|bank; query','ScanResult: riskScore, level, flags, recommendations, scannedAt','Công khai; giới hạn lượt','MVP','TASK-013; TASK-032','Có bản mẫu; chưa lưu'],
  ['Phân tích','GET','/api/scans','Lịch sử quét cá nhân','limit, cursor','items, nextCursor','Đăng nhập','MVP','TASK-071','Chưa có'],
  ['Phân tích','GET','/api/scans/:id','Xem lại kết quả quét','scanId','ScanResult','Chủ sở hữu','MVP','TASK-071','Chưa có'],
  ['Báo cáo','GET','/api/reports','Danh sách/lọc báo cáo cộng đồng','type, q, status, page, pageSize','items, total, page','Công khai','MVP','TASK-069','Có server; frontend chưa gọi'],
  ['Báo cáo','GET','/api/reports/:id','Chi tiết báo cáo','reportId','ScamReport, status, createdAt','Công khai nếu đã duyệt','MVP','TASK-069','Chưa có'],
  ['Báo cáo','POST','/api/report','Gửi báo cáo từ modal hiện có','type, target, category, description','report, status=pending','Đăng nhập hoặc giới hạn lượt','MVP','TASK-069','Có bản mẫu trong RAM'],
  ['Báo cáo','POST','/api/reports/:id/votes','Bình chọn báo cáo','reportId','votes, votedByMe','Đăng nhập','MVP','TASK-070','Chỉ tăng số ở frontend'],
  ['Báo cáo','PATCH','/api/admin/reports/:id/status','Duyệt/từ chối báo cáo','status, reason','report, status','Quản trị viên','MVP','TASK-070','Chưa có'],
  ['Tài khoản','POST','/api/auth/register','Đăng ký','fullname, email, password','user, session/token','Công khai','MVP','TASK-067','Có bản mẫu; không lưu mật khẩu'],
  ['Tài khoản','POST','/api/auth/login','Đăng nhập','email, password','user, session/token','Công khai','MVP','TASK-067','Có bản mẫu; không kiểm tra mật khẩu'],
  ['Tài khoản','POST','/api/auth/logout','Đăng xuất phiên','session/token','success','Đăng nhập','MVP','TASK-067','Chưa có'],
  ['Tài khoản','GET','/api/me','Lấy hồ sơ/khôi phục phiên','—','User','Đăng nhập','MVP','TASK-067','Chưa có'],
  ['Tài khoản','POST','/api/auth/forgot-password','Yêu cầu liên kết đặt lại mật khẩu','email','message chung','Công khai; giới hạn lượt','MVP','TASK-068','Có bản mẫu; chưa gửi email'],
  ['Tài khoản','POST','/api/auth/reset-password','Đặt lại mật khẩu','token, newPassword','success','Token hợp lệ','MVP','TASK-068','Có bản mẫu; không kiểm tra token'],
  ['Kịch bản','GET','/api/scenarios','Danh sách/tìm kiếm kịch bản','q, category, page','items, total','Công khai','MVP','TASK-016','Dữ liệu trong mockData.ts'],
  ['Kịch bản','GET','/api/scenarios/:id','Chi tiết kịch bản/modal','scenarioId','ScamScenario','Công khai','MVP','TASK-016','Dữ liệu trong mockData.ts'],
  ['Học tập','GET','/api/courses','Danh sách khóa học','category, q, page','items, total','Công khai','MVP','TASK-072','Dữ liệu trong mockData.ts'],
  ['Học tập','GET','/api/courses/:id','Chi tiết khóa học','courseId','Course, modules','Công khai','MVP','TASK-072','Chưa có'],
  ['Học tập','GET','/api/courses/:id/lessons/:lessonId','Nội dung bài học/quiz','courseId, lessonId','lesson; quiz không lộ đáp án','Công khai','MVP','TASK-072; TASK-018','Chưa có'],
  ['Học tập','POST','/api/quizzes/:id/submissions','Nộp quiz và chấm điểm','answers[]','score, correctCount, explanations','Đăng nhập hoặc phiên demo','MVP','TASK-018','Frontend chấm cục bộ'],
  ['Học tập','GET','/api/me/learning-progress','Tiến độ học cá nhân','—','completedCourseIds, lessonProgress','Đăng nhập','MVP','TASK-073','Chỉ lưu ở frontend'],
  ['Học tập','PUT','/api/me/learning-progress/:courseId','Cập nhật hoàn thành khóa học','courseId, lessonId, completion','progress','Đăng nhập','MVP','TASK-073','Chỉ lưu ở frontend'],
  ['Thống kê','GET','/api/stats/overview','Số liệu cộng đồng trên trang chủ','—','totalScans, verifiedReports, updatedAt','Công khai','MVP','TASK-020; TASK-054','Chưa có nguồn dữ liệu thật'],
  ['Thống kê','GET','/api/me/stats','Thống kê quét và quiz cá nhân','—','scanCount, quizScores, weakTopics','Đăng nhập','MVP','TASK-020; TASK-054','Chưa có'],
];
api.getRange(`A2:J${apiRows.length+1}`).values = apiRows;
api.getRange(`A1:J${apiRows.length+1}`).format.font = {name:'Arial',size:10};
api.getRange('A1:J1').format = {fill:'#17365D',font:{name:'Arial',size:10,bold:true,color:'#FFFFFF'},wrapText:true};
api.getRange('A1:J1').format.rowHeight = 34;
api.getRange(`A2:J${apiRows.length+1}`).format.wrapText = true;
api.getRange(`A2:J${apiRows.length+1}`).format.rowHeight = 46;
api.getRange(`A1:J${apiRows.length+1}`).format.verticalAlignment = 'center';
for (const [col,width] of Object.entries({A:16,B:13,C:38,D:37,E:37,F:42,G:27,H:13,I:23,J:33})) api.getRange(`${col}:${col}`).format.columnWidth = width;
api.freezePanes.freezeRows(1);

wb.recalculate();
console.log((await wb.inspect({kind:'table',range:'Danh_muc_API!A1:J6',include:'values',tableMaxRows:6,tableMaxCols:10,maxChars:2200})).ndjson);
await fs.mkdir(outputDir,{recursive:true});
const preview = await wb.render({sheetName:'Danh_muc_API',range:'A1:J10',scale:1,format:'png'});
await fs.writeFile(`${outputDir}/api_preview.png`,new Uint8Array(await preview.arrayBuffer()));
const out = await SpreadsheetFile.exportXlsx(wb);
await out.save(outputPath);
console.log(`SAVED ${outputPath} API_ROWS ${apiRows.length} TASK_ROWS ${newTasks.length}`);
