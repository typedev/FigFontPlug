// FigFontPlug — MAIN world script that connects to the font helper SSE endpoint.
// Runs with the page's origin (https://www.figma.com) so CORS is allowed.
// Communicates with notify.js (ISOLATED world) via CustomEvent on window.

(function () {
  const SSE_URL = "http://127.0.0.1:44950/figma/font-changes";
  const RECONNECT_DELAY_MS = 5000;

  function connect() {
    let source;
    try {
      source = new EventSource(SSE_URL);
    } catch {
      setTimeout(connect, RECONNECT_DELAY_MS);
      return;
    }

    source.addEventListener("fonts_changed", () => {
      window.dispatchEvent(new CustomEvent("figfontplug-fonts-changed"));
    });

    source.onerror = () => {
      source.close();
      setTimeout(connect, RECONNECT_DELAY_MS);
    };
  }

  connect();
})();
