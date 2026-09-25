import { existsSync, readFileSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const separator = line.indexOf("=");
    if (separator <= 0 || line.trim().startsWith("#")) continue;
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

export default defineConfig({
  testDir: "./tests/supabase",
  timeout: 180_000,
  workers: 1,
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://localhost:3000",
  },
  webServer: {
    command: "pnpm exec next dev --hostname localhost --port 3000",
    url: "http://localhost:3000/auth/login",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [{ name: "supabase-local", use: { browserName: "chromium" } }],
});
