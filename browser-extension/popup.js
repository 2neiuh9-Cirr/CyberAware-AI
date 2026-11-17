const statusElement = document.getElementById('status');
const consentElement = document.getElementById('consent');
const scanButton = document.getElementById('scan');
const resultElement = document.getElementById('result');
const urlSection = document.getElementById('url-check');
const gmailSection = document.getElementById('gmail-check');
const urlStatusElement = document.getElementById('url-status');
const urlResultElement = document.getElementById('url-result');
const checkUrlButton = document.getElementById('check-url');

function currentPageUrl(raw) {
  const url = new URL(raw);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('Chỉ kiểm tra trang HTTP/HTTPS không chứa thông tin đăng nhập trong địa chỉ.');
  url.search = '';
  url.hash = '';
  return url.href;
}

async function initialize() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  try { currentPageUrl(tab?.url); urlSection.hidden = false; }
  catch { document.getElementById('unsupported').hidden = false; }
  if (!tab?.url?.startsWith('https://mail.google.com/')) return;
  gmailSection.hidden = false;
  const { consentAiV2 } = await chrome.storage.local.get('consentAiV2');
  consentElement.hidden = consentAiV2 === true;
  scanButton.hidden = consentAiV2 !== true;
  statusElement.textContent = consentAiV2 ? 'Chỉ thư bạn chọn quét mới được gửi để đánh giá.' : 'Hãy đọc và đồng ý trước khi quét.';
}

checkUrlButton.addEventListener('click', async () => {
  checkUrlButton.disabled = true;
  urlStatusElement.textContent = 'Đang đối chiếu địa chỉ trang…';
  urlResultElement.replaceChildren();
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = currentPageUrl(tab?.url);
    const response = await fetch(`${globalThis.CYBERAWARE_API_ORIGIN}/api/url-reputation`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Máy chủ không phản hồi.');
    renderUrlResult(data);
    urlStatusElement.textContent = 'Đã kiểm tra địa chỉ trang.';
  } catch (error) {
    urlStatusElement.textContent = error.message || 'Không thể kiểm tra trang.';
  } finally { checkUrlButton.disabled = false; }
});

function renderUrlResult(data) {
  const address = document.createElement('p');
  address.className = 'note';
  address.textContent = `Đã kiểm tra: ${data.url}`;
  urlResultElement.append(address);

  const overall = document.createElement('p');
  overall.className = data.overall?.level === 'NGUY_HIEM' ? 'danger' : 'caution';
  overall.textContent = data.google?.status === 'matched'
    ? 'CẢNH BÁO: Google Safe Browsing ghi nhận địa chỉ này trong danh sách nguy hiểm. Không nhập thông tin hoặc tải tệp từ trang này.'
    : data.overall?.level === 'NGUY_HIEM' || data.overall?.level === 'CANH_GIAC'
      ? 'CẢNH BÁO: CyberAware phát hiện dấu hiệu cần kiểm tra thêm trước khi sử dụng trang.'
      : 'Chưa xác minh an toàn. Kết quả không phát hiện dấu hiệu không bảo đảm trang này an toàn.';
  urlResultElement.append(overall);

  const googleTitle = document.createElement('h2');
  googleTitle.textContent = 'Google Safe Browsing';
  urlResultElement.append(googleTitle);
  const google = document.createElement('p');
  if (data.google?.status === 'matched') {
    google.className = 'danger';
    const labels = { MALWARE: 'phần mềm độc hại', SOCIAL_ENGINEERING: 'trang lừa đảo hoặc giả mạo', UNWANTED_SOFTWARE: 'phần mềm không mong muốn', POTENTIALLY_HARMFUL_APPLICATION: 'ứng dụng có thể gây hại' };
    google.textContent = `Google ghi nhận dấu hiệu: ${(data.google.threatTypes || []).map(type => labels[type] || type).join(', ')}.`;
    const attribution = document.createElement('p');
    attribution.className = 'note';
    attribution.textContent = 'Advisory provided by Google. ';
    const link = document.createElement('a');
    link.href = 'https://safebrowsing.google.com/';
    link.target = '_blank'; link.rel = 'noreferrer'; link.textContent = 'Tìm hiểu về Safe Browsing';
    attribution.append(link);
    urlResultElement.append(google, attribution);
  } else {
    google.className = 'caution';
    google.textContent = data.google?.status === 'not_listed'
      ? 'Google chưa ghi nhận địa chỉ này trong danh sách nguy hiểm. Điều này không xác nhận trang an toàn.'
      : 'Chưa lấy được kết quả từ Google. Không thể kết luận trang an toàn.';
    urlResultElement.append(google);
  }

  const localTitle = document.createElement('h2');
  localTitle.textContent = 'Đánh giá riêng của CyberAware';
  urlResultElement.append(localTitle);
  const local = document.createElement('p');
  local.className = data.cyberAware?.level === 'NGUY_HIEM' ? 'danger' : 'caution';
  local.textContent = `${data.cyberAware?.title || 'Chưa có đánh giá'} · ${data.cyberAware?.riskScore ?? '—'}/100`;
  urlResultElement.append(local);
  if (data.google?.status === 'matched') {
    const independence = document.createElement('p');
    independence.className = 'note';
    independence.textContent = 'Điểm quy tắc CyberAware chỉ xét dấu hiệu trong địa chỉ URL; điểm thấp không phủ định cảnh báo của Google ở trên.';
    urlResultElement.append(independence);
  }
  const list = document.createElement('ul');
  for (const flag of (data.cyberAware?.flags || []).slice(0, 4)) {
    const item = document.createElement('li'); item.textContent = flag; list.append(item);
  }
  urlResultElement.append(list);
  const note = document.createElement('p');
  note.className = 'note';
  note.textContent = 'Kết quả có thể cảnh báo nhầm hoặc bỏ sót. Hãy tự xác minh qua kênh chính thức trước khi nhập thông tin hoặc chuyển tiền.';
  urlResultElement.append(note);
}

