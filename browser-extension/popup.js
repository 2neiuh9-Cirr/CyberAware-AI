const statusElement = document.getElementById('status');
const consentElement = document.getElementById('consent');
const scanButton = document.getElementById('scan');
const resultElement = document.getElementById('result');

async function initialize() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url?.startsWith('https://mail.google.com/')) {
    statusElement.textContent = 'Hãy mở Gmail trên trình duyệt và chọn một thư.';
    return;
  }
  const { consent } = await chrome.storage.local.get('consent');
  consentElement.hidden = consent === true;
  scanButton.hidden = consent !== true;
  statusElement.textContent = consent ? 'Chỉ thư bạn chọn quét mới được gửi để đánh giá.' : 'Hãy đọc và đồng ý trước khi quét.';
}

document.getElementById('agree').addEventListener('click', async () => {
  await chrome.storage.local.set({ consent: true });
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
    const response = await fetch('https://cyberaware.click/api/gmail-extension/analyze', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(mail)
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
}

initialize().catch(() => { statusElement.textContent = 'Không thể khởi tạo tiện ích.'; });
