import type { SiteLanguage } from './sitePreferences';
import { prepareBrowserTranslator, translatedText, translateVisibleTexts } from './siteTranslationService';

// Known UI labels translate instantly. Other visible text is translated in
// batches, with private content restricted to the browser's local translator.
const english: Record<string, string> = {
  'Nhận diện & phòng tránh lừa đảo trực tuyến với': 'Detect and prevent online scams with',
  'Bảo vệ bản thân và gia đình trước các đường dẫn độc hại, tin nhắn lừa đảo mạo danh ngân hàng số, giả mạo sàn thương mại điện tử và thủ đoạn thao túng tâm lý tinh vi.': 'Protect yourself and your family from malicious links, impersonation messages and online scam tactics.',
  'CÔNG CỤ NHẬN DIỆN DẤU HIỆU LỪA ĐẢO': 'SCAM WARNING SIGN CHECKER',
  'Kiểm tra nhanh': 'Quick check',
  'Kết quả đánh giá chỉ mang tính tham khảo. Không nhập mật khẩu, OTP hoặc thông tin bí mật.': 'Assessments are advisory. Do not enter passwords, OTPs or other secrets.',
  'RADAR THẨM ĐỊNH THỜI GIAN THỰC': 'REAL-TIME RISK RADAR',
  'Lá chắn AI Chủ động': 'Proactive AI shield',
  'Chống Phishing': 'Phishing protection',
  'Bảo vệ thời gian thực': 'Real-time protection',
  'Quét Deepfake AI': 'AI deepfake detection',
  'Phân tích khẩu hình & giọng nói': 'Lip and voice analysis',
  'Bảo vệ Smart OTP': 'Smart OTP protection',
  'Chặn mạo danh ngân hàng số': 'Detect digital bank impersonation',
  'Cập nhật tự động 2026': 'Updated automatically in 2026',
  'Nhận diện dấu hiệu từ URL hoặc tin nhắn.': 'Identify warning signs in URLs or messages.',
  'Kết quả tham khảo': 'Advisory result',
  'Kiểm tra đường dẫn': 'Check a URL',
  'Kiểm tra tin nhắn': 'Check a message',
  'Số điện thoại': 'Phone number',
  'Tài khoản ngân hàng': 'Bank account',
  'Kiểm tra ngay': 'Check now',
  'Đang phân tích...': 'Analyzing...',
  'Mẫu thử nhanh': 'Try an example',
  'Không nhập OTP/mật khẩu. Lịch sử được lưu khi đăng nhập; nếu bật Gemini, nội dung sau bước che một số mẫu bí mật được gửi để giải thích.': 'Do not enter OTPs or passwords. Signed-in scans are saved; if Gemini is enabled, partially redacted content is sent for an explanation.',
  'Lưu lịch sử khi đăng nhập': 'History saved when signed in',
  'Nếu đăng nhập, nội dung kiểm tra và kết quả được lưu vào lịch sử tài khoản. Không nhập mật khẩu, OTP hoặc thông tin bí mật.': 'When signed in, scans and results are saved to your account. Do not enter passwords, OTPs or secrets.',
  'Mục tiêu tra cứu:': 'Checked content:',
  'Nhận định AI chuyên sâu:': 'Additional AI assessment:',
  'Cảnh báo công khai có thủ đoạn tương đồng': 'Public warnings with similar tactics',
  'Tương đồng về thủ đoạn không xác nhận đối tượng cụ thể nằm trong danh sách đen.': 'Similar tactics do not confirm that this specific target is on a blocklist.',
  'Dấu hiệu rủi ro nhận diện': 'Detected warning signs',
  'Khuyến nghị an toàn tức thời': 'Recommended actions',
  'Gửi báo cáo': 'Submit a report',
  'Đóng': 'Close',
  'HỆ THỐNG THẨM ĐỊNH ĐA TẦNG AI': 'MULTI-SIGNAL SCAM CHECK',
  'Kiểm tra & Xác minh lừa đảo trực tuyến': 'Check online scam warning signs',
  'Kiểm tra dấu hiệu bằng bộ quy tắc và báo cáo đã được quản trị viên duyệt. Không xác minh chủ tài khoản ngân hàng, thuê bao hoặc kết luận an toàn.': 'Check warning signs using rules and reviewed reports. This does not verify bank or phone ownership or confirm safety.',
  'Bắt đầu kiểm tra': 'Start a check',
  'Chọn loại nội dung và nhập thông tin cần phân tích.': 'Choose a content type and enter what you want to check.',
  'Website / URL': 'Website / URL',
  'Tin nhắn SMS / Chat': 'SMS / chat message',
  'Nhập đường dẫn liên kết cần kiểm tra': 'ENTER A URL TO CHECK',
  'Dán nội dung tin nhắn hoặc email khả nghi': 'PASTE A SUSPICIOUS MESSAGE OR EMAIL',
  'Nhập số điện thoại gọi đến': 'ENTER THE CALLER’S PHONE NUMBER',
  'Nhập số tài khoản ngân hàng & tên chủ tài khoản': 'ENTER THE BANK ACCOUNT AND ACCOUNT NAME',
  'Phân tích': 'Analyze',
  'Phân tích tin nhắn này': 'Analyze this message',
  'Đang quét...': 'Checking...',
  'Kết quả kiểm tra': 'Check result',
  'Nguồn:': 'Source:',
  'Phân tích bổ sung của AI:': 'Additional AI analysis:',
  'Đây là sự tương đồng về thủ đoạn, không xác nhận rằng nội dung/đối tượng cụ thể nằm trong danh sách đen.': 'Similar tactics do not confirm that this specific content or target is on a blocklist.',
  'Căn cứ đánh giá': 'Assessment basis',
  'Có báo cáo cộng đồng đã duyệt': 'Reviewed community report',
  'Bộ quy tắc CyberAware': 'CyberAware rules',
  'Loại dấu hiệu': 'Warning sign type',
  'Chỉ số tin cậy': 'Advisory score',
  'Xem chi tiết dấu hiệu bên dưới': 'Review the signs below',
  'Chưa thấy dấu hiệu nổi bật': 'No prominent signs found',
  'Hướng dẫn hành động khuyên nghị': 'Recommended next steps',
  'Gửi báo cáo tới quản trị viên CyberAware': 'Report to CyberAware moderators',
  'Xóa kết quả': 'Clear result',
  'Dữ liệu bạn cung cấp': 'Your input',
  'Đường dẫn hoặc nội dung tin nhắn cần kiểm tra': 'A URL or message to check',
  'Đối chiếu dấu hiệu': 'Compare warning signs',
  'Bộ quy tắc và cảnh báo đã được duyệt': 'Rules and reviewed warnings',
  'AI hỗ trợ': 'AI assistance',
  'URL & SMS khi khả dụng': 'URLs & SMS when available',
  'Kết quả có căn cứ': 'Evidence-based result',
  'Điểm tham khảo, dấu hiệu và khuyến nghị': 'Advisory score, signs and guidance',
  'Quy trình kiểm tra của CyberAware': 'How CyberAware checks content',
  'QUY TRÌNH VẬN HÀNH TỰ ĐỘNG': 'AUTOMATED CHECK PROCESS',
  'Quy trình thẩm định chỉ trong 3 bước': 'A check in just 3 steps',
  'Hệ thống dùng bộ quy tắc nhận diện và báo cáo cộng đồng đã duyệt; Gemini có thể bổ sung giải thích khi được cấu hình.': 'The system uses detection rules and reviewed community reports. Gemini may add an explanation when configured.',
  'BƯỚC 01 // TIẾP NHẬN': 'STEP 01 // INPUT',
  'Dán đường dẫn hoặc tin nhắn': 'Paste a link or message',
  'Nhập liên kết đáng ngờ, số điện thoại lạ hoặc đoạn văn bản tin nhắn yêu cầu mã OTP, thông báo nhận tiền trúng thưởng.': 'Enter a suspicious link, unfamiliar phone number or message requesting an OTP or claiming a prize.',
  'Trải nghiệm thử': 'Try it',
  'BƯỚC 02 // PHÂN TÍCH RỦI RO': 'STEP 02 // RISK ANALYSIS',
  'Phân tích dấu hiệu': 'Analyze warning signs',
  'Bộ quy tắc nhận diện dấu hiệu đáng ngờ và đối chiếu báo cáo cộng đồng đã duyệt. Kết quả chỉ mang tính tham khảo.': 'Rules detect suspicious signs and compare them with reviewed community reports. Results are advisory.',
  'Xem cách AI hoạt động': 'See how the AI works',
  'BƯỚC 03 // BẢO VỆ': 'STEP 03 // PROTECTION',
  'Nhận khuyến nghị bảo vệ': 'Get safety guidance',
  'Cảnh báo mức độ rủi ro, phân tích chi tiết thủ đoạn và hướng dẫn hành động cụ thể để bảo vệ tài sản, thông tin cá nhân.': 'Review risk levels, scam tactics and concrete steps to protect your money and personal information.',
  'Mẫu báo cáo': 'Sample reports',
  'MÔ PHỎNG TƯƠNG TÁC': 'INTERACTIVE DEMO',
  'Khám phá cách CyberAware AI nhận diện dấu hiệu lừa đảo': 'See how CyberAware AI spots scam warning signs',
  'Chọn một tình huống mẫu để xem các dấu hiệu đáng ngờ và cách xử lý an toàn. Đây là nội dung minh họa; kết quả kiểm tra thật được tạo tại trang thẩm định.': 'Choose a sample scenario to see warning signs and safe responses. This is a demo; real results come from the check page.',
  'Mô phỏng': 'Demo',
  'RẤT NGUY HIỂM': 'VERY HIGH RISK',
  'Điểm minh họa:': 'Sample score:',
  'MỤC TIÊU ĐANG THẨM ĐỊNH:': 'CONTENT BEING CHECKED:',
  'Ví dụ mô phỏng, không phải kết quả quét thật': 'Sample only, not a real scan result',
  'Gợi ý an toàn:': 'Safety tip:',
  'Dừng thao tác': 'Stop',
  'và không chia sẻ mã OTP cho bất kỳ ai.': 'and do not share your OTP with anyone.',
  'Dữ liệu tình huống mẫu': 'Sample scenario data',
  'Giao diện minh họa': 'Illustrative interface',
  'Tình huống giả lập': 'Simulated scenario',
  'Các thông tin hiển thị là ví dụ, không phải kết quả tra cứu trực tiếp.': 'The information shown is an example, not a live lookup result.',
  'Dữ liệu minh họa': 'Illustrative data',
  'Không hiển thị danh sách số điện thoại, tài khoản hoặc website đang bị cảnh báo.': 'This does not display a live list of flagged phone numbers, accounts or websites.',
  'Nguy cơ lộ OTP': 'OTP exposure risk',
  'Chế độ': 'Mode',
  'mô phỏng': 'demo',
  'DẤU HIỆU TRONG TÌNH HUỐNG MẪU': 'WARNING SIGNS IN THE SAMPLE',
  'Biện pháp phòng ngừa khuyến nghị:': 'Recommended precautions:',
  'Thẩm định ngay nội dung của bạn': 'Check your own content',
  'Xem thư viện cảnh báo': 'Browse scam warnings',
  'CẢNH BÁO THƯỜNG TRỰC': 'ONGOING WARNINGS',
  'Các hình thức lừa đảo phổ biến cần cảnh giác': 'Common scams to watch for',
  'Các thủ đoạn tội phạm mạng liên tục thay đổi hình thức tiếp cận, nắm vững các dấu hiệu mấu chốt để không rơi vào cạm bẫy.': 'Scam tactics keep changing. Learn the key warning signs so you can stay alert.',
  'Xem biểu đồ cảnh báo dữ liệu toàn quốc': 'Explore scam warnings',
  'DẤU HIỆU NHẬN DIỆN:': 'WARNING SIGNS:',
  'Xem chi tiết kịch bản': 'View scenario',
  'TIN TỨC & CẢNH BÁO': 'NEWS & WARNINGS',
  'Cập nhật An toàn mạng': 'Online safety updates',
  'Xem tất cả tin tức': 'View all news',
  'Xu hướng Lừa đảo': 'Scam trends',
  'Cảnh báo Khẩn cấp': 'Urgent warnings',
  'TRỢ LÝ AI CYBERAWARE': 'CYBERAWARE AI ASSISTANT',
  'Trợ lý AI chống lừa đảo 24/7': '24/7 scam prevention assistant',
  'Hỏi về tin nhắn, đường dẫn hoặc ảnh chụp đáng ngờ. CyberAware AI giúp bạn nhận diện dấu hiệu rủi ro và gợi ý những bước tự bảo vệ phù hợp.': 'Ask about suspicious messages, links or screenshots. CyberAware AI helps identify risk signals and suggests protective steps.',
  'Hỏi đáp tự nhiên': 'Natural conversation',
  'Gợi ý bước tiếp theo': 'Suggested next steps',
  'Chat với AI miễn phí': 'Chat with AI',
  'Xem demo': 'Watch demo',
  'AI có thể mắc sai sót. Hãy kiểm chứng thông tin quan trọng và không gửi OTP, mật khẩu.': 'AI can make mistakes. Verify important information and never send OTPs or passwords.',
  'KHÓA HỌC TIÊU BIỂU': 'FEATURED COURSES',
  'Góc học tập kỹ năng tự vệ số CyberAware': 'CyberAware digital safety learning',
  'Khám phá khóa học': 'Explore courses',
  'Tải cẩm nang an toàn PDF': 'Download the safety PDF',
  'BÀI HỌC TUẦN NÀY': 'THIS WEEK’S LESSON',
  'MỚI CẬP NHẬT': 'NEW',
  'Bạn vừa phát hiện một đường link hoặc số điện thoại lừa đảo mới?': 'Found a new suspicious link or phone number?',
  'Hãy gửi báo cáo cho CyberAware AI để hỗ trợ cộng đồng ngăn chặn kịp thời các mối đe dọa.': 'Report it to CyberAware AI to help the community spot threats sooner.',
  'Báo cáo lừa đảo ngay': 'Report a scam',
  'Kết quả giúp nhận diện dấu hiệu rủi ro; không xác nhận một đối tượng là an toàn hay đã lừa đảo.': 'Results identify warning signs; they do not confirm that a target is safe or fraudulent.',
  'Lịch sử quét của tôi': 'My scan history',
  'Xem lại nội dung và phân tích lại khi cần.': 'Review and recheck previous content.',
  'Đăng nhập': 'Sign in',
  'Đăng xuất': 'Sign out',
  'Đăng ký': 'Register',
  'để lưu và xem lại kết quả quét.': 'to save and review scan results.',
  'Chọn một mục để điền vào ô kiểm tra và phân tích lại. Mỗi trang hiển thị tối đa 10 mục.': 'Select an item to check it again. Each page shows up to 10 items.',
  'Chưa có lịch sử quét.': 'No scan history yet.',
  'Đang tải lịch sử…': 'Loading history…',
  'Trước': 'Previous',
  'Sau': 'Next',
  'BƯỚC 01': 'STEP 01',
  'BƯỚC 02': 'STEP 02',
  'BƯỚC 03': 'STEP 03',
  'Mở trợ lý AI': 'Open AI assistant',
  'Đăng nhập tài khoản': 'Sign in to your account',
  'Ảnh đại diện': 'Profile photo',
  'Mở menu điều hướng': 'Open navigation menu',
  'Đóng menu': 'Close navigation menu',
  'Tính năng đang phát triển': 'Feature in development',
  'Đã hiểu': 'Got it',
  'Trang xem tất cả tin tức sẽ sớm ra mắt.': 'The all-news page is coming soon.',
  'Nền tảng trí tuệ nhân tạo hỗ trợ xác minh rủi ro, phát hiện lừa đảo trực tuyến và phổ biến kiến thức an toàn số cho cộng đồng người Việt.': 'An AI-assisted platform for checking risk signals, detecting online scams and sharing digital safety knowledge.',
  'Không yêu cầu OTP': 'No OTP required',
  'Số liệu hoạt động CyberAware': 'CyberAware activity',
  'Tổng lượt quét': 'Total checks',
  'Lượt quét hôm nay (GMT+7)': 'Checks today (GMT+7)',
  'Báo cáo quản trị viên đã duyệt': 'Moderator-approved reports',
  'Thời gian xử lý trung bình (ms)': 'Average processing time (ms)',
  'Khám phá cách CyberAware AI': 'See how CyberAware AI',
  'nhận diện dấu hiệu lừa đảo': 'spots scam warning signs',
  'Giả mạo ngân hàng': 'Bank impersonation',
  'Giả mạo ngân hàng & OTP': 'Bank and OTP impersonation',
  'Quà tặng ảo': 'Fake prizes',
  'Lừa đảo trúng thưởng tri ân': 'Fake loyalty prize scam',
  'Lừa làm CTV': 'Fake part-time jobs',
  'Tuyển CTV việc nhẹ lương cao': 'Easy-money job scam',
  'Giả danh cơ quan nhà nước': 'Government impersonation',
  'Mạo danh Công an / Viện kiểm sát': 'Police or prosecutor impersonation',
  'Trợ lý AI CyberAware': 'CyberAware AI assistant',
  'Sẵn sàng hỗ trợ': 'Ready to help',
  'Minh họa': 'Demo',
  'Hỏi CyberAware AI…': 'Ask CyberAware AI…',
  'Đặt câu hỏi bằng tiếng Việt hoặc gửi ảnh chụp tình huống cần xem xét.': 'Ask a question or send a screenshot of a situation you want to review.',
  'Nhận giải thích dấu hiệu đáng nghi và cách kiểm tra qua kênh chính thức.': 'Get an explanation of suspicious signs and ways to verify through official channels.',
  'Các khóa đào tạo vi mô (Micro-learning) kéo dài 5-10 phút, được biên soạn dễ hiểu với ví dụ thực tiễn dành riêng cho người cao tuổi, phụ huynh và sinh viên học sinh.': 'Short, practical lessons for older adults, parents and students take just 5–10 minutes.',
  'Tự bảo vệ ví điện tử và thông tin danh tính': 'Protect your e-wallet and identity',
  'Phòng thủ lừa đảo qua mạng xã hội': 'Prevent social media scams',
  'Bảo mật tài khoản ngân hàng số': 'Secure your digital bank account',
  'Xử lý khủng hoảng khi lỡ click link độc': 'What to do after clicking a malicious link',
  'Nhận biết cuộc gọi mạo danh bằng giọng nói AI': 'Recognize AI voice impersonation calls',
  'Hướng dẫn cách đặt câu hỏi thử thách kiểm tra khi có người thân gọi xin chuyển tiền gấp.': 'Learn questions to ask when someone claiming to be family urgently requests money.',
  'Tra cứu & Đánh giá': 'Check & assess',
  'Xác minh Website / URL': 'Check a website / URL',
  'Kiểm tra Số điện thoại & STK': 'Check phone & bank account',
  'Báo cáo trường hợp lừa đảo': 'Report a suspected scam',
  'Bản đồ cảnh báo toàn quốc': 'Scam warning library',
  'Nâng cao nhận thức': 'Build awareness',
  'Khóa học tự vệ không gian mạng': 'Digital safety courses',
  'Tình huống cảnh báo thời sự': 'Current scam scenarios',
  'Cách nhận biết Video Deepfake AI': 'How to spot AI deepfakes',
  'Cẩm nang ứng cứu 15 phút đầu': 'First 15 minutes response guide',
  'Thông tin & Hỗ trợ': 'Information & support',
  'Về dự án CyberAware AI': 'About CyberAware AI',
  'Điều khoản sử dụng dữ liệu': 'Data use terms',
  'ĐƯỜNG DÂY NÓNG KHẨN CẤP': 'REPORTING HOTLINE',
  '(Miễn phí cước)': '(Free call)',
  'Tổng đài tiếp nhận phản ánh cuộc gọi & tin nhắn rác, lừa đảo.': 'Hotline for reporting spam and scam calls or messages.',
  '© 2026 CyberAware AI. Phát triển vì an toàn số cộng đồng Việt Nam.': '© 2026 CyberAware AI. Built for safer digital communities.',
  'Hệ thống cung cấp điểm rủi ro tham khảo từ bộ quy tắc và báo cáo CyberAware đã duyệt; chưa kết nối cơ sở dữ liệu NCSC.': 'Risk scores are advisory and based on rules and reviewed CyberAware reports; no NCSC database connection is claimed.',
  'Thư viện Kịch bản & Thủ đoạn tội phạm mạng': 'Scam scenarios and tactics library',
  'RADAR CẢNH BÁO LỪA ĐẢO TOÀN QUỐC 2026': 'SCAM WARNING LIBRARY 2026',
  'Tổng hợp và bóc tách chi tiết các kịch bản lừa đảo đang hoành hành tại Việt Nam. Nắm vững tâm lý thao túng để không bao giờ trở thành nạn nhân.': 'Explore scam scenarios seen in Vietnam and learn the manipulation tactics and warning signs.',
  'Kịch bản học tập minh họa': 'Illustrative learning scenarios',
  'kịch bản': 'scenarios',
  'Mạo danh ngân hàng & OTP': 'Bank and OTP impersonation',
  'Trúng thưởng & Tri ân': 'Fake prizes and rewards',
  'Việc nhẹ lương cao': 'Easy-money jobs',
  'Mạo danh Công an / Viện KS': 'Police or prosecutor impersonation',
  'Mạo danh VNeID': 'VNeID impersonation',
  'Công nghệ AI giả mạo': 'AI impersonation',
  'Dịch vụ công giả mạo': 'Fake public services',
  'DẤU HIỆU LẬT TẨY:': 'WARNING SIGN:',
  'Xem chi tiết kịch bản & Cách phòng chống': 'View scenario and precautions',
  'Chi tiết kịch bản lừa đảo': 'Scam scenario details',
  'VÍ DỤ TIN NHẮN / LỜI THOẠI THỰC TẾ CỦA KẺ GIAN:': 'SAMPLE SCAM MESSAGE OR SCRIPT:',
  'TÂM LÝ NẠN NHÂN BỊ THAO TÚNG:': 'MANIPULATION TACTIC:',
  'DIỄN BIẾN KỊCH BẢN CHI TIẾT:': 'SCENARIO DETAILS:',
  'DẤU HIỆU NHẬN DIỆN THEN CHỐT:': 'KEY WARNING SIGNS:',
  'HÀNH ĐỘNG BẢO VỆ BẮT BUỘC:': 'PROTECTIVE ACTIONS:',
  'Đã hiểu & Ghi nhớ': 'Understood',
  'Tất cả hình thức': 'All categories',
  'Học viện Tự vệ số & Phòng chống lừa đảo': 'Digital safety and scam prevention academy',
  'Bài học ngắn, tình huống thực tế và câu hỏi giúp bạn áp dụng cách tự bảo vệ ngoài đời.': 'Short lessons, real-world scenarios and questions to practice protecting yourself.',
  'Bạn có thể đọc bài học.': 'You can read lessons.',
  'để nộp bài và lưu tiến độ.': 'to submit answers and save your progress.',
  'NỘI DUNG BÀI HỌC (': 'LESSON CONTENT (',
  'PHẦN)': 'PARTS)',
  'Bài học': 'Lesson',
  'Bài kiểm tra': 'Quiz',
  'Đọc nội dung bài học': 'Read the lesson',
  'Tôi đã đọc bài này': 'I have read this lesson',
  'Danh mục Khóa học': 'Course catalog',
  'Hướng xử lý khi đã gặp tình huống lừa đảo': 'What to do after a scam',
  'CÁC BƯỚC CẦN LÀM': 'STEPS TO TAKE',
  'Cảnh báo': 'Warnings',
  'Báo cáo': 'Reports',
  'MẠNG LƯỚI BÁO CÁO CỘNG ĐỒNG': 'COMMUNITY SCAM REPORTS',
  'Báo cáo Cảnh báo từ cộng đồng': 'Community scam reports',
  'Báo cáo người dùng gửi sẽ qua kiểm duyệt trước khi công khai. Bạn có thể xem chi tiết và bình chọn các báo cáo đã duyệt.': 'Submitted reports are reviewed before they become public. Browse and vote on approved reports.',
  'Gửi báo cáo mới': 'Submit a report',
  'Phạm vi báo cáo': 'Report scope',
  'Tất cả công khai': 'All public',
  'Chưa xác minh': 'Unverified',
  'Báo cáo của tôi': 'My reports',
  'Chờ kiểm duyệt': 'Awaiting review',
  'Loại báo cáo': 'Report type',
  'Tất cả': 'All',
  'Số tài khoản': 'Account number',
  'Tin nhắn': 'Messages',
  'Tìm báo cáo': 'Search reports',
  'Tìm tên miền, số điện thoại, nội dung…': 'Search domains, phone numbers or content…',
  'Tải lại báo cáo': 'Reload reports',
  'Tải lại': 'Reload',
  'Đang tải báo cáo…': 'Loading reports…',
  'Chưa có báo cáo phù hợp.': 'No matching reports.',
  'Thử từ khóa hoặc bộ lọc khác.': 'Try another keyword or filter.',
  'Phân trang báo cáo': 'Report pages',
  '← Trước': '← Previous',
  'Sau →': 'Next →',
  'Trang': 'Page',
  'báo cáo': 'reports',
  'Quản trị viên đã duyệt': 'Moderator approved',
  'Chờ duyệt': 'Pending review',
  'Đã từ chối': 'Rejected',
  'Giới thiệu': 'About',
  'VỀ DỰ ÁN CYBERAWARE AI': 'ABOUT CYBERAWARE AI',
  'Bảo vệ tương lai số cho mọi gia đình Việt Nam': 'A safer digital future for every family',
  'CyberAware AI là sáng kiến công nghệ ứng dụng trí tuệ nhân tạo thế hệ mới (AI/LLM) nhằm hỗ trợ người dân thẩm định rủi ro tức thời, nâng cao nhận thức và ngăn chặn lừa đảo mạng trước khi thiệt hại xảy ra.': 'CyberAware AI uses modern AI and language models to help people assess risks, build awareness and prevent online scams.',
  'Mô hình AI Đa tầng': 'Multi-signal AI model',
  'Kết hợp bộ quy tắc phân tích đầu vào và báo cáo cộng đồng đã duyệt. Gemini có thể bổ sung giải thích khi được cấu hình. Hệ thống chưa kết nối danh sách đen của cơ quan chức năng.': 'The system combines input analysis rules with reviewed community reports. Gemini can add explanations when configured. It is not connected to an official blacklist.',
  'Quyền riêng tư rõ ràng': 'Clear privacy rules',
  'Khi đăng nhập, hệ thống lưu nội dung kiểm tra và kết quả vào lịch sử tài khoản. Khách không được lưu nội dung kiểm tra trong lịch sử. Không nhập mật khẩu hoặc OTP; nếu bật Gemini, nội dung sau bước che một số mẫu bí mật sẽ được gửi để tạo phần giải thích.': 'Signed-in scans and results are saved to account history. Guest scans are not saved there. Do not enter passwords or OTPs. If Gemini is enabled, partially redacted content is sent for an explanation.',
  'Sức mạnh Cộng đồng': 'Community power',
  'Báo cáo được lưu và chuyển tới quản trị viên kiểm duyệt trước khi công khai. Số liệu trên trang chủ được tính từ hoạt động thực tế của ứng dụng.': 'Reports are reviewed by moderators before publication. Homepage figures come from real application activity.',
  'DANH BẠ CỨU HỘ & TỔNG ĐÀI KHẨN CẤP QUỐC GIA': 'HELP AND REPORTING CONTACTS',
  'Khi phát hiện bị lừa đảo hoặc nghi ngờ tấn công mạng': 'If you suspect a scam or cyberattack',
  'Hãy liên hệ ngay với các cơ quan chuyên trách để được hướng dẫn phong tỏa tài khoản và thụ lý đơn trình báo.': 'Contact the relevant authorities promptly for guidance on securing your accounts and filing a report.',
  'BỘ THÔNG TIN VÀ TRUYỀN THÔNG': 'MINISTRY OF INFORMATION AND COMMUNICATIONS',
  'Tiếp nhận phản ánh cuộc gọi rác, cuộc gọi lừa đảo mạo danh cơ quan nhà nước.': 'Receives reports of spam and scam calls impersonating public agencies.',
  'CỤC AN NINH MẠNG & PCTP CÔNG NGHỆ CAO (A05)': 'CYBERSECURITY AND HIGH-TECH CRIME DEPARTMENT (A05)',
  'Bộ Công An tiếp nhận tố giác tội phạm sử dụng công nghệ cao chiếm đoạt tài sản.': 'The Ministry of Public Security receives reports of technology-enabled financial crime.',
  'TRUNG TÂM GIÁM SÁT AN TOÀN KHÔNG GIAN MẠNG (NCSC)': 'NATIONAL CYBERSECURITY MONITORING CENTER (NCSC)',
  'Cổng tiếp nhận báo cáo trang web lừa đảo, tấn công mạng trên toàn quốc.': 'National portal for reporting scam websites and cyberattacks.',
  'Học tập': 'Learning',
};