document.getElementById('agree').addEventListener('click', async () => {
  await chrome.storage.local.set({ consentAiV2: true });
  consentElement.hidden = true;
  scanButton.hidden = false;
  statusElement.textContent = 'Chỉ thư bạn chọn quét mới được gửi để đánh giá.';
});

scanButton.addEventListener('click', async () => {
  scanButton.disabled = true;
  statusElement.textContent = 'Đang kiểm tra thư…';
  resultElement.replaceChildren();
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !tab.url?.startsWith('https://mail.google.com/')) throw new Error('Hãy mở Gmail và chọn một thư.');
    const [injected] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: extractCurrentMail });
    const mail = injected?.result;
    if (!mail?.subject && !mail?.body) throw new Error('Không tìm thấy thư đang mở. Hãy mở một thư rồi thử lại.');
    const response = await fetch(`${globalThis.CYBERAWARE_API_ORIGIN}/api/gmail-extension/analyze`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-cyberaware-ai-consent': 'v2' }, body: JSON.stringify(mail)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Máy chủ không phản hồi.');
    renderResult(data);
    statusElement.textContent = 'Đã kiểm tra thư đang mở.';
  } catch (error) {
    statusElement.textContent = error.message || 'Không thể kiểm tra thư.';
  } finally { scanButton.disabled = false; }
});

function extractCurrentMail() {
  const visible = element => element && element.getClientRects().length > 0;
  const subjects = [...document.querySelectorAll('h2.hP')].filter(visible);
  const bodies = [...document.querySelectorAll('div.a3s.aiL')].filter(visible);
  const body = bodies.at(-1);
  const sender = [...document.querySelectorAll('span.gD')].filter(visible).at(-1);
  return {
    subject: (subjects.at(-1)?.textContent || '').trim().slice(0, 300),
    sender: (sender?.getAttribute('email') || sender?.textContent || '').trim().slice(0, 300),
    body: (body?.innerText || '').trim().slice(0, 4500),
    links: [...(body?.querySelectorAll('a[href]') || [])].map(a => a.href).filter(url => /^https?:\/\//i.test(url)).slice(0, 10)
  };
}

function renderResult(data) {
  const title = document.createElement('h2');
  title.textContent = `${data.level === 'NGUY_HIEM' ? 'Nguy hiểm' : data.level === 'CANH_GIAC' ? 'Cần cảnh giác' : 'Chưa thấy dấu hiệu rõ'} · ${data.riskScore}/100`;
  title.className = data.level === 'NGUY_HIEM' ? 'danger' : data.level === 'CANH_GIAC' ? 'caution' : 'low';
  const list = document.createElement('ul');
  for (const flag of (data.flags || []).slice(0, 6)) {
    const item = document.createElement('li'); item.textContent = flag; list.append(item);
  }
  const note = document.createElement('p'); note.className = 'note';
  note.textContent = 'Điểm số là dấu hiệu tham khảo. Kết quả thấp không xác nhận thư an toàn.';
  resultElement.append(title, list, note);
  const method = document.createElement('p'); method.className = 'note';
  method.textContent = data.aiStatus === 'available' ? 'Đã đối chiếu bằng Gemini (AI). Điểm tổng hợp ở trên giữ dấu hiệu rủi ro mạnh hơn.'
    : data.aiStatus === 'unavailable' ? 'Gemini tạm không khả dụng; kết quả dựa trên quy tắc.' : 'Kết quả dựa trên quy tắc.';
  resultElement.append(method);
  if (data.aiReasoning) {
    const reasoning = document.createElement('p'); reasoning.className = 'note';
    reasoning.textContent = `AI giải thích: ${data.aiReasoning}`;
    resultElement.append(reasoning);
  }
  if (data.actionAdvice) {
    const advice = document.createElement('p'); advice.className = 'note';
    advice.textContent = `AI gợi ý: ${data.actionAdvice}`;
    resultElement.append(advice);
  }
}

initialize().catch(() => { document.getElementById('unsupported').hidden = false; });
