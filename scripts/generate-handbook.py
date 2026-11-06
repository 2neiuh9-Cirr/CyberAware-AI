"""Generate the downloadable Vietnamese safety handbook for the public site."""

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    KeepTogether,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public" / "cam-nang-an-toan-so-cyberaware.pdf"
pdfmetrics.registerFont(TTFont("Tahoma", r"C:\Windows\Fonts\tahoma.ttf"))
pdfmetrics.registerFont(TTFont("Tahoma-Bold", r"C:\Windows\Fonts\tahomabd.ttf"))
pdfmetrics.registerFontFamily("Tahoma", normal="Tahoma", bold="Tahoma-Bold")

NAVY = colors.HexColor("#0F172A")
BLUE = colors.HexColor("#004AC6")
GREEN = colors.HexColor("#047857")
MUTED = colors.HexColor("#475569")
PALE = colors.HexColor("#EFF6FF")
PAGE_W, PAGE_H = A4

styles = {
    "eyebrow": ParagraphStyle("eyebrow", fontName="Tahoma-Bold", fontSize=9, leading=13, textColor=GREEN, spaceAfter=8),
    "title": ParagraphStyle("title", fontName="Tahoma-Bold", fontSize=23, leading=31, textColor=NAVY, spaceAfter=10),
    "intro": ParagraphStyle("intro", fontName="Tahoma", fontSize=10.4, leading=16, textColor=MUTED, spaceAfter=15),
    "section": ParagraphStyle("section", fontName="Tahoma-Bold", fontSize=13, leading=19, textColor=BLUE, spaceBefore=12, spaceAfter=7),
    "body": ParagraphStyle("body", fontName="Tahoma", fontSize=9.5, leading=15, textColor=NAVY, spaceAfter=6),
    "small": ParagraphStyle("small", fontName="Tahoma", fontSize=8.5, leading=13, textColor=MUTED, spaceAfter=5),
    "card": ParagraphStyle("card", fontName="Tahoma", fontSize=9.3, leading=15, textColor=NAVY),
}


def p(text, style="body"):
    return Paragraph(text, styles[style])


def section(title, lines):
    return KeepTogether([p(title, "section"), *[p(f"•  {line}") for line in lines]])


def box(title, body):
    content = [p(title, "section"), p(body, "card")]
    table = Table([[content]], colWidths=[170 * mm])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), PALE),
        ("BOX", (0, 0), (-1, -1), 0.6, colors.HexColor("#BFDBFE")),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    return table


