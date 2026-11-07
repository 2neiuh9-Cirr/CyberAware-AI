import type { Course } from '../src/types';

type Question = [string, [string, string, string, string], number, string];

const createQuiz = (courseId: string, items: Question[]) => ({
  id: `${courseId}-quiz`, courseId,
  questions: items.map(([question, options, correctIndex, explanation], index) => ({
    id: `${courseId}-q${index + 1}`, question, options, correctIndex, explanation,
    optionExplanations: options.map((choice, option) => option === correctIndex
      ? `Đúng: ${explanation}`
      : `Chưa phù hợp khi chọn “${choice}”. ${explanation}`),
    difficulty: 'Tình huống thực tế' as const, status: 'active' as const,
  })),
});

export const newCourses: Course[] = [
  {
    id: 'course-phishing', title: 'Nhận diện tin nhắn giả mạo và bảo vệ tài khoản',
    category: 'Bảo vệ tài khoản', tag: 'THỰC HÀNH',
    description: 'Kiểm tra yêu cầu đăng nhập bất ngờ, bảo vệ mật khẩu và xác thực nhiều lớp, xử lý khi tài khoản có dấu hiệu bị chiếm.',
    duration: '08 PHÚT · 3 BÀI HỌC', lessonsCount: 3, rating: 0, learnersCount: 0,
    thumbnail: 'https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?auto=format&fit=crop&w=800&q=80',
    incidentGuidance: {
      title: 'Khi đã nhập mật khẩu vào trang đáng ngờ',
      intro: 'Nếu đã nhập thông tin đăng nhập hoặc chấp thuận yêu cầu xác thực không do mình tạo:',
      steps: [
        'Ngừng tương tác với tin nhắn và trang đó; không cung cấp thêm mã xác thực.',
        'Từ thiết bị an toàn, mở trực tiếp dịch vụ chính thức để đổi mật khẩu và đăng xuất các phiên lạ.',
        'Kiểm tra phương thức khôi phục và bật xác thực nhiều lớp; báo sự cố qua kênh hỗ trợ chính thức của dịch vụ.',
        'Nếu tài khoản liên quan tới tiền hoặc đã gửi tin nhắn lừa người quen, báo ngay cho ngân hàng và người liên quan.',
      ],
    },
    modules: [
      { id: 'ph1', title: 'Dừng lại trước yêu cầu đăng nhập bất ngờ', duration: '2 phút', type: 'interactive', content: 'Tin nhắn báo khóa tài khoản, hoàn tiền hoặc yêu cầu xác minh gấp có thể dẫn tới trang giả. Tên người gửi, logo và đường dẫn trông quen không chứng minh nguồn gửi. Không mở liên kết từ tin nhắn đáng ngờ; tự mở ứng dụng hoặc địa chỉ đã lưu. Kiểm tra thông báo trong dịch vụ chính thức. Không gửi mật khẩu, mã xác thực hoặc ảnh màn hình chứa mã cho người khác.' },
      { id: 'ph2', title: 'Mật khẩu riêng và xác thực nhiều lớp', duration: '2 phút', type: 'interactive', content: 'Dùng mật khẩu dài và riêng cho từng tài khoản, ưu tiên trình quản lý mật khẩu. Bật xác thực nhiều lớp khi dịch vụ hỗ trợ. Nếu nhận yêu cầu phê duyệt đăng nhập mà bạn không khởi tạo, hãy từ chối và kiểm tra tài khoản. Xác thực nhiều lớp giúp giảm rủi ro nhưng không làm một trang giả trở nên an toàn.' },
      { id: 'course-phishing-quiz', title: 'Kiểm tra cuối khóa', duration: '4 phút', type: 'quiz', content: '10 câu hỏi tình huống. Đạt ít nhất 80% để hoàn thành khóa học.', quizId: 'course-phishing-quiz' },
    ] as Course['modules'],
  },
  {
    id: 'course-marketplace', title: 'Mua bán trực tuyến: kiểm tra tiền và người nhận',
    category: 'Giao dịch trực tuyến', tag: 'TÌNH HUỐNG THỰC TẾ',
    description: 'Phân biệt biên lai với tiền đã nhận, kiểm tra QR và tài khoản nhận, tránh đường dẫn nhận tiền giả.',
    duration: '08 PHÚT · 3 BÀI HỌC', lessonsCount: 3, rating: 0, learnersCount: 0,
    thumbnail: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=800&q=80',
    incidentGuidance: {
      title: 'Khi đã chuyển nhầm hoặc nhập thông tin trên trang giả',
      intro: 'Xử lý theo việc bạn đã chuyển tiền, nhập mật khẩu hay chia sẻ mã xác thực:',
      steps: [
        'Dừng giao dịch tiếp theo và giữ tin nhắn, đường dẫn, biên lai, thông tin tài khoản nhận.',
        'Liên hệ ngân hàng qua ứng dụng hoặc số chính thức để báo sự cố và hỏi cách xử lý giao dịch.',
        'Nếu đã nhập mật khẩu hoặc mã xác thực, đổi mật khẩu từ thiết bị an toàn và kiểm tra giao dịch lạ.',
        'Báo cáo tài khoản giao dịch cho nền tảng mua bán và trình báo cơ quan Công an khi có thiệt hại.',
      ],
    },
    modules: [
      { id: 'mk1', title: 'Người bán: xác nhận tiền đã vào tài khoản', duration: '2 phút', type: 'interactive', content: 'Ảnh biên lai, video chuyển khoản và tin nhắn từ người mua có thể bị làm giả. Trước khi giao hàng, tự mở ứng dụng ngân hàng để xem giao dịch đã ghi nhận. Người bán không cần nhập mật khẩu hoặc OTP vào đường dẫn do người mua gửi để “nhận tiền”. Nếu bên mua hối thúc chuyển một khoản phí để mở khóa tiền, hãy dừng giao dịch và kiểm tra với nền tảng.' },
      { id: 'mk2', title: 'Người mua: kiểm tra nơi nhận tiền', duration: '2 phút', type: 'interactive', content: 'Trước khi xác nhận chuyển khoản hoặc quét QR, đối chiếu tên chủ tài khoản, số tiền và thông tin đơn hàng với bên bán qua kênh đáng tin cậy. Mã QR có thể bị thay thế. Với đặt cọc chỗ ở hoặc hàng hóa, tự kiểm tra người bán và chính sách của nền tảng; lời thúc ép “chỉ còn vài phút” không phải lý do bỏ qua xác minh. Giữ chứng từ giao dịch.' },
      { id: 'course-marketplace-quiz', title: 'Kiểm tra cuối khóa', duration: '4 phút', type: 'quiz', content: '10 câu hỏi tình huống. Đạt ít nhất 80% để hoàn thành khóa học.', quizId: 'course-marketplace-quiz' },
    ] as Course['modules'],
  },
];

