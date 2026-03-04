// Override navigator properties so Figma thinks it's running on Windows
Object.defineProperty(navigator, "platform", {
  get: () => "Win32",
});

Object.defineProperty(navigator, "userAgent", {
  get: () =>
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
});

// Override User-Agent Client Hints API if available
if (navigator.userAgentData) {
  Object.defineProperty(navigator, "userAgentData", {
    get: () => ({
      platform: "Windows",
      mobile: false,
      brands: [
        { brand: "Google Chrome", version: "131" },
        { brand: "Chromium", version: "131" },
        { brand: "Not_A Brand", version: "24" },
      ],
      getHighEntropyValues: (hints) =>
        Promise.resolve({
          platform: "Windows",
          platformVersion: "10.0.0",
          architecture: "x86",
          model: "",
          mobile: false,
          fullVersionList: [
            { brand: "Google Chrome", version: "131.0.0.0" },
            { brand: "Chromium", version: "131.0.0.0" },
            { brand: "Not_A Brand", version: "24.0.0.0" },
          ],
        }),
      toJSON: () => ({
        brands: [
          { brand: "Google Chrome", version: "131" },
          { brand: "Chromium", version: "131" },
          { brand: "Not_A Brand", version: "24" },
        ],
        mobile: false,
        platform: "Windows",
      }),
    }),
  });
}
