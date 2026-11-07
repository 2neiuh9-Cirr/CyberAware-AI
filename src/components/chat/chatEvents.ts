export const OPEN_CHAT_FULL_EVENT = 'cyberaware:open-chat-full';

export function openChatFullScreen() {
  window.dispatchEvent(new Event(OPEN_CHAT_FULL_EVENT));
}
