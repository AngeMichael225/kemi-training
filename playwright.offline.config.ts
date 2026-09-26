import { defineConfig } from "@playwright/test";

const mobile = { isMobile: true, hasTouch: true, deviceScaleFactor: 3 } as const;

/**
 * Wave 05 offline suite: production server so hashed `/_next/static` assets
 * match the cached session document. `pnpm dev` chunks are not offline-stable.
 * Uses port 3005 to avoid colliding with a local `pnpm dev` on 3000.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/offline-sync.spec.ts",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:3005",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "pnpm exec next start -p 3005",
    url: "http://127.0.0.1:3005/today",
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "",
      PORT: "3005",
    },
  },
  projects: [
    {
      name: "iphone-14-pro-max",
      use: { ...mobile, browserName: "chromium", viewport: { width: 430, height: 932 } },
    },
    {
      name: "webkit-compact-iphone",
      use: { ...mobile, browserName: "webkit", viewport: { width: 375, height: 667 } },
    },
  ],
});
