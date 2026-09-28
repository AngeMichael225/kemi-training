import { expect, test, type Locator, type Page } from "@playwright/test";

const WEEK1_DAY1 = "22a6f767-4aa0-5b1a-80f8-54b8d4c06e54";

const principalRoutes = [
  "/auth/login",
  "/today",
  "/plan",
  "/plan/week/1",
  "/progress",
  "/exercises",
  "/profile",
  "/settings",
  "/tests",
  `/workout/${WEEK1_DAY1}`,
  "/exercise/cossack-squat",
];

async function expectNoHorizontalOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
}

async function expectMinTarget(locator: Locator, size = 44) {
  await expect(locator).toBeVisible();
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeGreaterThanOrEqual(size);
  expect(box!.height).toBeGreaterThanOrEqual(size);
}

test.describe("iOS polish", () => {
  test("principal pages stay within the viewport", async ({ page }) => {
    for (const route of principalRoutes) {
      await page.goto(route);
      await expect(page.locator("body")).toBeVisible();
      await expectNoHorizontalOverflow(page);
    }
  });

  test("critical controls meet 44px and fixed chrome stays clear", async ({ page }) => {
    await page.goto("/today");
    const viewport = page.viewportSize();
    expect(viewport).not.toBeNull();

    const sync = page.getByTestId("sync-status");
    await expectMinTarget(sync);
    const pill = sync.locator(".pill");
    const syncBox = await sync.boundingBox();
    const pillBox = await pill.boundingBox();
    expect(pillBox!.height).toBeLessThan(syncBox!.height);

    const navLinks = page.getByRole("navigation", { name: "Navigation principale" }).getByRole("link");
    await expect(navLinks).toHaveCount(5);
    for (let index = 0; index < 5; index += 1) await expectMinTarget(navLinks.nth(index));
    await expect(navLinks.filter({ hasText: "Aujourd'hui" })).toHaveAttribute("aria-current", "page");

    await expectMinTarget(page.getByRole("button", { name: /Commencer la s.ance/i }).first());
    await expectMinTarget(page.getByRole("link", { name: /Voir le detail/i }));
    await expectMinTarget(page.locator(".section-title").getByRole("link", { name: "Programme" }));

    const heading = await page.getByRole("heading", { level: 1 }).boundingBox();
    const nav = await page.locator(".bottom-nav").boundingBox();
    expect(heading!.y).toBeGreaterThanOrEqual(syncBox!.y + syncBox!.height - 1);
    expect(syncBox!.x).toBeGreaterThanOrEqual(0);
    expect(syncBox!.x + syncBox!.width).toBeLessThanOrEqual((viewport?.width ?? 0) + 1);
    expect(nav!.y).toBeGreaterThanOrEqual(0);
    expect(nav!.x).toBeGreaterThanOrEqual(-1);
    expect(nav!.x + nav!.width).toBeLessThanOrEqual((viewport?.width ?? 0) + 1);
    expect(nav!.y + nav!.height).toBeLessThanOrEqual((viewport?.height ?? 0) + 1);
    await expectNoHorizontalOverflow(page);
  });

  test("workout, media, and strength controls meet 44px", async ({ page }) => {
    await page.goto("/exercises");
    const filters = page.getByRole("group", { name: "Filtre de section" }).getByRole("button");
    const filterCount = await filters.count();
    expect(filterCount).toBeGreaterThan(0);
    for (let index = 0; index < filterCount; index += 1) await expectMinTarget(filters.nth(index));
    await expectNoHorizontalOverflow(page);

    await page.goto("/settings");
    await expectMinTarget(page.locator(".page-heading").getByRole("link", { name: "Profil" }));
    await expectMinTarget(page.getByRole("button", { name: "Kilogrammes" }));
    await expectMinTarget(page.getByRole("button", { name: "Livres" }));
    await expectMinTarget(page.locator(".preference-toggle .touch-hit").first());
    await expectNoHorizontalOverflow(page);

    await page.goto("/tests");
    await expectMinTarget(page.getByRole("button", { name: "Diminuer la charge" }));
    await expectMinTarget(page.getByRole("button", { name: "Augmenter la charge" }));
    await expectMinTarget(page.getByRole("button", { name: "Diminuer les répétitions" }));
    await expectMinTarget(page.getByRole("button", { name: "Augmenter les répétitions" }));
    await expectMinTarget(page.getByRole("button", { name: /S.rie termin.e/i }));
    const tests = page.getByRole("group", { name: "Choix du test" }).getByRole("button");
    expect(await tests.count()).toBeGreaterThan(1);
    for (let index = 0; index < await tests.count(); index += 1) await expectMinTarget(tests.nth(index));
    await expectNoHorizontalOverflow(page);

    await page.goto("/exercise/cossack-squat");
    await expectMinTarget(page.locator(".page-heading").getByRole("link", { name: "Exercices" }));
    await expectMinTarget(page.getByTestId("exercise-media-upload"));
    await expectMinTarget(page.getByRole("link", { name: /Ouvrir la source secondaire/i }));
    await expectNoHorizontalOverflow(page);

    await page.goto(`/workout/${WEEK1_DAY1}`);
    await page.getByRole("button", { name: /Commencer la s.ance/i }).first().click();
    await expect(page).toHaveURL(new RegExp(`/session/.+\\?workout=${WEEK1_DAY1}`));
    await expect(page.locator(".app-frame")).toHaveAttribute("data-nav", "hidden");
    await expect(page.locator(".bottom-nav")).toHaveCount(0);
    await expectMinTarget(page.getByRole("link", { name: "Quitter la séance" }));
    await expectMinTarget(page.getByTestId("sync-status"));
    const setButtons = page.getByRole("button", { name: /Diminuer la charge|Augmenter la charge|Diminuer les r.p.titions|Augmenter les r.p.titions|S.rie termin.e/i });
    const setCount = await setButtons.count();
    expect(setCount).toBeGreaterThan(0);
    for (let index = 0; index < setCount; index += 1) await expectMinTarget(setButtons.nth(index));
    await expectNoHorizontalOverflow(page);

    for (let index = 0; index < 8; index += 1) {
      const next = page.getByRole("button", { name: /^Suivant/i });
      if (await next.isEnabled().catch(() => false)) await next.click();
    }
    const complete = page.getByRole("button", { name: /S.rie termin.e|Test complet/i });
    if (await complete.isVisible().catch(() => false)) {
      await complete.click();
      const dialog = page.getByRole("dialog", { name: /Minuteur de repos/i });
      if (await dialog.isVisible().catch(() => false)) {
        await expectMinTarget(dialog.getByRole("button", { name: /15 sec/i }));
        await expectMinTarget(dialog.getByRole("button", { name: /Passer/i }));
        const box = await dialog.boundingBox();
        const viewport = page.viewportSize();
        expect(box!.y).toBeGreaterThanOrEqual(-1);
        expect(box!.y + box!.height).toBeLessThanOrEqual((viewport?.height ?? 0) + 1);
        await expectNoHorizontalOverflow(page);
        await dialog.getByRole("button", { name: /Passer/i }).click();
        await expect(dialog).toBeHidden();
      }
    }
  });

  test("reduced motion keeps state feedback without looping animation", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/progress");
    await expect(page.locator(".motion-moment[data-reduced='true']")).toBeVisible();
    await expect(page.getByTestId("motion-static")).toBeVisible();
    await expect(page.getByRole("heading", { name: /Ce que tu as reellement fait/i })).toBeVisible();
    const transition = await page.locator(".nav-link").first().evaluate((element) => getComputedStyle(element).transitionDuration);
    expect(parseFloat(transition)).toBeLessThan(0.05);
    await expectNoHorizontalOverflow(page);

    await page.goto("/today");
    const buttonTransition = await page.locator(".button-primary").first().evaluate((element) => getComputedStyle(element).transitionDuration);
    expect(parseFloat(buttonTransition)).toBeLessThan(0.05);
    await expect(page.getByRole("button", { name: /Commencer la s.ance/i }).first()).toBeEnabled();
  });

  test("login page clears the safe-area padding and does not overflow", async ({ page }) => {
    await page.goto("/auth/login");
    const padding = await page.locator("main").evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        top: Number.parseFloat(style.paddingTop),
        right: Number.parseFloat(style.paddingRight),
        bottom: Number.parseFloat(style.paddingBottom),
        left: Number.parseFloat(style.paddingLeft),
      };
    });
    expect(padding.top).toBeGreaterThanOrEqual(24);
    expect(padding.bottom).toBeGreaterThanOrEqual(24);
    expect(padding.left).toBeGreaterThanOrEqual(18);
    expect(padding.right).toBeGreaterThanOrEqual(18);
    await expectMinTarget(page.getByRole("link", { name: /Continuer en mode local/i }));
    await expectNoHorizontalOverflow(page);
  });
});
