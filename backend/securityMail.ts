type SecurityMail = { subject: string; text: string; html: string };

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character]!);

function layout(preheader: string, heading: string, content: string): string {
  return `<!doctype html>
<html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f6fb;color:#0f172a;font-family:Arial,Helvetica,sans-serif">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(preheader)}</div>
  <table role="presentation" style="width:100%;border-collapse:collapse;background:#f3f6fb"><tr><td style="padding:32px 16px" align="center">
    <table role="presentation" style="width:100%;max-width:600px;border-collapse:collapse;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px">
      <tr><td style="padding:28px 32px;background:#004ac6;color:#ffffff;border-radius:16px 16px 0 0">
        <div style="font-size:20px;font-weight:700">CyberAware AI</div>
        <div style="font-size:12px;margin-top:5px;color:#dbeafe">Thông báo bảo mật tài khoản</div>
      </td></tr>
      <tr><td style="padding:32px;font-size:15px;line-height:1.7">
        <h1 style="font-size:22px;line-height:1.3;margin:0 0 20px;color:#0f172a">${escapeHtml(heading)}</h1>
        ${content}
        <p style="font-size:12px;color:#64748b;margin:28px 0 0;border-top:1px solid #e2e8f0;padding-top:18px">Đây là email tự động của CyberAware AI. Hãy sử dụng kênh hỗ trợ chính thức của ứng dụng nếu bạn cần trợ giúp.</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}

export function resetCodeMail(name: string, code: string): SecurityMail {
  const safeName = escapeHtml(name);
  const safeCode = escapeHtml(code);
  return {
    subject: '[CyberAware AI] Mã xác thực đặt lại mật khẩu',
    text: `Xin chào ${name},\n\nChúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản CyberAware AI của bạn.\n\nMÃ XÁC THỰC: ${code}\n\nMã gồm 8 chữ số, chỉ dùng một lần và hết hạn sau 5 phút kể từ khi được gửi. Hãy nhập mã trên trang khôi phục mật khẩu để tiếp tục.\n\nLƯU Ý BẢO MẬT\n- Không chia sẻ mã này cho bất kỳ ai, kể cả người tự nhận là nhân viên CyberAware AI.\n- Chúng tôi không yêu cầu bạn cung cấp mã qua điện thoại, tin nhắn hoặc mạng xã hội.\n- Nếu bạn không thực hiện yêu cầu này, đừng sử dụng mã. Hãy liên hệ quản trị viên qua kênh hỗ trợ chính thức của CyberAware AI để được kiểm tra tài khoản.\n\nĐây là email tự động của CyberAware AI.`,
    html: layout('Mã xác thực của bạn có hiệu lực trong 5 phút. Không chia sẻ mã cho bất kỳ ai.', 'Đặt lại mật khẩu', `
      <p style="margin:0 0 16px">Xin chào <strong>${safeName}</strong>,</p>
      <p style="margin:0 0 20px">Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản CyberAware AI của bạn.</p>
      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:22px;text-align:center;margin:0 0 18px">
        <div style="font-size:12px;font-weight:700;letter-spacing:1px;color:#1e40af">MÃ XÁC THỰC CỦA BẠN</div>
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:32px;font-weight:700;letter-spacing:7px;color:#004ac6;margin-top:8px">${safeCode}</div>
      </div>
      <p style="margin:0 0 20px"><strong>Hiệu lực 5 phút</strong> kể từ khi được gửi và chỉ dùng một lần. Hãy nhập mã trên trang khôi phục mật khẩu để tiếp tục.</p>
      <div style="background:#fff7ed;border-left:4px solid #ea580c;border-radius:8px;padding:16px 18px">
        <strong style="color:#9a3412">Lưu ý bảo mật</strong>
        <ul style="margin:10px 0 0;padding-left:20px;color:#334155">
          <li>Không chia sẻ mã này cho bất kỳ ai, kể cả người tự nhận là nhân viên CyberAware AI.</li>
          <li>Chúng tôi không yêu cầu bạn cung cấp mã qua điện thoại, tin nhắn hoặc mạng xã hội.</li>
          <li>Nếu bạn không thực hiện yêu cầu này, đừng sử dụng mã. Hãy liên hệ quản trị viên qua kênh hỗ trợ chính thức của CyberAware AI để được kiểm tra tài khoản.</li>
        </ul>
      </div>`),
  };
}

export function verificationCodeMail(name: string, code: string): SecurityMail {
  return {
    subject: '[CyberAware AI] Xác minh email đăng ký',
    text: `Xin chào ${name},\n\nMã xác minh email đăng ký CyberAware AI của bạn: ${code}\n\nMã có hiệu lực 10 phút và chỉ dùng một lần. Nhập mã trên trang đăng ký bằng chính trình duyệt đã gửi yêu cầu. Không chia sẻ mã cho bất kỳ ai. Nếu bạn không đăng ký, hãy bỏ qua email này.`,
    html: layout('Mã đăng ký có hiệu lực 10 phút.', 'Xác minh email đăng ký', `
      <p>Xin chào <strong>${escapeHtml(name)}</strong>,</p>
      <p>Nhập mã sau trên trang đăng ký CyberAware AI bằng chính trình duyệt đã gửi yêu cầu:</p>
      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:22px;text-align:center;margin:20px 0">
        <div style="font-size:12px;font-weight:700;color:#1e40af">MÃ XÁC MINH EMAIL</div>
        <div style="font-size:32px;font-weight:700;letter-spacing:7px;color:#004ac6;margin-top:8px">${escapeHtml(code)}</div>
      </div>
      <p>Mã chỉ dùng một lần và hết hạn sau 10 phút. Không chia sẻ mã này. Nếu bạn không đăng ký, hãy bỏ qua email.</p>`),
  };
}

export function passwordChangedMail(name: string): SecurityMail {
  const safeName = escapeHtml(name);
  return {
    subject: '[CyberAware AI] Xác nhận thay đổi mật khẩu',
    text: `Xin chào ${name},\n\nMật khẩu tài khoản CyberAware AI của bạn đã được thay đổi thành công. Các phiên đăng nhập trước đó đã bị thu hồi. Bạn cần đăng nhập lại bằng mật khẩu mới.\n\nNếu bạn không thực hiện việc thay đổi này, hãy liên hệ ngay với quản trị viên qua kênh hỗ trợ chính thức của CyberAware AI để được kiểm tra tài khoản. Không chia sẻ mật khẩu hoặc mã xác thực cho bất kỳ ai.\n\nĐây là email tự động của CyberAware AI.`,
    html: layout('Mật khẩu tài khoản CyberAware AI của bạn đã được thay đổi.', 'Mật khẩu đã được thay đổi', `
      <p style="margin:0 0 16px">Xin chào <strong>${safeName}</strong>,</p>
      <p style="margin:0 0 16px">Mật khẩu tài khoản CyberAware AI của bạn đã được thay đổi thành công. Các phiên đăng nhập trước đó đã bị thu hồi. Bạn cần đăng nhập lại bằng mật khẩu mới.</p>
      <div style="background:#fff7ed;border-left:4px solid #ea580c;border-radius:8px;padding:16px 18px;color:#334155">
        <strong style="color:#9a3412">Không phải bạn thực hiện?</strong>
        <p style="margin:8px 0 0">Hãy liên hệ ngay với quản trị viên qua kênh hỗ trợ chính thức của CyberAware AI để được kiểm tra tài khoản. Không chia sẻ mật khẩu hoặc mã xác thực cho bất kỳ ai.</p>
      </div>`),
  };
}
