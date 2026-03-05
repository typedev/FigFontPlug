// FigFontPlug — MAIN world script that connects to the font helper SSE endpoint.
// Runs with the page's origin (https://www.figma.com) so CORS is allowed.
// Communicates with notify.js (ISOLATED world) via CustomEvent on window.
// Uses fetch() instead of EventSource to avoid noisy console errors on reconnect.

(function () {
  const SSE_URL = "http://127.0.0.1:44950/figma/font-changes";
  const RECONNECT_DELAY_MS = 5000;

  async function connect() {
    try {
      const resp = await fetch(SSE_URL);
      if (!resp.ok || !resp.body) throw 0;

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        let boundary;
        while ((boundary = buffer.indexOf("\n\n")) !== -1) {
          const block = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);

          if (block.includes("event: fonts_changed")) {
            window.dispatchEvent(new CustomEvent("figfontplug-fonts-changed"));
          }
        }
      }
    } catch {
      // Silent reconnect
    }

    setTimeout(connect, RECONNECT_DELAY_MS);
  }

  connect();
})();
