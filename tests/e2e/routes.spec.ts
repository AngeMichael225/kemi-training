import { expect, test } from "@playwright/test";

for (const route of ["/today", "/plan", "/progress", "/exercises", "/profile", "/settings", "/tests"]) {
  test(`${route} renders without horizontal overflow`, async ({ page }) => {
    await page.goto(route);
    await expect(page.locator("body")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
}
