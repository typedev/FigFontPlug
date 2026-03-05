// Detect Figma's font helper port by intercepting XHR requests to localhost
(function () {
  const HOME_PORT = 44950;
  let portReported = false;
  const origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url) {
    if (!portReported && typeof url === "string") {
      const m = url.match(/^https?:\/\/127\.0\.0\.1:(\d+)\/figma\//);
      if (m) {
        const port = parseInt(m[1], 10);
        window.dispatchEvent(
          new CustomEvent("figfontplug-port-detected", { detail: port })
        );
        if (port !== HOME_PORT) {
          fetch(`http://127.0.0.1:${HOME_PORT}/figma/set-port`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ port }),
          }).catch(() => {});
        }
        portReported = true;
      }
    }
    return origOpen.apply(this, arguments);
  };
})();

// Override navigator properties so Figma thinks it's running on macOS
Object.defineProperty(navigator, "platform", {
  get: () => "MacIntel",
});

Object.defineProperty(navigator, "userAgent", {
  get: () =>
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36",
});

// Override User-Agent Client Hints API if available
if (navigator.userAgentData) {
  Object.defineProperty(navigator, "userAgentData", {
    get: () => ({
      platform: "macOS",
      mobile: false,
      brands: [
        { brand: "Google Chrome", version: "145" },
        { brand: "Chromium", version: "145" },
        { brand: "Not_A Brand", version: "24" },
      ],
      getHighEntropyValues: (hints) =>
        Promise.resolve({
          platform: "macOS",
          platformVersion: "15.3.0",
          architecture: "arm",
          model: "",
          mobile: false,
          fullVersionList: [
            { brand: "Google Chrome", version: "145.0.0.0" },
            { brand: "Chromium", version: "145.0.0.0" },
            { brand: "Not_A Brand", version: "24.0.0.0" },
          ],
        }),
      toJSON: () => ({
        brands: [
          { brand: "Google Chrome", version: "145" },
          { brand: "Chromium", version: "145" },
          { brand: "Not_A Brand", version: "24" },
        ],
        mobile: false,
        platform: "macOS",
      }),
    }),
  });
}
