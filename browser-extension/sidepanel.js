const emptyElement = document.getElementById('empty');
const previewElement = document.getElementById('preview');
const kindElement = document.getElementById('kind');
const valueElement = document.getElementById('selected-value');
const truncatedElement = document.getElementById('truncated');
const privacyElement = document.getElementById('privacy-note');
const checkButton = document.getElementById('check');
const linksElement = document.getElementById('found-links');
const statusElement = document.getElementById('status');
const resultElement = document.getElementById('result');
document.querySelector('.privacy-link').href = `${globalThis.CYBERAWARE_API_ORIGIN}/chinh-sach-quyen-rieng-tu.html`;
document.getElementById('server-target').textContent = `Máy chủ đang dùng: ${globalThis.CYBERAWARE_API_ORIGIN}`;

let activeTabId = null;
let currentItem = null;
let requestVersion = 0;

function checkableUrl(raw) {
  try {
    const url = new URL(raw.trim());
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || !url.hostname.includes('.')) return null;
    url.search = '';
    url.hash = '';
    return url.href;
  } catch { return null; }
}

function addText(parent, tag, content, className = '') {
  const element = document.createElement(tag);
  element.textContent = content;
  if (className) element.className = className;
  parent.append(element);
  return element;
}

function flagsList(parent, flags) {
  if (!Array.isArray(flags) || !flags.length) return;
  const list = document.createElement('ul');
  for (const flag of flags.slice(0, 5)) addText(list, 'li', String(flag));
  parent.append(list);
}

function renderAiDetails(data, target) {
  addText(target, 'p', !data.aiStatus
    ? 'Máy chủ chưa trả trạng thái AI cho lượt kiểm tra này. Hãy khởi động lại backend để nạp phiên bản mới.'
    : data.aiStatus === 'available'
    ? 'Đã kết hợp AI Gemini với quy tắc CyberAware.'
    : data.aiStatus === 'unavailable'
      ? 'AI tạm không khả dụng; kết quả dựa trên quy tắc CyberAware.'
      : 'AI chưa tham gia lượt này; hãy kiểm tra khóa Gemini và công tắc AI của phần quét trên máy chủ đang dùng. Kết quả dựa trên quy tắc CyberAware.', 'note');
  if (data.aiReasoning) addText(target, 'p', `AI giải thích: ${data.aiReasoning}`);
  if (data.actionAdvice) addText(target, 'p', `AI gợi ý: ${data.actionAdvice}`);
}

function renderTextResult(data, target) {
  target.replaceChildren();
  const level = data.level === 'NGUY_HIEM' ? 'danger' : data.level === 'CANH_GIAC' ? 'caution' : 'low';
  addText(target, 'h2', `${data.title || 'Đánh giá nội dung'} · ${data.riskScore ?? '—'}/100`, level);
  flagsList(target, data.flags);
  renderAiDetails(data, target);
  if (Array.isArray(data.recommendations) && data.recommendations.length) {
    addText(target, 'p', data.recommendations[0]);
  }
  addText(target, 'p', 'Điểm số chỉ là đánh giá tham khảo; không xác nhận nội dung là an toàn.', 'note');
}

function renderUrlResult(data, target) {
  target.replaceChildren();
  const dangerous = data.overall?.level === 'NGUY_HIEM';
  addText(target, 'h2', dangerous ? 'Cảnh báo nguy hiểm' : data.overall?.level === 'CANH_GIAC' ? 'Cần cảnh giác' : 'Chưa xác minh an toàn', dangerous ? 'danger' : 'caution');
  addText(target, 'p', `Địa chỉ đã đối chiếu: ${data.url || 'không rõ'}`, 'note');
  addText(target, 'p', data.google?.status === 'matched'
    ? `Google Safe Browsing ghi nhận mối đe dọa: ${(data.google.threatTypes || []).join(', ')}.`
    : data.google?.status === 'not_listed'
      ? 'Google chưa ghi nhận địa chỉ này trong danh sách nguy hiểm; đây không phải xác nhận an toàn.'
      : 'Chưa lấy được kết quả từ Google; không thể kết luận an toàn.', data.google?.status === 'matched' ? 'danger' : 'caution');
  if (data.google?.status === 'matched') {
    const attribution = addText(target, 'p', 'Advisory provided by Google. ', 'note');
    const link = document.createElement('a');
    link.href = 'https://safebrowsing.google.com/';
    link.target = '_blank';
    link.rel = 'noreferrer';
    link.textContent = 'Tìm hiểu về Safe Browsing';
    attribution.append(link);
  }
  addText(target, 'p', `CyberAware: ${data.cyberAware?.title || 'Chưa có đánh giá'} (${data.cyberAware?.riskScore ?? '—'}/100).`);
  flagsList(target, data.cyberAware?.flags);
  renderAiDetails(data.cyberAware || {}, target);
  addText(target, 'p', 'Điểm thấp hoặc không có tên trong danh sách Google không bảo đảm liên kết an toàn.', 'note');
}

