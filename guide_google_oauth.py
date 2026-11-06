from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.section import WD_SECTION

out = r'C:\Users\Admin\OneDrive - vnua.edu.vn\Documents\ChatGPT\CyberAware AI\Huong dan cau hinh ket noi API Google.docx'
doc = Document()
sec = doc.sections[0]
sec.top_margin = Inches(.7); sec.bottom_margin = Inches(.7)
sec.left_margin = Inches(.8); sec.right_margin = Inches(.8)
styles = doc.styles
styles['Normal'].font.name = 'Aptos'; styles['Normal'].font.size = Pt(10.5)
styles['Title'].font.name='Aptos Display'; styles['Title'].font.size=Pt(25); styles['Title'].font.bold=True; styles['Title'].font.color.rgb=RGBColor(25,55,91)
for s in ['Heading 1','Heading 2']:
    styles[s].font.name='Aptos Display'; styles[s].font.color.rgb=RGBColor(25,83,124)
styles['Heading 1'].font.size=Pt(16); styles['Heading 1'].font.bold=True
styles['Heading 2'].font.size=Pt(12); styles['Heading 2'].font.bold=True

p=doc.add_paragraph(style='Title'); p.add_run('Cấu hình đăng nhập Google cho CyberAware AI')
p=doc.add_paragraph(); p.paragraph_format.space_after=Pt(10)
r=p.add_run('Hướng dẫn từng bước cho môi trường local và khi triển khai lên máy chủ'); r.italic=True; r.font.color.rgb=RGBColor(90,100,110)
doc.add_heading('Mục tiêu và thông tin cần có', level=1)
doc.add_paragraph('Tài liệu này hướng dẫn tạo OAuth client trên Google Cloud để người dùng đăng nhập CyberAware AI bằng tài khoản Google. Khi hoàn tất, ứng dụng nhận danh tính cơ bản qua các quyền openid, email và profile. Cấu hình thử nghiệm trên máy local có thể dùng ngay; để mở cho người dùng ngoài nhóm thử nghiệm, cần hoàn thiện Branding và xuất bản ứng dụng.')
for x in ['Quyền truy cập Google Cloud Console vào một project thông thường do bạn quản lý.','Địa chỉ chạy dự án: ví dụ http://localhost:3000.','Email Google dùng để quản trị và kiểm tra đăng nhập.']:
    doc.add_paragraph(x, style='List Bullet')
doc.add_heading('1. Chọn hoặc tạo project Google Cloud', level=1)
doc.add_paragraph('Mở Google Cloud Console và chọn project dành cho OAuth. Có thể dùng project thông thường đã có hoặc tạo project mới, chẳng hạn CyberAware AI OAuth. Nếu project do Google AI Studio quản lý dạng Starter Tier không cho tạo cấu hình OAuth (thiếu quyền tạo brand/client), hãy chuyển sang project Google Cloud thông thường mà bạn sở hữu. Không cần tiếp tục bấm Request access trên project Starter Tier.')
doc.add_paragraph('Một số tài khoản có thể được yêu cầu thiết lập thanh toán hoặc đăng ký Free Trial để tạo project. Đọc kỹ điều kiện và thông tin hiển thị trên Google trước khi xác nhận.')
doc.add_heading('2. Hoàn tất cấu hình Google Auth Platform', level=1)
doc.add_paragraph('Trong project vừa chọn, mở Google Auth Platform. Nếu thấy biểu mẫu Project configuration gồm nhiều bước, hoàn tất lần lượt:')
for x in ['App Information: nhập tên ứng dụng CyberAware AI và email hỗ trợ người dùng.','Audience: chọn External nếu người dùng đăng nhập bằng tài khoản Google cá nhân.','Contact Information: nhập email nhận thông báo dành cho nhà phát triển. Email này là địa chỉ liên hệ, không tự động trở thành người dùng thử.','Finish: xem lại thông tin rồi bấm Create.']:
    doc.add_paragraph(x, style='List Number')
doc.add_paragraph('Nếu ứng dụng đang ở trạng thái Testing, mở Audience → Test users → Add users và thêm địa chỉ Gmail sẽ dùng để thử. Chỉ tài khoản nằm trong danh sách thử nghiệm đăng nhập được khi ứng dụng còn ở trạng thái này.')
doc.add_heading('3. Tạo OAuth client cho website', level=1)
for x in ['Mở Google Auth Platform → Clients → Create client.','Chọn Application type là Web application. Đặt tên dễ nhận biết, ví dụ CyberAware AI Local.','Authorized JavaScript origins có thể để trống vì luồng hiện tại xử lý OAuth ở backend.','Trong Authorized redirect URIs, bấm Add URI và nhập chính xác callback bên dưới. Hãy thêm URI ở đúng mục redirect, không phải mục JavaScript origins.','Nếu có tùy chọn Use this client for an AI-powered agent, bỏ chọn vì client này dành cho đăng nhập website.','Bấm Create. Sao chép Client ID và Client secret để cấu hình máy chủ.']:
    doc.add_paragraph(x, style='List Number')
