import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';

test('context menu captures only the chosen value for the side panel', async () => {
  const menus: Array<{ id: string; contexts: string[] }> = [];
  const opened: Array<{ tabId: number }> = [];
  const stored: Record<string, unknown>[] = [];
  let installed: () => void = () => {};
  let clicked: (info: Record<string, unknown>, tab: { id: number }) => void = () => {};
  const chrome = {
    runtime: { onInstalled: { addListener: (listener: () => void) => { installed = listener; } } },
    contextMenus: {
      removeAll: (callback: () => void) => callback(),
      create: (menu: { id: string; contexts: string[] }) => { menus.push(menu); },
      onClicked: { addListener: (listener: typeof clicked) => { clicked = listener; } },
    },
    sidePanel: { open: (options: { tabId: number }) => { opened.push(options); return Promise.resolve(); } },
    storage: { session: { set: (value: Record<string, unknown>) => { stored.push(value); return Promise.resolve(); } } },
  };
  runInNewContext(readFileSync('browser-extension/background.js', 'utf8'), { chrome, console });
  installed();
  assert.deepEqual(menus.map(menu => [menu.id, menu.contexts[0]]), [
    ['cyberaware-selected-text', 'selection'],
    ['cyberaware-selected-link', 'link'],
  ]);
  clicked({ menuItemId: 'cyberaware-selected-text', selectionText: '  Xin gửi OTP  ', pageUrl: 'https://example.com' }, { id: 7 });
  await Promise.resolve();
  assert.equal(opened[0].tabId, 7);
  const item = stored[0]['pendingCheck:7'] as { kind: string; value: string; truncated: boolean };
  assert.equal(item.kind, 'text');
  assert.equal(item.value, 'Xin gửi OTP');
  assert.equal(item.truncated, false);
  clicked({ menuItemId: 'cyberaware-selected-link', linkUrl: 'https://example.com/path?token=secret' }, { id: 7 });
  assert.equal((stored[1]['pendingCheck:7'] as { kind: string; value: string }).kind, 'url');
});
