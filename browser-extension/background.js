const MENU_TEXT = 'cyberaware-selected-text';
const MENU_LINK = 'cyberaware-selected-link';

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: MENU_TEXT, title: 'Kiểm tra đoạn văn bản với CyberAware', contexts: ['selection'] });
    chrome.contextMenus.create({ id: MENU_LINK, title: 'Kiểm tra liên kết với CyberAware', contexts: ['link'], targetUrlPatterns: ['http://*/*', 'https://*/*'] });
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab?.id || ![MENU_TEXT, MENU_LINK].includes(info.menuItemId)) return;
  const kind = info.menuItemId === MENU_LINK ? 'url' : 'text';
  const raw = kind === 'url' ? info.linkUrl : info.selectionText;
  if (typeof raw !== 'string' || !raw.trim()) return;
  const value = raw.trim();
  const tabId = tab.id;

  // Open directly from the context-menu gesture. The side panel also listens for
  // the session-storage change in case it opens before the payload is written.
  chrome.sidePanel.open({ tabId }).catch(console.error);
  chrome.storage.session.set({
    [`pendingCheck:${tabId}`]: {
      kind,
      value: value.slice(0, kind === 'url' ? 2048 : 4500),
      truncated: value.length > (kind === 'url' ? 2048 : 4500),
      capturedAt: Date.now()
    }
  }).catch(console.error);
});