const originals = new WeakMap<Text, string>();
const attributes = new WeakMap<Element, Map<string, string>>();

type Queue = (value: string, element: Element | null) => void;

function translateText(node: Text, language: SiteLanguage, queue: Queue) {
  if (node.parentElement?.closest('script,style,[data-no-translate]')) return;
  const value = node.nodeValue || '';
  let original = originals.get(node);
  if (language === 'vi') {
    if (original && value === translateValue(original) && value !== original) node.nodeValue = original;
    else if (original && value !== original) originals.set(node, value);
    return;
  }
  if (!original || (value !== original && value !== translateValue(original))) {
    original = value;
    originals.set(node, value);
  }
  const translated = translateValue(original);
  if (translated !== value) node.nodeValue = translated;
  if (translated === original) queue(original, node.parentElement);
}

function translateValue(value: string) {
  const trimmed = value.trim();
  const translation = english[trimmed] || translatedText(trimmed);
  return translation ? value.replace(trimmed, translation) : value;
}

function translateAttributes(element: Element, language: SiteLanguage, queue: Queue) {
  if (element.closest('[data-no-translate]')) return;
  const names = ['placeholder', 'title', 'aria-label', 'alt'];
  let saved = attributes.get(element);
  if (!saved) { saved = new Map(); attributes.set(element, saved); }
  for (const name of names) {
    const value = element.getAttribute(name);
    if (!value) continue;
    let original = saved.get(name);
    if (language === 'vi') {
      if (original && value === translateValue(original) && value !== original) element.setAttribute(name, original);
      else if (original && value !== original) saved.set(name, value);
      continue;
    }
    if (!original || (value !== original && value !== translateValue(original))) {
      original = value;
      saved.set(name, value);
    }
    const translated = translateValue(original);
    if (translated !== value) element.setAttribute(name, translated);
    if (translated === original) queue(original, element);
  }
}

