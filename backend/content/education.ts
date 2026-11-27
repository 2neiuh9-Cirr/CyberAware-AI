// Phần bài học mở rộng theo mã khóa học và vị trí module.
export const lessonExtras: Record<string, string[]> = {
  'course-deepfake': [
    'Tình huống: một tài khoản quen gọi video xin tiền cấp cứu. Công nghệ tạo giọng và khuôn mặt có thể làm cuộc gọi rất thuyết phục; tài khoản của người thân cũng có thể bị chiếm. Đừng dựa vào độ rõ của video, cách chớp mắt hay việc người gọi biết tên bạn. Hãy tạm dừng giao dịch và gọi lại số điện thoại đã lưu từ trước. Nếu không liên hệ được, hỏi thêm người thân khác qua kênh độc lập. Chỉ quyết định sau khi xác minh được người nhận tiền.',
    'Thực hành quy tắc ba bước: (1) ngắt cuộc gọi đang gây áp lực, (2) tự gọi số đã lưu hoặc gặp trực tiếp, (3) kiểm tra tên chủ tài khoản trước khi chuyển tiền. Câu hỏi bí mật là một lớp kiểm tra bổ sung, vì thông tin trên mạng xã hội có thể bị lộ. Chất lượng hình ảnh, tiếng giật hoặc thời lượng cuộc gọi chỉ là dấu hiệu tham khảo; đường truyền yếu cũng có thể tạo hiện tượng tương tự.'
  ],
  'course-banking': [
    'Ví dụ: một người tự xưng là nhân viên ngân hàng yêu cầu đọc mã OTP để hủy giao dịch. OTP có thể dùng để đăng nhập hoặc xác nhận chuyển tiền; đọc mã cho người khác có thể giúp họ hoàn tất thao tác. Nếu bạn không chủ động thực hiện giao dịch, không nhập mã và không bấm xác nhận. Tự mở ứng dụng ngân hàng để kiểm tra, sau đó liên hệ số hỗ trợ trên thẻ hoặc ứng dụng nếu thấy bất thường.',
    'Một trang có biểu tượng ổ khóa vẫn có thể là trang giả: HTTPS chỉ mã hóa đường truyền. Đọc tên miền từ phải sang trái để xác định trang thuộc về ai; ví dụ bank.example.attacker.invalid thuộc attacker.invalid. Đừng truy cập từ link trong SMS hoặc quảng cáo. Hãy mở ứng dụng ngân hàng đã cài hoặc địa chỉ bạn tự lưu từ trước. Nếu đã nhập mật khẩu vào trang nghi giả, đổi mật khẩu từ thiết bị an toàn và liên hệ ngân hàng.',
    'Trước khi xác nhận chuyển khoản, đối chiếu tên người nhận, số tiền và nội dung trên màn hình cuối. Mã QR có thể bị dán đè hoặc thay thế nên không chỉ nhìn logo. Đặt hạn mức chuyển khoản theo nhu cầu, bật thông báo giao dịch và khóa màn hình thiết bị. Khi thấy yêu cầu xác nhận không do mình tạo, từ chối, kiểm tra lịch sử và liên hệ ngân hàng qua kênh đã biết.'
  ],
  'course-parents': [
    'Người lạ có thể nói rất tự tin, biết tên và địa chỉ của bạn, rồi dọa liên quan một vụ án. Thông tin cá nhân có thể đã bị lộ; lời đe dọa không phải bằng chứng. Hãy dừng cuộc gọi, không chuyển tiền để chứng minh vô tội và hỏi người thân tin cậy. Nếu cần, đến trực tiếp nơi tiếp nhận phù hợp hoặc gọi kênh chính thức mà bạn tự tìm từ trước.',
    'Tên hiển thị của số gọi đến và đầu số trong nước đều có thể gây nhầm lẫn. Hãy hỏi mình: ai là người chủ động liên hệ, họ có thúc ép giữ bí mật hoặc làm ngay không, có yêu cầu mã xác thực hay chuyển tiền không? Nếu có, ngắt liên lạc và kiểm tra qua ứng dụng hoặc giấy tờ đã có. Không gọi lại số do chính người lạ cung cấp để xác minh họ.',
    'Cùng gia đình lập một danh bạ giấy hoặc điện thoại gồm số người thân, ngân hàng và đơn vị hỗ trợ đã xác minh. Thống nhất trước một cách gọi lại khi có yêu cầu tiền gấp. Tập cho người lớn tuổi nói: “Tôi sẽ kiểm tra lại và gọi sau”. Nếu đã lỡ chuyển tiền, lưu tin nhắn, biên lai và liên hệ ngay ngân hàng để được hướng dẫn.'
  ],
  'course-crisis': [
    'Phân biệt các tình huống: chỉ mở một đường link không chứng minh thiết bị đã nhiễm mã độc; nhập mật khẩu làm lộ thông tin đăng nhập; cài ứng dụng lạ và cấp quyền có thể tăng rủi ro thiết bị bị kiểm soát. Nếu nghi đã cài phần mềm độc hại, ngắt kết nối thiết bị đó và dùng thiết bị khác đáng tin cậy để liên hệ hỗ trợ. Ghi lại thời điểm, trang và thao tác bạn đã làm.',
    'Nếu đã nhập thông tin ngân hàng, OTP hoặc chuyển tiền, liên hệ ngân hàng càng sớm càng tốt qua số trên thẻ hoặc ứng dụng chính thức. Nói rõ giao dịch, thời điểm và tài khoản nhận để ngân hàng hướng dẫn khóa truy cập hoặc xử lý giao dịch. Không làm theo số điện thoại do trang đáng ngờ cung cấp. Không có bảo đảm tiền sẽ được hoàn lại, nhưng báo sớm giúp tăng cơ hội xử lý.',
    'Từ thiết bị an toàn, đổi mật khẩu những tài khoản liên quan, thu hồi các phiên đăng nhập và kiểm tra quyền của ứng dụng. Giữ lại tin nhắn, liên kết, ảnh chụp và biên lai để trình báo. Không xóa bằng chứng trước khi ghi lại. Cảnh giác với người hứa chắc chắn lấy lại tiền nhưng đòi phí trước: đây có thể là một vụ lừa đảo tiếp theo.'
  ]
};
// Each entry: fourth option and the explanation for A, B, C, D.
// Giải thích lựa chọn đáp án, dùng khi hiển thị phản hồi sau câu hỏi.
export const answerDetails: Record<string, [string, string, string, string, string][]> = {
 'course-deepfake': [
  ['Hỏi lại trong cùng tài khoản mạng xã hội', 'Sai: chuyển ngay bỏ qua xác minh người nhận.', 'Đúng: số đã lưu trước là kênh độc lập với cuộc gọi đáng ngờ.', 'Sai: video bổ sung vẫn có thể do cùng đối tượng tạo.', 'Sai: tài khoản nhắn tin có thể đã bị chiếm.'],
  ['Có nếu người gọi biết biệt danh của bạn', 'Sai: hình rõ nét không chứng minh danh tính.', 'Đúng: video và giọng nói có thể bị giả mạo.', 'Sai: ứng dụng quen thuộc vẫn có thể chứa tài khoản bị chiếm.', 'Sai: biệt danh cũng có thể đã bị lộ.'],
  ['Có nếu giọng nói rất giống', 'Sai: tên gia đình có thể thu thập từ mạng xã hội.', 'Đúng: cần gọi lại hoặc hỏi qua kênh độc lập.', 'Sai: địa chỉ cũng có thể bị lộ.', 'Sai: giọng nói có thể bị giả mạo.'],
  ['Chắc chắn là cuộc gọi thật', 'Sai: hình giật không chứng minh deepfake.', 'Đúng: lỗi đường truyền cũng gây giật hình.', 'Sai: hình mượt cũng có thể bị giả.', 'Sai: không thể xác minh chỉ bằng chất lượng hình.'],
  ['Chỉ nhắn lại trong tài khoản đang gọi', 'Sai: người gọi có thể kiểm soát số mới.', 'Đúng: số đã lưu trước giảm nguy cơ gọi lại kẻ giả mạo.', 'Sai: chính người lạ cung cấp số nên không độc lập.', 'Sai: tài khoản đang gọi có thể đã bị chiếm.']
 ],
 'course-banking': [
  ['Có nếu họ gửi ảnh thẻ nhân viên', 'Sai: biết tên bạn không chứng minh họ là nhân viên.', 'Đúng: không chia sẻ OTP với bất kỳ người gọi nào.', 'Sai: lời giải thích khẩn cấp không thay đổi mục đích của OTP.', 'Sai: ảnh thẻ nhân viên cũng có thể bị giả mạo.'],
  ['Gửi mã OTP theo hướng dẫn trong tin nhắn', 'Sai: liên kết trong tin nhắn có thể dẫn tới trang giả để lấy mật khẩu.', 'Đúng: tự mở ứng dụng ngân hàng là cách kiểm tra độc lập.', 'Sai: trả lời tin nhắn vẫn tương tác với nguồn chưa xác minh.', 'Sai: mã OTP có thể bị dùng để đăng nhập hoặc xác nhận giao dịch.'],
  ['Đưa mật khẩu ngân hàng cho người gọi để họ hỗ trợ', 'Sai: ứng dụng lạ và quyền điều khiển có thể khiến bạn mất quyền kiểm soát thiết bị.', 'Đúng: tự gọi số hỗ trợ chính thức để kiểm tra yêu cầu.', 'Sai: quyền xem màn hình cũng có thể làm lộ thông tin nhạy cảm.', 'Sai: không chia sẻ mật khẩu cho người gọi tự xưng hỗ trợ.'],
  ['Chỉ kiểm tra tên ngân hàng', 'Sai: logo có thể bị sao chép.', 'Đúng: tên người nhận và số tiền quyết định nơi tiền đến.', 'Sai: số mã QR không xác minh người nhận.', 'Sai: tên ngân hàng không xác minh đúng người nhận.'],
  ['Đóng ứng dụng mà không kiểm tra tài khoản', 'Đúng: từ chối và kiểm tra tài khoản qua kênh chính thức.', 'Sai: xác nhận có thể cho phép giao dịch lạ.', 'Sai: gửi OTP tạo thêm rủi ro mất quyền truy cập.', 'Sai: cần kiểm tra tài khoản và liên hệ ngân hàng nếu có dấu hiệu lạ.']
 ],
 'course-parents': [
  ['Chỉ chuyển một phần tiền', 'Sai: chuyển tiền theo đe dọa có thể mất tiền.', 'Đúng: dừng và xác minh độc lập.', 'Sai: OTP không dùng để chứng minh vô tội.', 'Sai: chuyển một phần vẫn có thể mất tiền.'],
  ['Có nếu số hiện tên cơ quan', 'Sai: đầu số không xác minh người gọi.', 'Đúng: số có thể bị giả hoặc người lạ dùng.', 'Sai: đầu số 09 cũng không bảo đảm uy tín.', 'Sai: tên hiển thị không xác minh danh tính người gọi.'],
  ['Nhờ người gọi gửi thêm ảnh quà', 'Đúng: kiểm tra chương trình qua kênh đã biết.', 'Sai: trả phí vội có thể mất tiền.', 'Sai: ảnh giấy tờ là dữ liệu nhạy cảm.', 'Sai: ảnh quà không chứng minh chương trình là thật.'],
  ['Chỉ hỏi người gọi thêm lý do', 'Sai: bí mật tạo điều kiện cô lập nạn nhân.', 'Đúng: người tin cậy giúp kiểm chứng.', 'Sai: chuyển tiền trước khi hỏi có thể không thu hồi được.', 'Sai: hỏi thêm trong cùng cuộc gọi không phải xác minh độc lập.'],
  ['Chỉ lưu số tổng đài trong tin nhắn lạ', 'Đúng: danh bạ đã xác minh giúp gọi đúng nơi.', 'Sai: số người lạ gửi có thể dẫn tới đồng phạm.', 'Sai: số do người lạ cung cấp không độc lập.', 'Sai: số trong tin nhắn lạ chưa được xác minh.']
 ],
 'course-crisis': [
  ['Đổi mật khẩu ngay trên trang giả', 'Sai: chờ đợi kéo dài thời gian tài khoản bị lộ.', 'Đúng: báo ngân hàng qua kênh chính thức và đổi mật khẩu từ thiết bị an toàn.', 'Sai: trang giả có thể tiếp tục thu mật khẩu.', 'Sai: không đổi mật khẩu qua trang đáng ngờ.'],
  ['Có nếu họ gửi ảnh giấy tờ', 'Sai: lời hứa chắc chắn và phí trước là dấu hiệu đáng ngờ.', 'Đúng: không thể bảo đảm lấy lại tiền.', 'Sai: tài khoản mạng xã hội cũng có thể giả mạo.', 'Sai: ảnh giấy tờ cũng có thể bị giả hoặc bị lấy cắp.'],
  ['Chỉ nhớ thời điểm, không lưu chứng từ', 'Sai: xóa ngay làm mất chứng cứ.', 'Đúng: giữ tin nhắn, biên lai và thời điểm.', 'Sai: nội dung cũng giúp dựng lại sự việc.', 'Sai: cần giữ chứng từ để đối chiếu và trình báo.'],
  ['Nhờ người gọi đổi mật khẩu hộ', 'Đúng: thiết bị an toàn giảm nguy cơ lộ mật khẩu mới.', 'Sai: ứng dụng lạ có thể theo dõi thao tác.', 'Sai: không dùng thiết bị người lạ kiểm soát.', 'Sai: không giao quyền đổi mật khẩu cho người lạ.'],
  ['Chỉ có nếu trang trông đáng ngờ', 'Sai: chỉ bấm link chưa đủ để kết luận nhiễm mã độc.', 'Đúng: cần biết có nhập thông tin hay cài ứng dụng không.', 'Sai: cảnh báo trình duyệt không phải phép thử duy nhất.', 'Sai: vẻ ngoài trang không xác định thiết bị có nhiễm mã độc.']
 ]
};

// Lựa chọn thứ ba của bộ câu hỏi được tách riêng để hoàn thiện dữ liệu học tập.
export const thirdChoices: Record<string, string[]> = {
  'course-deepfake': ['', 'Có nếu gọi trên ứng dụng quen thuộc', 'Có nếu biết địa chỉ nhà', 'Có nếu video rất mượt', 'Gọi số trong tin nhắn vừa nhận'],
  'course-banking': ['Có nếu họ nói đang khóa giao dịch', '', '', 'Chỉ kiểm tra số lượng mã QR', 'Gửi OTP cho người gọi để hỏi'],
  'course-parents': ['Đọc OTP để chứng minh danh tính', 'Có nếu số bắt đầu bằng 09', 'Gửi ảnh căn cước để giữ quà', 'Chuyển tiền rồi mới báo gia đình', 'Lưu số do người gọi lạ cung cấp'],
  'course-crisis': ['Đăng nhập lại cùng trang để kiểm tra', 'Có nếu họ nhắn trên mạng xã hội', 'Chỉ giữ số tài khoản, xóa nội dung', 'Đổi trên thiết bị người lạ hướng dẫn', 'Chỉ có nếu trình duyệt hiện cảnh báo'],
};
