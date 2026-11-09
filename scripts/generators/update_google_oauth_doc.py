from docx import Document
from docx.shared import Inches, Pt, RGBColor
from pathlib import Path

docs_dir = Path(__file__).resolve().parents[2] / 'docs' / 'guides'
source_path = docs_dir / 'Huong dan cau hinh ket noi API Google.docx'
output_path = docs_dir / 'Huong dan cau hinh ket noi API Google va Facebook.docx'
doc = Document(source_path)

# Replace the temporary note that Facebook would be added later.
paras = list(doc.paragraphs)
for i, p in enumerate(paras):
    if p.text.strip() == 'Phần tiếp theo':
        p._element.getparent().remove(p._element)
        if i + 1 < len(paras):
            paras[i + 1]._element.getparent().remove(paras[i + 1]._element)
        break

doc.add_page_break()
doc.add_heading('Cấu hình đăng nhập Facebook', level=1)
doc.add_paragraph('Phần này hướng dẫn cấu hình Facebook Login cho môi trường phát hành. Meta cần truy cập được website qua HTTPS và các thông tin trong hồ sơ ứng dụng phải khớp với cách CyberAware AI thực sự xử lý dữ liệu. Trước khi gửi xét duyệt, hãy hoàn tất website và các trang chính sách bên dưới.')

doc.add_heading('1. Chuẩn bị website công khai', level=2)
doc.add_paragraph('Tạo website có domain và HTTPS, ví dụ https://cyberaware.example.com. Địa chỉ localhost chỉ dùng để kiểm tra trên máy của bạn; Meta và người xét duyệt cần truy cập được website công khai.')
doc.add_paragraph('Đưa lên hai trang công khai trước khi khai báo trong Meta:')
for s in [
    'Chính sách quyền riêng tư: nêu rõ CyberAware AI nhận tên, email và mã định danh Facebook để đăng nhập; dữ liệu nào được lưu (chẳng hạn tiến độ học, báo cáo và lịch sử quét), mục đích sử dụng và thông tin liên hệ.',
    'Hướng dẫn xóa dữ liệu: mô tả cách người dùng yêu cầu xóa tài khoản và dữ liệu liên quan. Hãy xây dựng quy trình và trang hoạt động thật trước khi khai URL với Meta.'
]: doc.add_paragraph(s, style='List Bullet')

doc.add_heading('2. Hoàn thiện Thông tin cơ bản của ứng dụng Meta', level=2)
doc.add_paragraph('Mở Cài đặt ứng dụng → Thông tin cơ bản. Theo thông báo hiện tại, hãy hoàn thiện bốn mục còn thiếu:')
for s in [
    'Tải biểu tượng ứng dụng kích thước 1024 × 1024 px.',
    'Chọn Hạng mục là Giáo dục.',
    'Nhập URL HTTPS đầy đủ của trang Chính sách quyền riêng tư.',
    'Trong Xóa dữ liệu người dùng, chọn URL hướng dẫn xóa dữ liệu và nhập URL trang hướng dẫn.'
]: doc.add_paragraph(s, style='List Number')
doc.add_paragraph('Sau đó chọn Thêm Nền tảng → Website, nhập domain HTTPS công khai của ứng dụng và bấm Save changes.')

doc.add_heading('3. Cập nhật callback cho domain thật', level=2)
doc.add_paragraph('Trong Trường hợp sử dụng → Đăng nhập bằng Facebook → Cài đặt, thêm callback sau vào URI chuyển hướng OAuth hợp lệ:')
p=doc.add_paragraph(); p.paragraph_format.left_indent=Inches(.25)
r=p.add_run('https://ten-mien-cua-ban/api/auth/oauth/facebook/callback'); r.font.name='Consolas'; r.font.size=Pt(10); r.bold=True
doc.add_paragraph('Trên server, đặt APP_URL bằng domain HTTPS thật. Đặt FACEBOOK_APP_ID và FACEBOOK_APP_SECRET trong biến môi trường backend, giữ secret ở server và khởi động lại ứng dụng. Domain, giao thức HTTPS và đường dẫn callback phải khớp chính xác. Cơ chế tự cho phép localhost khi phát triển không thay thế callback cho website công khai.')
p=doc.add_paragraph(); p.paragraph_format.left_indent=Inches(.25)
r=p.add_run('APP_URL="https://ten-mien-cua-ban"\nFACEBOOK_APP_ID="app-id-cua-ban"\nFACEBOOK_APP_SECRET="app-secret-cua-ban"\nFACEBOOK_GRAPH_VERSION="v25.0"'); r.font.name='Consolas'; r.font.size=Pt(9.5)

doc.add_heading('4. Hoàn tất bước Xác minh', level=2)
doc.add_paragraph('Mở trang Xác minh của ứng dụng và thực hiện theo lựa chọn Meta yêu cầu về Trang quản lý tài sản doanh nghiệp. Khai đúng chủ sở hữu ứng dụng là doanh nghiệp, tổ chức hay cá nhân theo thực tế; không tạo thông tin doanh nghiệp không có thật.')

doc.add_heading('5. Chuẩn bị và gửi xét duyệt ứng dụng', level=2)
doc.add_paragraph('Trong Xét duyệt ứng dụng, các quyền email và public_profile có thể đang ở trạng thái Chưa gửi. Bấm Tiếp và hoàn thành các phần Meta yêu cầu:')
for s in [
    'Cách sử dụng hợp lệ: giải thích rằng ứng dụng chỉ dùng tên và email Facebook để tạo hoặc tìm tài khoản CyberAware AI và đăng nhập.',
    'Xử lý dữ liệu: mô tả đúng cách dự án lưu, bảo vệ và xóa dữ liệu thực tế. Không khai quy trình chưa được triển khai.',
    'Hướng dẫn người xét duyệt: cung cấp URL website, các bước chọn Tiếp tục với Facebook và cách xác nhận người dùng đã đăng nhập. Nếu Meta yêu cầu nền tảng Website, hoàn tất mục đó trước.'
]: doc.add_paragraph(s, style='List Bullet')
doc.add_paragraph('Chỉ bấm Gửi đi xét duyệt sau khi website, callback và các URL chính sách hoạt động thật. Meta thông báo nội dung đã gửi để xét duyệt có thể không sửa hoặc hủy được trong lúc chờ xử lý.')

doc.add_heading('6. Phát hành và kiểm tra', level=2)
doc.add_paragraph('Khi Meta chấp thuận yêu cầu và các bước còn lại đã hoàn tất, mở trang Đăng để phát hành ứng dụng. Sau đó thử đăng nhập bằng một tài khoản Facebook không có vai trò quản trị viên, developer hoặc tester. Đăng nhập thành công bằng tài khoản này mới xác nhận người dùng phổ thông có thể dùng Facebook Login.')

doc.add_heading('Thứ tự ưu tiên', level=2)
doc.add_paragraph('Việc đầu tiên là đưa website HTTPS lên Internet và hoàn thiện hai trang Chính sách quyền riêng tư, Hướng dẫn xóa dữ liệu. Khi các trang này chưa tồn tại hoặc chưa hoạt động, chưa thể hoàn tất hồ sơ phát hành Meta.')

doc.core_properties.title = 'Hướng dẫn cấu hình kết nối API Google và Facebook'
doc.core_properties.subject = 'Cấu hình OAuth Google và Facebook cho CyberAware AI'
doc.save(output_path)
print(output_path)
