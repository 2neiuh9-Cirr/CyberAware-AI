// Sự kiện dùng chung để trang khác yêu cầu mở chatbot ở chế độ toàn màn hình.
export const OPEN_CHAT_FULL_EVENT = 'cyberaware:open-chat-full';

// Phát sự kiện trên window; Chatbot lắng nghe và tự đổi chế độ hiển thị.
export function openChatFullScreen() {
  window.dispatchEvent(new Event(OPEN_CHAT_FULL_EVENT));
}
