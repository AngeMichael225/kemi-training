import { expect, test, type BrowserContext, type Cookie, type Page } from "@playwright/test";
import { sendMagicLink } from "./mailpit";

const EMAIL = "kemi.local@example.test";
const CHUNK_SIZE = 3180;

function sessionCookies(cookies: Cookie[]) {
  const base = cookies.find((cookie) => /(?:^|-)auth-token$/.test(cookie.name));
  if (base) return [base];
  return cookies
    .filter((cookie) => /(?:^|-)auth-token\.\d+$/.test(cookie.name))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
}

function decodeSession(cookies: Cookie[]) {
  const parts = sessionCookies(cookies);
  const encoded = parts.map((cookie) => cookie.value).join("");
  const raw = encoded.startsWith("base64-")
    ? Buffer.from(encoded.slice("base64-".length), "base64url").toString("utf8")
    : decodeURIComponent(encoded);
  return JSON.parse(raw) as { expires_at?: number; access_token?: string; refresh_token?: string };
}

async function writeSession(context: BrowserContext, cookies: Cookie[], session: { expires_at?: number; access_token?: string; refresh_token?: string }) {
  const parts = sessionCookies(cookies);
  const template = parts[0];
  if (!template) throw new Error("Auth session cookie was not set.");
  const baseName = template.name.replace(/\.\d+$/, "");
  const stale = `base64-${Buffer.from(JSON.stringify(session)).toString("base64url")}`;
  const pieces: string[] = [];
  for (let index = 0; index < stale.length; index += CHUNK_SIZE) pieces.push(stale.slice(index, index + CHUNK_SIZE));
  await context.clearCookies({ name: new RegExp(`${baseName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:\\.\\d+)?$`) });
  await context.addCookies(pieces.map((value, index) => ({
    name: pieces.length === 1 ? baseName : `${baseName}.${index}`,
    value,
    url: "http://localhost:3000",
    httpOnly: template.httpOnly,
    secure: template.secure,
    sameSite: template.sameSite,
  })));
}

async function openConfirmWithNext(page: Page, magicLink: string, next: string) {
  await page.route("http://localhost:3000/auth/confirm**", async (route) => {
    const url = new URL(route.request().url());
    url.searchParams.set("next", next);
    await route.continue({ url: url.toString() });
  });
  await page.goto(magicLink);
  await page.unroute("http://localhost:3000/auth/confirm**");
}

test.describe("Supabase Local Auth", () => {
  test("magic link confirms, sets a session, and keeps API 401 anonymous", async ({ page, playwright }) => {
    await page.context().clearCookies();
    await page.goto("/today");
    await expect(page).toHaveURL(/\/auth\/login/);

    const link = await sendMagicLink(page, EMAIL);
    expect(link).toMatch(/127\.0\.0\.1:54321|localhost:54321/);
    await page.goto(link);
    await expect(page).toHaveURL(/\/today$/);

    const cookies = await page.context().cookies("http://localhost:3000");
    expect(cookies.some((cookie) => cookie.name.includes("auth-token"))).toBe(true);

    await page.goto("/auth/login");
    await expect(page).toHaveURL(/\/today$/);

    const anonymous = await playwright.request.newContext({ baseURL: "http://localhost:3000" });
    const denied = await anonymous.post("/api/sync", {
      data: { type: "session_snapshot", payload: {} },
    });
    expect(denied.status()).toBe(401);
    expect(denied.headers()["content-type"]).toContain("application/json");
    expect(await denied.json()).toEqual({ ok: false });
    await anonymous.dispose();
  });

  test("malicious next values fall back to /today after a real confirm", async ({ page }) => {
    const variants = [
      "https://evil.example",
      "//evil.example",
      "/\\evil.example",
      "/\t/evil.example",
      "/\r/evil.example",
      "/\n/evil.example",
    ];
    for (const next of variants) {
      await page.context().clearCookies();
      const link = await sendMagicLink(page, EMAIL);
      await openConfirmWithNext(page, link, next);
      await expect(page).toHaveURL(/\/today$/);
      expect(page.url()).not.toContain("evil.example");
    }
  });

  test("rotated refresh token survives the next redirect", async ({ page }) => {
    await page.context().clearCookies();
    const link = await sendMagicLink(page, EMAIL);
    await page.goto(link);
    await expect(page).toHaveURL(/\/today$/);

    const cookies = await page.context().cookies("http://localhost:3000");
    const session = decodeSession(cookies);
    expect(session.refresh_token).toBeTruthy();
    session.expires_at = 1;
    session.access_token = "expired.access.token";
    await writeSession(page.context(), cookies, session);

    await page.goto("/auth/login");
    await expect(page).toHaveURL(/\/today$/);
    await page.goto("/plan");
    await expect(page).toHaveURL(/\/plan$/);
  });
});