def decorate(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(BLUE)
    canvas.rect(0, PAGE_H - 11 * mm, PAGE_W, 11 * mm, fill=1, stroke=0)
    canvas.setFont("Tahoma-Bold", 8)
    canvas.setFillColor(colors.white)
    canvas.drawString(19 * mm, PAGE_H - 7.3 * mm, "CYBERAWARE AI  |  CẨM NANG AN TOÀN SỐ")
    canvas.setStrokeColor(colors.HexColor("#CBD5E1"))
    canvas.line(19 * mm, 17 * mm, PAGE_W - 19 * mm, 17 * mm)
    canvas.setFont("Tahoma", 7.5)
    canvas.setFillColor(MUTED)
    canvas.drawString(19 * mm, 12 * mm, "Tài liệu hướng dẫn phổ thông • Không thay thế xác minh từ ngân hàng hoặc cơ quan chức năng")
    canvas.drawRightString(PAGE_W - 19 * mm, 12 * mm, f"{doc.page}")
    canvas.restoreState()


doc = BaseDocTemplate(str(OUTPUT), pagesize=A4, leftMargin=19 * mm, rightMargin=19 * mm, topMargin=20 * mm, bottomMargin=23 * mm)
frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
doc.addPageTemplates(PageTemplate(id="handbook", frames=frame, onPage=decorate))

story = [
    p("HƯỚNG DẪN NHANH • DÀNH CHO MỌI NGƯỜI", "eyebrow"),
    p("Bình tĩnh nhận diện,\nchủ động phòng tránh lừa đảo", "title"),
    p("Dùng cẩm nang này khi nhận cuộc gọi, tin nhắn, đường dẫn hoặc yêu cầu chuyển tiền đáng ngờ. Hãy dành một phút kiểm tra trước khi hành động.", "intro"),
    box("Quy tắc 3 không", "<b>Không</b> đưa mật khẩu hoặc OTP. <b>Không</b> chuyển tiền khi bị thúc ép. <b>Không</b> mở liên kết hoặc cài ứng dụng từ người lạ."),
    Spacer(1, 7 * mm),
    section("1. Nhận diện dấu hiệu thường gặp", [
        "Tự xưng ngân hàng, công an, nhân viên giao hàng hoặc người thân; yêu cầu giữ bí mật và làm ngay.",
        "Báo trúng thưởng, hoàn tiền, nhận quà; yêu cầu nộp phí hoặc cung cấp thông tin trước.",
        "Gửi đường dẫn giống tên thương hiệu nhưng tên miền lạ; yêu cầu đăng nhập hoặc nhập mã xác thực.",
        "Dùng giọng nói hoặc video giống người quen để nhờ chuyển tiền gấp. Hình ảnh và âm thanh đều có thể bị giả mạo.",
    ]),
    section("2. Kiểm tra trước khi tin", [
        "Tạm dừng cuộc trò chuyện. Tự gọi lại số đã lưu của người thân hoặc số hỗ trợ trong ứng dụng/thẻ ngân hàng.",
        "Tự mở ứng dụng hoặc gõ địa chỉ website quen thuộc. Đừng đi theo liên kết trong tin nhắn đáng ngờ.",
        "Đối chiếu tên người nhận, số tài khoản, mục đích chuyển tiền bằng một kênh liên lạc khác.",
        "Có thể dùng CyberAware AI để xem dấu hiệu rủi ro, nhưng kết quả thấp không chứng minh đối tượng an toàn.",
    ]),
    PageBreak(),
    p("NẾU ĐÃ LỠ THAO TÁC", "eyebrow"),
    p("Các bước xử lý ngay", "title"),
    p("Làm theo tình huống đã xảy ra. Ghi lại thời điểm, số điện thoại, tài khoản nhận và nội dung trao đổi để hỗ trợ xác minh.", "intro"),
    section("Đã nhập mật khẩu hoặc OTP", [
        "Dùng thiết bị và đường truy cập tin cậy để đổi mật khẩu; đăng xuất các phiên lạ nếu dịch vụ hỗ trợ.",
        "Liên hệ ngay đơn vị cung cấp tài khoản. Nếu liên quan ngân hàng, yêu cầu khóa hoặc kiểm soát giao dịch.",
        "Kiểm tra email, số điện thoại khôi phục và giao dịch gần đây; bật xác thực nhiều bước nếu có.",
    ]),
    section("Đã chuyển tiền", [
        "Gọi ngay tổng đài chính thức của ngân hàng để báo giao dịch nghi lừa đảo và hỏi thủ tục tra soát/phong tỏa.",
        "Lưu biên lai, mã giao dịch, thông tin tài khoản nhận và toàn bộ bằng chứng liên lạc.",
        "Trình báo cơ quan công an nơi gần nhất. Không trả thêm tiền cho người hứa lấy lại tiền hộ.",
    ]),
    section("Đã mở liên kết hoặc cài ứng dụng lạ", [
        "Ngừng tương tác với trang hoặc ứng dụng. Gỡ ứng dụng lạ và kiểm tra quyền truy cập đã cấp.",
        "Từ một thiết bị tin cậy, đổi mật khẩu các tài khoản có nguy cơ; liên hệ ngân hàng nếu đã nhập dữ liệu thanh toán.",
        "Nhờ người có chuyên môn kiểm tra thiết bị nếu có dấu hiệu bị điều khiển hoặc mất quyền truy cập.",
    ]),
    Spacer(1, 3 * mm),
    box("Ghi nhớ", "Không có công cụ quét nào bảo đảm an toàn tuyệt đối. CyberAware AI dựa trên bộ quy tắc và báo cáo cộng đồng đã duyệt; tính năng Gemini chỉ bổ sung phần giải thích khi được cấu hình. Không nhập mật khẩu, OTP hay dữ liệu bí mật vào ô kiểm tra."),
]

OUTPUT.parent.mkdir(parents=True, exist_ok=True)
doc.build(story)
print(OUTPUT)