async function post(path, body) {
  const response = await fetch(`${globalThis.CYBERAWARE_API_ORIGIN}/api${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(90000)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 403 && data.error === 'Nguồn yêu cầu không hợp lệ.') {
      throw new Error('Máy chủ từ chối tiện ích. Nếu đang thử local, hãy khởi động lại server local và kiểm tra địa chỉ máy chủ ở cuối bảng.');
    }
    throw new Error(data.error || `Máy chủ trả về HTTP ${response.status}.`);
  }
  return data;
}

async function checkUrl(raw, target, button) {
  const url = checkableUrl(raw);
  if (!url) { statusElement.textContent = 'Chỉ kiểm tra được liên kết HTTP/HTTPS hợp lệ.'; return; }
  const version = ++requestVersion;
  button.disabled = true;
  statusElement.textContent = 'Đang đối chiếu liên kết…';
  target.replaceChildren();
  try {
    const data = await post('/context-check', { kind: 'url', url });
    if (version !== requestVersion) return;
    renderUrlResult(data, target);
    statusElement.textContent = 'Đã đối chiếu liên kết.';
  } catch (error) {
    if (version === requestVersion) statusElement.textContent = error.message || 'Không thể kiểm tra liên kết.';
  } finally { if (version === requestVersion) button.disabled = false; }
}

function showLinks(value) {
  linksElement.replaceChildren();
  const matches = [...value.matchAll(/https?:\/\/[^\s<>"']+/gi)]
    .map(match => match[0].replace(/[.,;!?)]*$/, ''));
  const urls = [...new Set(matches.map(checkableUrl).filter(Boolean))].slice(0, 3);
  linksElement.hidden = urls.length === 0;
  if (!urls.length) return;
  addText(linksElement, 'h2', 'Liên kết tìm thấy trong đoạn văn');
  for (const url of urls) {
    const row = document.createElement('div');
    row.className = 'link-option';
    addText(row, 'code', url);
    const button = addText(row, 'button', 'Đối chiếu liên kết này');
    button.type = 'button';
    const output = document.createElement('div');
    button.addEventListener('click', () => void checkUrl(url, output, button));
    row.append(output);
    linksElement.append(row);
  }
}

function showItem(item) {
  if (!item || !['text', 'url'].includes(item.kind) || typeof item.value !== 'string' || !item.value.trim() || Date.now() - item.capturedAt > 10 * 60_000) return;
  requestVersion++;
  currentItem = item;
  emptyElement.hidden = true;
  previewElement.hidden = false;
  resultElement.replaceChildren();
  statusElement.textContent = '';
  kindElement.textContent = item.kind === 'url' ? 'Liên kết đã chọn' : 'Đoạn văn bản đã chọn';
  valueElement.textContent = item.value;
  truncatedElement.hidden = !item.truncated;
  checkButton.disabled = item.kind === 'url' && item.truncated;
  checkButton.textContent = item.kind === 'url' ? 'Kiểm tra liên kết' : 'Phân tích đoạn văn';
  privacyElement.textContent = item.kind === 'url'
    ? 'Khi bấm kiểm tra, địa chỉ đã bỏ phần sau ? hoặc # được gửi tới CyberAware và Google Safe Browsing; địa chỉ cũng có thể được gửi tới Gemini khi AI bật. Không lưu vào lịch sử.'
    : 'Khi bấm phân tích, đoạn văn được gửi tới CyberAware và có thể được gửi tới Gemini khi AI bật để kết hợp với quy tắc. Không lưu vào lịch sử. Tránh chọn OTP hoặc mật khẩu.';
  if (item.kind === 'text') showLinks(item.value);
  else { linksElement.hidden = true; linksElement.replaceChildren(); }
}

async function readPending(tabId) {
  const key = `pendingCheck:${tabId}`;
  const stored = await chrome.storage.session.get(key);
  if (!stored[key]) return;
  showItem(stored[key]);
  await chrome.storage.session.remove(key);
}

async function refreshActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  if (activeTabId !== tab.id) {
    activeTabId = tab.id;
    currentItem = null;
    emptyElement.hidden = false;
    previewElement.hidden = true;
    resultElement.replaceChildren();
    statusElement.textContent = '';
  }
  await readPending(tab.id);
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'session' || activeTabId === null) return;
  const key = `pendingCheck:${activeTabId}`;
  if (changes[key]?.newValue) {
    showItem(changes[key].newValue);
    chrome.storage.session.remove(key).catch(console.error);
  }
});
chrome.tabs.onActivated.addListener(() => { refreshActiveTab().catch(console.error); });

checkButton.addEventListener('click', async () => {
  if (!currentItem) return;
  if (currentItem.kind === 'url') {
    if (currentItem.truncated) return;
    await checkUrl(currentItem.value, resultElement, checkButton);
    return;
  }
  const version = ++requestVersion;
  checkButton.disabled = true;
  resultElement.replaceChildren();
  statusElement.textContent = 'Đang phân tích đoạn văn…';
  try {
    const data = await post('/context-check', { text: currentItem.value });
    if (version !== requestVersion) return;
    renderTextResult(data, resultElement);
    statusElement.textContent = 'Đã phân tích đoạn văn.';
  } catch (error) {
    if (version === requestVersion) statusElement.textContent = error.message || 'Không thể phân tích đoạn văn.';
  } finally { if (version === requestVersion) checkButton.disabled = false; }
});

refreshActiveTab().catch(error => { statusElement.textContent = error.message || 'Không thể đọc nội dung đã chọn.'; });
