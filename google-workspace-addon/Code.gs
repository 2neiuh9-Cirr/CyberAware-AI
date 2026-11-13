var API_URL = 'https://cyberaware.click/api/gmail-addon/analyze';
var CONSENT_KEY = 'mail_scan_consent_v1';
var INSTALL_KEY = 'mail_scan_install_id_v1';

function onHomepage() {
  return homeCard_();
}

function onGmailMessageOpen(event) {
  if (PropertiesService.getUserProperties().getProperty(CONSENT_KEY) !== 'yes') return consentCard_();
  var context = event && event.gmail;
  if (!context || !context.accessToken || !context.messageId) return infoCard_('Chưa có thư được mở', 'Mở một thư trong Gmail rồi chọn CyberAware AI.');
  try {
    GmailApp.setCurrentMessageAccessToken(context.accessToken);
    var message = GmailApp.getMessageById(context.messageId);
    var html = message.getBody() || '';
    var links = [];
    var pattern = /href\s*=\s*["'](https?:\/\/[^"']+)["']/gi;
    var match;
    while ((match = pattern.exec(html)) !== null && links.length < 10) links.push(match[1].replace(/&amp;/g, '&'));
    var payload = {
      subject: (message.getSubject() || '').slice(0, 300),
      sender: (message.getFrom() || '').slice(0, 300),
      body: (message.getPlainBody() || '').slice(0, 4500),
      links: links
    };
    var result = requestAnalysis_(payload);
    return resultCard_(result);
  } catch (error) {
    console.error('CyberAware Gmail analysis failed: ' + String(error));
    return infoCard_('Chưa thể quét thư', 'Máy chủ tạm thời không phản hồi hoặc cấu hình add-on chưa hoàn tất. Hãy thử mở lại thư.');
  }
}

function requestAnalysis_(payload) {
  var key = PropertiesService.getScriptProperties().getProperty('GMAIL_ADDON_API_KEY');
  if (!key) throw new Error('Missing GMAIL_ADDON_API_KEY');
  var userProperties = PropertiesService.getUserProperties();
  var installId = userProperties.getProperty(INSTALL_KEY);
  if (!installId) {
    installId = Utilities.getUuid();
    userProperties.setProperty(INSTALL_KEY, installId);
  }
  var response = UrlFetchApp.fetch(API_URL, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    headers: { 'x-cyberaware-addon-key': key, 'x-cyberaware-install-id': installId },
    muteHttpExceptions: true
  });
  if (response.getResponseCode() !== 200) throw new Error('API status ' + response.getResponseCode());
  return JSON.parse(response.getContentText());
}

function homeCard_() {
  var active = PropertiesService.getUserProperties().getProperty(CONSENT_KEY) === 'yes';
  var section = CardService.newCardSection()
    .addWidget(CardService.newTextParagraph().setText(active
      ? 'Đã bật quét thư đang mở. Mở một email và chọn biểu tượng CyberAware AI ở thanh bên Gmail.'
      : 'CyberAware AI hỗ trợ nhận diện dấu hiệu lừa đảo trong thư bạn đang mở. Hãy xem thông tin xử lý dữ liệu trước khi bật.'));
  section.addWidget(CardService.newTextButton().setText(active ? 'Tắt quét thư' : 'Xem và bật quét thư')
    .setOnClickAction(CardService.newAction().setFunctionName(active ? 'disableScanning' : 'showConsent')));
  return CardService.newCardBuilder().setHeader(CardService.newCardHeader().setTitle('CyberAware AI')).addSection(section).build();
}

function consentCard_() {
  var section = CardService.newCardSection()
    .addWidget(CardService.newTextParagraph().setText('Khi bạn bật tính năng và mở add-on trên một thư, chủ đề, địa chỉ người gửi, tối đa 4.500 ký tự nội dung và tối đa 10 liên kết của thư đó được gửi tới máy chủ CyberAware AI để chấm điểm. Máy chủ không lưu nguyên văn thư trong lịch sử quét và không gửi nội dung này tới Gemini. Kết quả là gợi ý, không xác nhận thư an toàn.'))
    .addWidget(CardService.newTextButton().setText('Đọc chính sách quyền riêng tư')
      .setOpenLink(CardService.newOpenLink().setUrl('https://cyberaware.click/chinh-sach-quyen-rieng-tu.html')))
    .addWidget(CardService.newTextButton().setText('Tôi đồng ý và bật quét thư')
      .setOnClickAction(CardService.newAction().setFunctionName('enableScanning')));
  return CardService.newCardBuilder().setHeader(CardService.newCardHeader().setTitle('Cho phép quét thư đang mở')).addSection(section).build();
}

function showConsent() {
  return CardService.newActionResponseBuilder().setNavigation(CardService.newNavigation().pushCard(consentCard_())).build();
}

function enableScanning() {
  PropertiesService.getUserProperties().setProperty(CONSENT_KEY, 'yes');
  return CardService.newActionResponseBuilder().setNavigation(CardService.newNavigation().updateCard(homeCard_())).setStateChanged(true).build();
}

function disableScanning() {
  PropertiesService.getUserProperties().deleteProperty(CONSENT_KEY);
  return CardService.newActionResponseBuilder().setNavigation(CardService.newNavigation().updateCard(homeCard_())).setStateChanged(true).build();
}

function resultCard_(result) {
  var label = result.level === 'NGUY_HIEM' ? 'Nguy hiểm' : result.level === 'CANH_GIAC' ? 'Cần cảnh giác' : 'Chưa thấy dấu hiệu rõ';
  var section = CardService.newCardSection()
    .addWidget(CardService.newDecoratedText().setTopLabel('Đánh giá thư đang mở').setText(label + ' · ' + Number(result.riskScore) + '/100'))
    .addWidget(CardService.newTextParagraph().setText('Điểm số thể hiện dấu hiệu nhận diện, không phải xác suất lừa đảo. Thiếu dấu hiệu không có nghĩa thư an toàn.'));
  (result.flags || []).slice(0, 6).forEach(function(flag) {
    section.addWidget(CardService.newTextParagraph().setText('• ' + escape_(String(flag))));
  });
  (result.recommendations || []).slice(0, 3).forEach(function(item) {
    section.addWidget(CardService.newTextParagraph().setText('Gợi ý: ' + escape_(String(item))));
  });
  return CardService.newCardBuilder().setHeader(CardService.newCardHeader().setTitle('CyberAware AI')).addSection(section).build();
}

function infoCard_(title, message) {
  return CardService.newCardBuilder().setHeader(CardService.newCardHeader().setTitle(title))
    .addSection(CardService.newCardSection().addWidget(CardService.newTextParagraph().setText(message))).build();
}

function escape_(value) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
