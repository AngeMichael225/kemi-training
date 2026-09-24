import { expect, test } from "@playwright/test";

test.describe("KEMI Training local-first flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/auth/login");
    const localMode = page.getByRole("link", { name: /Continuer en mode local/i });
    if (await localMode.isVisible().catch(() => false)) await localMode.click();
    else await page.goto("/today");
  });

  test("home is mobile-safe and starts a workout", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /Bonjour Kemi/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Commencer la s.ance/i }).first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

    await page.getByRole("button", { name: /Commencer la s.ance/i }).first().click();
    await expect(page).toHaveURL(/\/session\//);
    await expect(page.getByText(/Bloc 1/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /S.rie termin.e/i })).toBeVisible();
  });

  test("active workout survives reload", async ({ page }) => {
    await page.getByRole("button", { name: /Commencer la s.ance/i }).first().click();
    const before = await page.getByRole("heading", { level: 1 }).textContent();
    await page.reload();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(before ?? "");
  });

  test("a prescribed rest timer starts and supports skip", async ({ page }) => {
    await page.getByRole("button", { name: /Commencer la s.ance/i }).first().click();
    for (let i = 0; i < 6; i += 1) {
      const next = page.getByRole("button", { name: /Suivant/i });
      if (await next.isEnabled()) await next.click();
    }
    const setButton = page.getByRole("button", { name: /S.rie termin.e|Test complet/i });
    await setButton.click();
    await expect(page.getByText(/^REST$/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /15 SEC/i })).toBeVisible();
    await page.getByRole("button", { name: /Passer|Skip/i }).click();
  });

  test("strength test exposes Estimated 1RM language", async ({ page }) => {
    await page.goto("/tests?test=back-squat");
    await expect(page.getByRole("heading", { name: /Un protocole clair/i })).toBeVisible();
    for (let i = 0; i < 6; i += 1) {
      await page.getByRole("button", { name: /S.rie termin.e/i }).click();
      const skip = page.getByRole("button", { name: /Passer|Skip/i });
      if (await skip.isVisible().catch(() => false)) await skip.click();
    }
    await page.getByRole("button", { name: /Estimated 1RM/i }).click();
    await expect(page.getByText(/Estimated 1RM/i)).toBeVisible();
  });

  test("weight preference can switch to lbs", async ({ page }) => {
    await page.goto("/profile");
    await page.getByRole("button", { name: /Livres/i }).click();
    await expect(page.getByRole("button", { name: /Livres/i })).toHaveAttribute("data-active", "true");
  });
});
