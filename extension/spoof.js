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