export const newQuizzes = [
  createQuiz('course-phishing', [
    ['Tin nhắn báo tài khoản sẽ bị khóa trong 5 phút và kèm liên kết đăng nhập. Bạn làm gì?', ['Đăng nhập ngay qua liên kết', 'Tự mở ứng dụng chính thức để kiểm tra', 'Gửi mật khẩu để được hỗ trợ', 'Chuyển tiếp liên kết cho bạn bè thử'], 1, 'Kiểm tra trong ứng dụng chính thức mà bạn tự mở, không dùng liên kết trong tin nhắn.'],
    ['Trang đăng nhập có biểu tượng ổ khóa. Điều này cho biết gì?', ['Trang chắc chắn thuộc dịch vụ thật', 'Mọi yêu cầu trên trang đều an toàn', 'Kết nối được mã hóa, vẫn cần kiểm tra địa chỉ trang', 'Không cần xác thực nhiều lớp'], 2, 'Biểu tượng ổ khóa không xác minh chủ sở hữu hay độ tin cậy của trang.'],
    ['Bạn nhận yêu cầu phê duyệt đăng nhập dù không hề đăng nhập. Nên làm gì?', ['Phê duyệt để hết thông báo', 'Đọc mã cho người gọi hỗ trợ', 'Bỏ qua mà không kiểm tra', 'Từ chối và kiểm tra bảo mật tài khoản'], 3, 'Từ chối yêu cầu không do mình tạo và kiểm tra tài khoản qua kênh chính thức.'],
    ['Một mật khẩu đang dùng cho email và mạng xã hội. Cách cải thiện phù hợp?', ['Dùng mật khẩu riêng cho từng tài khoản', 'Thêm một ký tự giống nhau vào cả hai', 'Gửi mật khẩu cho người thân giữ hộ', 'Tắt xác thực nhiều lớp'], 0, 'Mật khẩu riêng giúp hạn chế ảnh hưởng khi một dịch vụ bị lộ.'],
    ['Ai đó tự xưng nhân viên hỗ trợ yêu cầu mã xác thực vừa gửi tới máy bạn. Bạn làm gì?', ['Đọc mã vì họ biết tên bạn', 'Chỉ đọc nửa mã', 'Từ chối và tự liên hệ kênh hỗ trợ chính thức', 'Gửi ảnh màn hình chứa mã'], 2, 'Không chia sẻ mã; tự tìm kênh hỗ trợ để xác minh.'],
    ['Bạn đã nhập mật khẩu trên trang nghi giả. Bước tiếp theo?', ['Nhập lại để xem có lỗi không', 'Đổi mật khẩu từ thiết bị an toàn và kiểm tra phiên đăng nhập', 'Chờ thông báo mất tài khoản', 'Xóa tin nhắn rồi thôi'], 1, 'Đổi mật khẩu qua dịch vụ chính thức và thu hồi phiên lạ càng sớm càng tốt.'],
    ['Tin nhắn có tên hiển thị giống dịch vụ bạn dùng. Có đủ để tin không?', ['Đủ vì tên không thể giả', 'Đủ nếu có logo', 'Đủ nếu nói đúng tên bạn', 'Chưa đủ; kiểm tra qua ứng dụng hoặc địa chỉ đã lưu'], 3, 'Tên hiển thị và thông tin cá nhân không thay thế xác minh độc lập.'],
    ['Trình quản lý mật khẩu có ích nhất ở điểm nào?', ['Tạo và lưu mật khẩu riêng, dài cho các tài khoản', 'Bảo đảm mọi website đều thật', 'Thay thế mọi bước kiểm tra tin nhắn', 'Cho phép chia sẻ mật khẩu với người lạ'], 0, 'Công cụ này giúp dùng mật khẩu riêng và đủ mạnh cho từng tài khoản.'],
    ['Bạn nhận tệp đính kèm “hóa đơn” từ người gửi lạ. Cách xử lý?', ['Mở ngay để biết nội dung', 'Cài ứng dụng được yêu cầu trong tệp', 'Kiểm tra đơn hàng qua dịch vụ chính thức trước khi mở tệp', 'Chuyển tệp cho đồng nghiệp mở thử'], 2, 'Kiểm tra nguồn gửi và đơn hàng bằng kênh độc lập trước khi tương tác với tệp.'],
    ['Tài khoản của bạn tự gửi tin nhắn xin tiền cho bạn bè. Nên làm gì?', ['Giữ im lặng', 'Đổi mật khẩu, thu hồi phiên lạ và cảnh báo người nhận', 'Chỉ xóa tin đã gửi', 'Gửi thêm mã xác thực cho người đang giữ tài khoản'], 1, 'Bảo vệ lại tài khoản và báo người nhận để họ không làm theo tin giả.'],
  ]),
  createQuiz('course-marketplace', [
    ['Người mua gửi ảnh biên lai, nhưng bạn chưa thấy tiền vào tài khoản. Bạn làm gì?', ['Giao hàng ngay', 'Yêu cầu thêm một ảnh biên lai', 'Tự kiểm tra giao dịch trong ứng dụng ngân hàng trước khi giao', 'Đưa mật khẩu để người mua kiểm tra'], 2, 'Ảnh biên lai có thể giả; chỉ giao khi tự xác nhận tiền đã nhận.'],
    ['Người mua gửi liên kết “nhận tiền” và yêu cầu nhập OTP. Bạn làm gì?', ['Nhập OTP để nhận tiền', 'Từ chối và kiểm tra tài khoản trong ứng dụng ngân hàng', 'Nhờ người mua nhập hộ', 'Chỉ nhập mật khẩu, không nhập OTP'], 1, 'Nhận tiền bán hàng không cần đăng nhập qua liên kết do người mua gửi.'],
    ['Sau khi quét QR tại quầy, màn hình hiện tên nhận tiền khác tên người bán đã xác nhận. Bạn làm gì?', ['Xác nhận vì QR luôn đúng', 'Chuyển một nửa trước', 'Bỏ qua tên người nhận', 'Dừng và hỏi lại người bán qua kênh trực tiếp'], 3, 'Đối chiếu người nhận trước khi xác nhận vì QR có thể bị thay thế.'],
    ['Trang đặt phòng giá rẻ yêu cầu chuyển cọc ngay cho tài khoản lạ. Bạn nên?', ['Kiểm tra cơ sở lưu trú qua kênh độc lập và chính sách đặt phòng', 'Chuyển ngay để giữ giá', 'Gửi thêm ảnh giấy tờ cá nhân', 'Chỉ nhìn số lượt thích của trang'], 0, 'Xác minh đơn vị bán và phương thức thanh toán trước khi đặt cọc.'],
    ['Bạn đã chuyển tiền nhầm cho tài khoản nghi lừa đảo. Bước đầu phù hợp?', ['Chuyển thêm để yêu cầu hoàn tiền', 'Xóa hết tin nhắn', 'Liên hệ ngân hàng qua kênh chính thức và giữ chứng từ', 'Đăng mật khẩu ngân hàng lên nhóm cảnh báo'], 2, 'Báo ngân hàng sớm và giữ bằng chứng để hỗ trợ xử lý.'],
    ['Người bán thúc ép “chỉ còn 2 phút” nhưng đổi số tài khoản nhận. Bạn làm gì?', ['Chuyển ngay', 'Dừng lại và xác minh lại người nhận', 'Gửi OTP để giữ đơn', 'Chuyển khoản thử số tiền lớn'], 1, 'Việc đổi tài khoản nhận cần được xác minh trước khi chuyển tiền.'],
    ['Người mua đề nghị bạn trả “phí mở khóa” để rút tiền bán hàng. Bạn nên?', ['Trả phí ngay', 'Trả một nửa', 'Đưa thông tin thẻ cho người mua', 'Dừng và kiểm tra qua kênh hỗ trợ chính thức của nền tảng'], 3, 'Yêu cầu trả phí để nhận tiền là dấu hiệu cần kiểm tra độc lập.'],
    ['Bạn nhận thông báo tiền đến từ ảnh chụp màn hình do người mua gửi. Nguồn nào đáng tin hơn?', ['Lịch sử giao dịch trong ứng dụng ngân hàng bạn tự mở', 'Ảnh chụp của người mua', 'Lời hứa sẽ gửi tiền sau', 'Email từ địa chỉ lạ'], 0, 'Tự kiểm tra giao dịch đã ghi nhận trong tài khoản của mình.'],
    ['Một mã QR dán trên bàn thanh toán che lên mã cũ. Bạn nên?', ['Quét và xác nhận ngay', 'Chỉ nhìn logo ngân hàng', 'Hỏi người bán và kiểm tra tên người nhận trên màn hình xác nhận', 'Gửi mã cho người lạ kiểm tra'], 2, 'Xác minh QR với người bán và đối chiếu thông tin nhận tiền.'],
    ['Người lạ hứa lấy lại tiền đặt cọc bị lừa nếu bạn trả phí trước. Bạn làm gì?', ['Trả phí để thử', 'Không trả; làm việc với ngân hàng và nơi tiếp nhận chính thức', 'Gửi thêm mật khẩu', 'Chuyển tiền qua tài khoản thứ hai'], 1, 'Không trả phí cho lời hứa thu hồi tiền; dùng kênh hỗ trợ chính thức.'],
  ]),
];