export function installSiteLocalization(root: Element, language: SiteLanguage, path: string, allowCloud: boolean) {
  const pending = new Map<string, boolean>();
  const attempted = new Set<string>();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let busy = false;
  let active = true;

  const queue: Queue = (value, element) => {
    const text = value.trim();
    if (!active || language !== 'en' || !/[\u00c0-\u1ef9\u0111\u0110]/u.test(text) ||
      text.length < 2 || text.length > 1800 || attempted.has(text) || translatedText(text)) return;
    const cloudEligible = allowCloud && !!element?.closest('main') && !element?.closest('[data-no-auto-translate]');
    pending.set(text, Boolean(pending.get(text) || cloudEligible));
    if (!timer && !busy) timer = setTimeout(() => { timer = undefined; void flush(); }, 100);
  };

  const visit = (target: Node) => {
    if (target.nodeType === Node.TEXT_NODE) { translateText(target as Text, language, queue); return; }
    if (!(target instanceof Element) || target.closest('[data-no-translate]')) return;
    translateAttributes(target, language, queue);
    const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) translateText(walker.currentNode as Text, language, queue);
    target.querySelectorAll('[placeholder],[title],[aria-label],[alt]').forEach(element => translateAttributes(element, language, queue));
  };

  const flush = async () => {
    if (busy || !active || !pending.size) return;
    busy = true;
    const entries = [...pending].slice(0, 40).map(([text, cloudEligible]) => ({ text, cloudEligible }));
    entries.forEach(entry => { pending.delete(entry.text); attempted.add(entry.text); });
    try { await translateVisibleTexts(entries, path); } finally {
      busy = false;
      if (active) {
        visit(root);
        if (pending.size && !timer) timer = setTimeout(() => { timer = undefined; void flush(); }, 100);
      }
    }
  };

  if (language === 'en') prepareBrowserTranslator();
  visit(root);
  const onTranslatorReady = () => { attempted.clear(); visit(root); };
  window.addEventListener('cyberaware-translator-ready', onTranslatorReady);
  const observer = new MutationObserver(records => {
    for (const record of records) {
      if (record.type === 'characterData') visit(record.target);
      else if (record.type === 'attributes') visit(record.target);
      else record.addedNodes.forEach(visit);
    }
  });
  observer.observe(root, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['placeholder', 'title', 'aria-label', 'alt'] });
  return () => { active = false; if (timer) clearTimeout(timer); observer.disconnect(); window.removeEventListener('cyberaware-translator-ready', onTranslatorReady); };
}
