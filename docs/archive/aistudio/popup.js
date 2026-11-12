(function () {
  function showCyberawarePopup(message, kind) {
    const previous = document.getElementById('cyberaware-message-popup');
    if (previous) previous.remove();

    const overlay = document.createElement('div');
    overlay.id = 'cyberaware-message-popup';
    overlay.setAttribute('role', 'alertdialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'cyberaware-popup-title');
    overlay.setAttribute('aria-describedby', 'cyberaware-popup-message');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(15,23,42,.5);backdrop-filter:blur(4px)';

    const card = document.createElement('div');
    card.style.cssText = 'width:100%;max-width:420px;padding:24px;border:1px solid #e2e8f0;border-radius:16px;background:#fff;box-shadow:0 24px 48px rgba(15,23,42,.18);font-family:Inter,system-ui,sans-serif';
    const title = document.createElement('h2');
    title.id = 'cyberaware-popup-title';
    title.textContent = kind === 'error' ? 'Vui lòng kiểm tra lại' : 'Thao tác hoàn tất';
    title.style.cssText = 'margin:0;color:#0f172a;font-size:18px;font-weight:700';
    const description = document.createElement('p');
    description.id = 'cyberaware-popup-message';
    description.textContent = message;
    description.style.cssText = 'margin:12px 0 24px;color:#475569;font-size:14px;line-height:1.6';
    const actions = document.createElement('div');
    actions.style.cssText = 'display:flex;justify-content:flex-end';
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Đã hiểu';
    button.style.cssText = 'border:0;border-radius:8px;padding:10px 18px;background:#004ac6;color:#fff;font-size:14px;font-weight:600;cursor:pointer';
    function close() { overlay.remove(); document.removeEventListener('keydown', onKeyDown); }
    function onKeyDown(event) { if (event.key === 'Escape') close(); }
    button.addEventListener('click', close);
    document.addEventListener('keydown', onKeyDown);
    actions.appendChild(button);
    card.append(title, description, actions);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
    button.focus();
  }
  window.showCyberawarePopup = showCyberawarePopup;
})();
