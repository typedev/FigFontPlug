// FigFontPlug — Content script (ISOLATED world) that shows a toast
// notification when fonts change, offering a page reload.
// Listens for CustomEvent from font-watcher.js (MAIN world).

const AUTO_DISMISS_MS = 30000;

console.log("[FigFontPlug] notify.js loaded (ISOLATED world)");

window.addEventListener("figfontplug-fonts-changed", () => {
  console.log("[FigFontPlug] notify.js received fonts-changed event, showing toast");
  showToast();
});

let toastHost = null;

function showToast() {
  // Don't stack multiple toasts
  if (toastHost) return;

  toastHost = document.createElement("div");
  toastHost.id = "figfontplug-toast-host";
  const shadow = toastHost.attachShadow({ mode: "closed" });

  shadow.innerHTML = `
    <style>
      :host {
        all: initial;
      }
      .toast {
        position: fixed;
        bottom: 32px;
        right: 32px;
        z-index: 2147483647;
        display: flex;
        align-items: center;
        gap: 16px;
        background: #2c2c2c;
        color: #fff;
        font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif;
        font-size: 15px;
        line-height: 1.4;
        padding: 14px 20px;
        border-radius: 10px;
        box-shadow: 0 12px 32px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.08);
        animation: slide-in 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
      }
      @keyframes slide-in {
        from { transform: translateY(24px) scale(0.95); opacity: 0; }
        to { transform: translateY(0) scale(1); opacity: 1; }
      }
      .toast.dismissing {
        animation: slide-out 0.2s ease-in forwards;
      }
      @keyframes slide-out {
        to { transform: translateY(24px) scale(0.95); opacity: 0; }
      }
      .icon {
        font-size: 20px;
        flex-shrink: 0;
      }
      .reload-btn {
        background: #0d99ff;
        color: #fff;
        border: none;
        border-radius: 8px;
        padding: 7px 16px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        white-space: nowrap;
        transition: background 0.15s;
      }
      .reload-btn:hover {
        background: #0b87e0;
      }
      .close-btn {
        background: none;
        border: none;
        color: #999;
        font-size: 20px;
        cursor: pointer;
        padding: 0 0 0 4px;
        line-height: 1;
        transition: color 0.15s;
      }
      .close-btn:hover {
        color: #fff;
      }
    </style>
    <div class="toast">
      <span class="icon">\uD83D\uDD24</span>
      <span>Font library updated</span>
      <button class="reload-btn">Reload</button>
      <button class="close-btn">\u00d7</button>
    </div>
  `;

  document.body.appendChild(toastHost);

  const toast = shadow.querySelector(".toast");
  const reloadBtn = shadow.querySelector(".reload-btn");
  const closeBtn = shadow.querySelector(".close-btn");

  function dismiss() {
    toast.classList.add("dismissing");
    toast.addEventListener("animationend", removeToast, { once: true });
  }

  function removeToast() {
    if (toastHost) {
      toastHost.remove();
      toastHost = null;
    }
  }

  reloadBtn.addEventListener("click", () => {
    location.reload();
  });

  closeBtn.addEventListener("click", dismiss);

  setTimeout(dismiss, AUTO_DISMISS_MS);
}
