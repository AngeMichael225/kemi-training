import { defineConfig } from "@playwright/test";

const mobile = { isMobile: true, hasTouch: true, deviceScaleFactor: 3 } as const;

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "pnpm dev",
    url: "http://127.0.0.1:3000/today",
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: "iphone-14-pro-max", use: { ...mobile, browserName: "chromium", viewport: { width: 430, height: 932 } } },
    { name: "webkit-compact-iphone", use: { ...mobile, browserName: "webkit", viewport: { width: 375, height: 667 } } },
    { name: "android", use: { ...mobile, browserName: "chromium", viewport: { width: 412, height: 915 } } },
    { name: "tablet", use: { browserName: "chromium", viewport: { width: 768, height: 1024 }, hasTouch: true } },
    { name: "desktop", use: { browserName: "chromium", viewport: { width: 1440, height: 900 } } },
  ],
});
