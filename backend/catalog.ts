import { SCAM_SCENARIOS, COURSES } from './catalog-base';
import { lessonExtras, answerDetails, thirdChoices } from './education';
import { extraQuestions } from './education-extra-questions';
import { newCourses, newQuizzes } from './education-new-courses';

const extraScenarios = [
  ['shipper', 'Mạo danh người giao hàng', 'Quà tặng ảo', 'gift', 'Người gọi báo giao nhầm hàng và yêu cầu quét QR hoàn tiền.', 'Không quét mã hoặc chuyển tiền để nhận khoản hoàn chưa được xác minh.'],
  ['investment', 'Đầu tư cam kết lãi cao', 'Lừa làm CTV', 'job', 'Nhóm đầu tư hứa lợi nhuận cố định rồi yêu cầu phí rút tiền.', 'Kiểm tra tổ chức qua kênh độc lập và dừng nạp tiền khi bị yêu cầu phí mở khóa.'],
  ['romance', 'Quan hệ tình cảm và lời mời đầu tư', 'Lừa làm CTV', 'phone', 'Người mới quen tạo lòng tin rồi rủ chuyển tiền vào sàn lạ.', 'Không chuyển tiền hoặc chia sẻ tài khoản cho người chưa xác minh.'],
  ['scholarship', 'Học bổng có phí giữ chỗ', 'Quà tặng ảo', 'gift', 'Tin nhắn nhận học bổng yêu cầu thanh toán trong vài phút.', 'Tự liên hệ trường bằng thông tin đã biết để kiểm tra học bổng.'],
  ['tax', 'Ứng dụng hoàn thuế giả', 'Dịch vụ công giả mạo', 'police', 'Người gọi tự xưng cán bộ thuế gửi tệp APK để hoàn tiền.', 'Không cài tệp từ người lạ; kiểm tra thủ tục tại kênh chính thức.'],
  ['electricity', 'Dọa cắt điện khẩn cấp', 'Giả danh cơ quan nhà nước', 'phone', 'Cuộc gọi dọa cắt điện ngay nếu không trả tiền vào tài khoản cá nhân.', 'Kiểm tra hóa đơn trong ứng dụng hoặc tổng đài nhà cung cấp đã biết.'],
  ['recovery', 'Dịch vụ lấy lại tiền bị lừa', 'Lừa làm CTV', 'job', 'Sau khi bị lừa, nạn nhân được hứa lấy lại tiền với phí trả trước.', 'Lưu bằng chứng và làm việc trực tiếp với ngân hàng, cơ quan tiếp nhận.'],
  ['marketplace', 'Đường dẫn nhận tiền bán hàng', 'Giả mạo ngân hàng', 'bank', 'Người mua gửi link nhận tiền yêu cầu người bán nhập mật khẩu và OTP.', 'Kiểm tra tiền trong ứng dụng ngân hàng; không đăng nhập qua link người mua gửi.'],
  ['qr', 'QR thanh toán bị thay thế', 'Giả mạo ngân hàng', 'bank', 'Mã QR trên quầy bị dán đè để chuyển khoản sang tài khoản khác.', 'Đối chiếu tên người nhận và số tiền với người bán trước khi xác nhận.'],
  ['travel', 'Đặt phòng giá rẻ giả mạo', 'Quà tặng ảo', 'gift', 'Trang đặt phòng yêu cầu chuyển cọc gấp và từ chối xác minh đặt chỗ.', 'Liên hệ trực tiếp cơ sở lưu trú qua kênh độc lập.'],
  ['sim', 'Mạo danh nâng cấp SIM', 'Dịch vụ công giả mạo', 'phone', 'Người gọi yêu cầu cung cấp mã xác thực để nâng cấp SIM miễn phí.', 'Không cung cấp mã; tự liên hệ nhà mạng.'],
  ['account', 'Cảnh báo tài khoản mạng xã hội', 'Công nghệ AI giả mạo', 'phone', 'Thông báo giả dọa khóa trang và yêu cầu đăng nhập vào mẫu khiếu nại lạ.', 'Mở trực tiếp ứng dụng và kiểm tra mục bảo mật.'],
  ['charity', 'Quyên góp qua tài khoản giả', 'Quà tặng ảo', 'gift', 'Bài đăng sao chép hoàn cảnh khó khăn nhưng thay số tài khoản.', 'Đối chiếu người tổ chức và tài khoản nhận với nguồn ban đầu.'],
  ['loan', 'Khoản vay phải đóng phí trước', 'Giả mạo ngân hàng', 'bank', 'Ứng dụng cho vay báo sai hồ sơ và đòi phí sửa thông tin để giải ngân.', 'Dừng chuyển tiền và kiểm tra đơn vị cho vay bằng kênh độc lập.'],
] as const;
export const scenarios = [
  ...SCAM_SCENARIOS.map(s => ({ ...s, sampleMessage: s.sampleMessage?.replace(/https?:\/\/[^\s]+/g, 'https://example.invalid/minh-hoa') })),
  ...extraScenarios.map(([id, title, category, iconType, story, advice]) => ({
    id: `scam-${id}`, title, category, iconType, badgeColor: 'blue', summary: story,
    detailStory: `Tình huống minh họa dùng cho học tập: ${story} Người nhận cần dừng lại và kiểm tra độc lập trước khi thao tác.`,
    signs: story, victimPsychology: 'Tạo áp lực quyết định nhanh hoặc lợi dụng lòng tin, mong muốn nhận lợi ích.',
    preventionTips: [advice, 'Không cung cấp mật khẩu hay mã xác thực cho người khác.'], sampleMessage: 'Ví dụ giả lập: Hãy xử lý ngay để tránh mất quyền lợi.',
  })),
];
// Teaching content only. No fabricated ratings, learner counts or verification claims.
const lessons: Record<string, string[]> = {
  'course-deepfake': [
    'AI có thể tạo hoặc chỉnh sửa khuôn mặt và giọng nói. Một cuộc gọi trông giống người thân chưa đủ để xác minh người gọi. Không kết luận thật/giả chỉ bằng độ dài cuộc gọi hay một dấu hiệu hình ảnh.',
    'Khi được yêu cầu chuyển tiền gấp: dừng cuộc gọi, gọi lại số đã lưu từ trước hoặc hỏi qua kênh độc lập. Câu hỏi riêng tư chỉ là bước bổ sung; thông tin đó cũng có thể đã bị lộ.',
  ],
  'course-banking': [
    'OTP dùng để xác nhận thao tác. Không đọc mã, gửi ảnh mã hay cho người khác điều khiển thiết bị để nhập mã. Nếu không tự khởi tạo giao dịch, hãy từ chối xác nhận.',
    'HTTPS chỉ mã hóa kết nối, không bảo đảm website uy tín. Kiểm tra toàn bộ tên miền: bank.example.attacker.invalid thuộc attacker.invalid. Mở ứng dụng ngân hàng hoặc địa chỉ đã lưu trước.',
    'Đặt hạn mức phù hợp, bật thông báo giao dịch và bảo vệ khóa màn hình. Kiểm tra tên người nhận, số tiền và nội dung trước mỗi lần xác nhận.',
  ],
  'course-parents': [
    'Khi một người lạ gây áp lực: dừng lại, hỏi người tin cậy và kiểm tra độc lập. Không cung cấp thông tin đăng nhập hoặc chuyển tiền để chứng minh vô tội.',
    'Tên hiển thị hoặc thông tin cá nhân mà người gọi biết không chứng minh danh tính. Không đánh giá uy tín chỉ bằng đầu số điện thoại. Tự tìm kênh liên hệ trong ứng dụng hoặc giấy tờ đã có.',
    'Lưu sẵn số của người thân và kênh hỗ trợ ngân hàng từ ứng dụng/thẻ. Thống nhất cách xác minh trong gia đình trước khi có yêu cầu tiền khẩn cấp.',
  ],
  'course-crisis': [
    'Nếu vừa tải hoặc cài ứng dụng đáng ngờ, ngắt kết nối thiết bị nghi bị xâm nhập. Dùng thiết bị khác đáng tin cậy để liên hệ hỗ trợ. Chỉ bấm liên kết chưa đủ để kết luận máy đã bị nhiễm.',
    'Nếu đã nhập thông tin ngân hàng hoặc chuyển tiền, liên hệ ngân hàng qua ứng dụng hoặc số trên thẻ để báo sự cố, yêu cầu khóa phương thức truy cập và hỗ trợ giao dịch. Không có bảo đảm lấy lại tiền.',
    'Đổi mật khẩu từ thiết bị an toàn, thu hồi phiên đăng nhập và kiểm tra quyền ứng dụng. Giữ ảnh chụp, biên lai và thời điểm sự việc để trình báo. Không trả phí cho người hứa chắc chắn lấy lại tiền.',
  ],
};
const questionSets: Record<string, [string, string[], number, string][]> = {
  'course-deepfake': [
    ['Người giống em bạn gọi video xin chuyển tiền gấp. Bạn làm gì?', ['Chuyển ngay', 'Gọi lại số đã lưu từ trước', 'Xin thêm video trong cùng cuộc chat'], 1, 'Cần xác minh qua kênh độc lập đã biết.'],
    ['Video rõ nét có chứng minh người gọi là thật không?', ['Có', 'Không'], 1, 'Video và giọng nói có thể bị giả mạo.'],
    ['Người gọi biết tên gia đình bạn. Điều đó có đủ không?', ['Đủ để tin', 'Vẫn cần xác minh'], 1, 'Thông tin cá nhân có thể đã bị lộ.'],
    ['Dấu hiệu hình ảnh bị giật có kết luận chắc chắn deepfake không?', ['Có', 'Không, có thể do đường truyền'], 1, 'Dấu hiệu hình ảnh không thay thế xác minh danh tính.'],
    ['Kênh nào nên dùng để kiểm tra yêu cầu tiền?', ['Số mới do người gọi cung cấp', 'Số người thân đã lưu trước đó'], 1, 'Kẻ gian có thể kiểm soát kênh mới mà họ cung cấp.'],
  ],
  'course-banking': [
    ['Người gọi tự xưng nhân viên ngân hàng yêu cầu đọc OTP để hủy giao dịch lạ. Bạn có nên đọc mã không?', ['Có nếu biết tên tôi', 'Không'], 1, 'Không đọc OTP cho người gọi; tự liên hệ ngân hàng qua ứng dụng hoặc số trên thẻ.'],
    ['Tin nhắn báo tài khoản ngân hàng sắp bị khóa và yêu cầu bấm liên kết để xác minh. Bạn nên làm gì?', ['Bấm liên kết và đăng nhập ngay', 'Tự mở ứng dụng ngân hàng để kiểm tra thông báo', 'Trả lời tin nhắn để hỏi thêm'], 1, 'Kiểm tra bằng ứng dụng ngân hàng tự mở hoặc số hỗ trợ chính thức, không đăng nhập qua liên kết trong tin nhắn.'],
    ['Người gọi tự xưng nhân viên ngân hàng gửi liên kết cài ứng dụng “hỗ trợ” và yêu cầu cho phép điều khiển điện thoại. Bạn nên làm gì?', ['Cài ứng dụng và cấp quyền ngay', 'Từ chối, rồi tự gọi ngân hàng qua số trên thẻ hoặc ứng dụng', 'Chỉ cấp quyền xem màn hình'], 1, 'Không cài ứng dụng hay cấp quyền điều khiển theo hướng dẫn của người gọi lạ; tự liên hệ ngân hàng qua kênh chính thức.'],
    ['Trước khi xác nhận QR chuyển tiền cần kiểm tra gì?', ['Chỉ màu logo', 'Tên người nhận và số tiền'], 1, 'QR có thể bị thay thế; đối chiếu thông tin nhận tiền.'],
    ['Bạn nhận yêu cầu xác nhận giao dịch không do mình tạo. Nên làm gì?', ['Từ chối và kiểm tra tài khoản', 'Xác nhận để hết thông báo'], 0, 'Không xác nhận giao dịch lạ.'],
  ],
  'course-parents': [
    ['Người tự xưng cán bộ điều tra yêu cầu chuyển tiền để chứng minh vô tội. Bạn nên làm gì?', ['Chuyển ngay', 'Dừng và xác minh độc lập'], 1, 'Dừng cuộc gọi, hỏi người tin cậy và tự liên hệ cơ quan có thẩm quyền qua kênh chính thức.'],
    ['Đầu số trong nước có chứng minh người gọi uy tín?', ['Có', 'Không'], 1, 'Không thể xác minh danh tính chỉ bằng đầu số.'],
    ['Người lạ báo bạn trúng quà nhưng yêu cầu trả phí trước. Bạn nên làm gì?', ['Kiểm tra chương trình qua kênh độc lập', 'Nộp nhanh để giữ quà'], 0, 'Yêu cầu phí trước là dấu hiệu cần cảnh giác.'],
    ['Bị thúc ép không được nói với gia đình, nên làm gì?', ['Giữ bí mật', 'Dừng lại và hỏi người tin cậy'], 1, 'Cô lập nạn nhân là cách tạo áp lực.'],
    ['Nên chuẩn bị gì trước tình huống khẩn cấp?', ['Danh bạ hỗ trợ đã xác minh', 'Chờ người lạ gửi số hỗ trợ'], 0, 'Kênh có sẵn giúp tránh bị dẫn tới số giả.'],
  ],
  'course-crisis': [
    ['Bạn đã nhập mật khẩu ngân hàng vào trang giả. Bước phù hợp là gì?', ['Chờ xem', 'Liên hệ ngân hàng và đổi mật khẩu từ thiết bị an toàn'], 1, 'Báo ngân hàng qua kênh chính thức và đổi mật khẩu từ thiết bị an toàn càng sớm càng tốt.'],
    ['Người lạ hứa chắc chắn lấy lại tiền bị lừa nếu bạn trả phí trước. Có nên tin ngay không?', ['Có', 'Không'], 1, 'Lời hứa bảo đảm lấy lại tiền kèm phí trước có thể là một vụ lừa đảo tiếp theo.'],
    ['Có nên xóa toàn bộ tin nhắn giao dịch ngay?', ['Có', 'Không, lưu bằng chứng'], 1, 'Thông tin giao dịch và thời điểm hỗ trợ việc trình báo.'],
    ['Thiết bị nghi bị điều khiển, nên đổi mật khẩu ở đâu?', ['Thiết bị an toàn khác', 'Ngay trong ứng dụng lạ'], 0, 'Thiết bị bị xâm nhập có thể tiếp tục lộ thông tin.'],
    ['Chỉ bấm một liên kết có chứng minh máy nhiễm mã độc?', ['Chắc chắn có', 'Không, cần đánh giá thêm'], 1, 'Phân biệt việc mở trang, nhập thông tin và cài ứng dụng.'],
  ],
};
const incidentGuidance: Record<string, { title: string; intro: string; steps: string[] }> = {
  'course-deepfake': {
    title: 'Ứng phó với cuộc gọi giả mạo người thân',
    intro: 'Nếu đã tin cuộc gọi dùng giọng nói hoặc hình ảnh giống người quen và làm theo yêu cầu chuyển tiền:',
    steps: [
      'Dừng liên lạc với người gọi, không chuyển thêm tiền dù họ đưa ra lý do khẩn cấp.',
      'Gọi lại số người thân đã lưu từ trước hoặc hỏi một người thân khác để xác minh tình huống.',
      'Liên hệ ngay ngân hàng qua ứng dụng hoặc số chính thức để báo giao dịch đáng ngờ và hỏi cách xử lý.',
      'Giữ cuộc gọi, tin nhắn, số tài khoản và chứng từ chuyển tiền; trình báo cơ quan Công an gần nhất.',
    ],
  },
  'course-banking': {
    title: 'Bảo vệ tài khoản khi thông tin ngân hàng có nguy cơ bị lộ',
    intro: 'Nếu đã nhập mật khẩu, mã OTP, thông tin thẻ vào trang lạ hoặc đọc cho người tự xưng là nhân viên ngân hàng:',
    steps: [
      'Ngừng trao đổi và không cung cấp thêm mã xác thực hay chấp thuận giao dịch mới.',
      'Mở ứng dụng ngân hàng chính thức hoặc gọi số trên thẻ để báo lộ thông tin và yêu cầu hỗ trợ bảo vệ tài khoản.',
      'Dùng thiết bị an toàn để đổi mật khẩu, kiểm tra các giao dịch và đăng xuất những phiên không nhận ra.',
      'Lưu đường dẫn, tin nhắn và chứng từ; nếu có giao dịch lạ, báo ngay cho ngân hàng và cơ quan Công an.',
    ],
  },
  'course-parents': {
    title: 'Xử lý khi bị mạo danh, thúc ép qua điện thoại',
    intro: 'Nếu đã nghe người lạ tự xưng cơ quan chức năng, người quen hoặc nhân viên dịch vụ và bị thúc ép làm theo:',
    steps: [
      'Ngắt cuộc gọi, không giữ bí mật hay tiếp tục chuyển tiền theo lời đe dọa.',
      'Kể ngay với người thân tin cậy; tự gọi tới số đã lưu hoặc kênh chính thức để kiểm tra.',
      'Nếu đã đưa mật khẩu hoặc OTP, đổi mật khẩu từ thiết bị an toàn và liên hệ đơn vị quản lý tài khoản.',
      'Nếu đã chuyển tiền, liên hệ ngân hàng ngay; giữ tin nhắn, ghi âm và chứng từ để trình báo Công an.',
    ],
  },
  'course-crisis': {
    title: 'Xử lý sau khi truy cập liên kết hoặc cài ứng dụng đáng ngờ',
    intro: 'Cách xử lý phụ thuộc vào việc bạn chỉ mở trang, đã nhập thông tin hay đã cài ứng dụng theo hướng dẫn:',
    steps: [
      'Dừng thao tác trên trang hoặc ứng dụng lạ; không nhập thêm thông tin và không cấp thêm quyền truy cập.',
      'Nếu đã cài ứng dụng đáng ngờ hoặc cho phép điều khiển máy, ngắt kết nối mạng trên thiết bị đó và nhờ người có chuyên môn kiểm tra.',
      'Dùng thiết bị an toàn khác để đổi mật khẩu các tài khoản đã nhập; liên hệ ngân hàng qua kênh chính thức nếu có thông tin tài chính bị lộ.',
      'Giữ liên kết, tin nhắn và thời điểm sự việc; kiểm tra giao dịch, báo ngân hàng và trình báo Công an nếu phát hiện thiệt hại.',
    ],
  },
};
const updatedDescriptions: Record<string, string> = {
  'course-deepfake': 'Xác minh cuộc gọi xin tiền bằng kênh độc lập, kể cả khi hình ảnh và giọng nói rất giống người thân.',
  'course-banking': 'Bảo vệ mã OTP, kiểm tra tên miền và thông tin giao dịch trước khi xác nhận.',
  'course-parents': 'Các bước dễ nhớ để dừng cuộc gọi gây áp lực, hỏi người tin cậy và kiểm tra qua kênh chính thức.',
  'course-crisis': 'Phân biệt việc mở liên kết, nhập thông tin và cài ứng dụng lạ để xử lý đúng mức rủi ro.',
};
const updatedModuleTitles: Record<string, string> = {
  l1: 'Vì sao giọng nói và video quen thuộc vẫn cần xác minh',
  l2: 'Gọi lại qua kênh độc lập khi có yêu cầu chuyển tiền',
  b2: 'HTTPS và cách kiểm tra tên miền đầy đủ',
  p1: 'Dừng lại, hỏi người tin cậy và kiểm tra',
  p2: 'Kiểm tra người gọi qua kênh chính thức',
  c1: 'Phân biệt mở liên kết, nhập thông tin và cài ứng dụng',
  c2: 'Liên hệ ngân hàng khi lộ thông tin hoặc mất tiền',
  c3: 'Bảo vệ lại tài khoản và lưu bằng chứng',
};
export const courses = [...COURSES.map(course => ({
  ...course, incidentGuidance: incidentGuidance[course.id], title: course.title.replace('an toàn tuyệt đối', 'an toàn'), rating: 0, learnersCount: 0,
  description: updatedDescriptions[course.id],
  modules: [
    ...course.modules.filter(m => m.type !== 'quiz').map((m, i) => ({ ...m, title: updatedModuleTitles[m.id] || m.title, type: 'interactive' as const, content: `${lessons[course.id][i]}\n\n${lessonExtras[course.id][i]}` })),
    { id: `${course.id}-quiz`, title: 'Kiểm tra cuối khóa', duration: '8 phút', type: 'quiz' as const, content: '10 câu hỏi tình huống. Đạt ít nhất 80% để hoàn thành khóa học.', quizId: `${course.id}-quiz` },
  ],
})).map(course => ({ ...course, lessonsCount: course.modules.length })), ...newCourses];
export const quizzes = [...COURSES.map(course => ({ id: `${course.id}-quiz`, courseId: course.id,
  questions: [...questionSets[course.id].map(([question, options, correctIndex, explanation], i) => {
    const [fourth, ...optionExplanations] = answerDetails[course.id][i];
    return { id: `${course.id}-q${i + 1}`, question, options: [...options, ...(options.length === 2 ? [thirdChoices[course.id][i]] : []), fourth], correctIndex, explanation, optionExplanations };
  }), ...extraQuestions[course.id]],
})), ...newQuizzes];
