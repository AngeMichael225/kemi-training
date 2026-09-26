import { defineConfig } from "@playwright/test";

const mobile = { isMobile: true, hasTouch: true, deviceScaleFactor: 3 } as const;
const PORT = "3010";
const ORIGIN = `http://127.0.0.1:${PORT}`;

/**
 * Wave 05 offline suite: production server so hashed `/_next/static` assets
 * match the cached session document. `pnpm dev` chunks are not offline-stable.
 * Builds immediately before start so a parallel agent cannot wipe `.next` mid-gate.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/offline-sync.spec.ts",
  timeout: 90_000,
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: ORIGIN,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: `pnpm build && pnpm exec next start --hostname 127.0.0.1 --port ${PORT}`,
    url: `${ORIGIN}/today`,
    reuseExistingServer: false,
    timeout: 300_000,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "",
      PORT,
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