p=doc.add_paragraph(); p.paragraph_format.left_indent=Inches(.25)
r=p.add_run('http://localhost:3000/api/auth/oauth/google/callback'); r.bold=True; r.font.name='Consolas'; r.font.size=Pt(10)
doc.add_heading('4. Cấu hình biến môi trường của dự án', level=1)
doc.add_paragraph('Trong file .env ở thư mục dự án, điền các giá trị do Google cấp. Giữ Client secret ở backend; không đưa vào biến VITE_* hay mã frontend và không gửi secret qua chat.')
p=doc.add_paragraph(); p.paragraph_format.left_indent=Inches(.25)
r=p.add_run('APP_URL="http://localhost:3000"\nGOOGLE_CLIENT_ID="client-id-cua-ban"\nGOOGLE_CLIENT_SECRET="client-secret-cua-ban"'); r.font.name='Consolas'; r.font.size=Pt(9.5)
doc.add_paragraph('Thay các giá trị mẫu bằng thông tin thật. Lưu .env, dừng server đang chạy bằng Ctrl+C rồi khởi động lại:')
p=doc.add_paragraph(); p.paragraph_format.left_indent=Inches(.25); r=p.add_run('npm.cmd run dev'); r.font.name='Consolas'; r.font.bold=True
doc.add_heading('5. Kiểm tra đăng nhập local', level=1)
for x in ['Mở http://localhost:3000/api/auth/oauth/providers. Sau khi cấu hình đủ, cần thấy google là true.','Mở http://localhost:3000/dang-nhap và chọn nút Google.','Đăng nhập bằng tài khoản đã thêm vào Audience → Test users, chấp nhận quyền truy cập và kiểm tra ứng dụng quay lại trang chủ với phiên đăng nhập.']:
    doc.add_paragraph(x, style='List Number')
doc.add_paragraph('Nếu không hoạt động, kiểm tra project đang chọn, Client ID/secret, cổng trong APP_URL và callback URI. Địa chỉ callback phải khớp chính xác giữa Google Cloud và cấu hình ứng dụng, bao gồm giao thức, cổng và đường dẫn.')
doc.add_heading('6. Khi triển khai ứng dụng lên máy chủ', level=1)
doc.add_paragraph('Không cần sửa logic gọi OAuth chỉ vì đổi từ local sang server. Cần đổi cấu hình theo domain công khai của ứng dụng:')
for x in ['Đặt APP_URL thành địa chỉ HTTPS, ví dụ https://ten-mien-cua-ban.','Trong cùng OAuth client, thêm Authorized redirect URI: https://ten-mien-cua-ban/api/auth/oauth/google/callback. Có thể giữ lại callback localhost để tiếp tục phát triển.','Cấu hình GOOGLE_CLIENT_ID và GOOGLE_CLIENT_SECRET trong biến môi trường bảo mật của máy chủ rồi khởi động lại ứng dụng.','Hoàn thiện trang Branding, gồm trang chủ và chính sách quyền riêng tư công khai phù hợp, rồi dùng Audience → Publish app để chuyển ứng dụng khỏi Testing khi sẵn sàng cho người dùng rộng rãi. Google có thể yêu cầu thêm thông tin hoặc xác minh tùy cấu hình và quyền được yêu cầu.']:
    doc.add_paragraph(x, style='List Number')
doc.add_paragraph('localhost chỉ truy cập được từ máy đang chạy ứng dụng. Việc chuyển OAuth sang trạng thái production không tự đưa website lên Internet; cần có máy chủ và domain công khai để người dùng khác truy cập.')
doc.add_heading('Ghi chú về tài khoản', level=1)
doc.add_paragraph('Google có thể liên kết với tài khoản CyberAware AI đã tồn tại cùng email nếu Google xác nhận email đó. Trước khi mở ứng dụng rộng rãi, hãy thử đầy đủ luồng đăng nhập và rà soát trang Branding cùng trạng thái xuất bản.')
doc.add_heading('Phần tiếp theo', level=1)
doc.add_paragraph('Tài liệu hiện bao gồm cấu hình Google. Phần cấu hình Facebook có thể được bổ sung vào các mục tiếp theo khi có hướng dẫn tương ứng.')

doc.core_properties.title='Cấu hình đăng nhập Google cho CyberAware AI'
doc.core_properties.subject='Hướng dẫn OAuth Google local và production'
doc.save(out)
print(out)
