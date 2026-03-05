// FigFontPlug — MAIN world script that connects to the font helper SSE endpoint.
// Runs with the page's origin (https://www.figma.com) so CORS is allowed.
// Communicates with notify.js (ISOLATED world) via CustomEvent on window.

(function () {
  const SSE_URL = "http://127.0.0.1:44950/figma/font-changes";
  const RECONNECT_DELAY_MS = 5000;

  console.log("[FigFontPlug] font-watcher.js loaded, connecting to SSE...");

  function connect() {
    let source;
    try {
      source = new EventSource(SSE_URL);
    } catch (e) {
      console.warn("[FigFontPlug] EventSource creation failed:", e);
      setTimeout(connect, RECONNECT_DELAY_MS);
      return;
    }

    source.onopen = () => {
      console.log("[FigFontPlug] SSE connected");
    };

    source.addEventListener("fonts_changed", () => {
      console.log("[FigFontPlug] fonts_changed event received, dispatching...");
      window.dispatchEvent(new CustomEvent("figfontplug-fonts-changed"));
    });

    source.onerror = (e) => {
      console.warn("[FigFontPlug] SSE error, reconnecting in 5s...", e);
      source.close();
      setTimeout(connect, RECONNECT_DELAY_MS);
    };
  }

  connect();
})();
