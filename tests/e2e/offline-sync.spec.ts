import { expect, test, type Page } from "@playwright/test";

const WEEK1_DAY1 = "22a6f767-4aa0-5b1a-80f8-54b8d4c06e54";
const WEEK1_DAY2 = "578ad006-79bd-5815-b741-4896912e1094";
const QUADRICEPS_STRETCH = "cff5f213-5def-56c1-9934-afeeabadadec";
const NAV_CACHE = "kemi-nav-v2";
const STATIC_CACHE = "kemi-static-v2";

interface StoredSessionRow {
  id: string;
  status: string;
  notes: string;
  workoutDayId: string;
  exerciseNotes?: Record<string, string>;
  setLogs: Array<{ workoutItemId: string; setNumber: number }>;
}

async function enterLocalMode(page: Page) {
  await page.goto("/auth/login");
  const localMode = page.getByRole("link", { name: /Continuer en mode local/i });
  if (await localMode.isVisible().catch(() => false)) {
    await localMode.click();
    await page.waitForURL(/\/today/);
  } else {
    await page.goto("/today");
  }
}

async function readStoredSessions(page: Page): Promise<StoredSessionRow[]> {
  return page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("kemi-training-v1");
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
    try {
      return await new Promise<StoredSessionRow[]>((resolve, reject) => {
        const request = database.transaction("sessions", "readonly").objectStore("sessions").getAll();
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result as StoredSessionRow[]);
      });
    } finally {
      database.close();
    }
  });
}

async function registerAndControlServiceWorker(page: Page) {
  await page.evaluate(async () => {
    if (!("serviceWorker" in navigator)) throw new Error("serviceWorker unavailable");
    await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
  });
  await page.reload({ waitUntil: "load" });
  await expect.poll(async () => page.evaluate(() => Boolean(navigator.serviceWorker.controller)), {
    timeout: 15_000,
  }).toBe(true);
}

async function warmOfflineCaches(page: Page, sessionUrl: string) {
  await page.evaluate(async ({ url, navCache, staticCache }) => {
    const parsed = new URL(url);
    const key = parsed.origin + parsed.pathname + parsed.search;
    const nav = await caches.open(navCache);
    const response = await fetch(url, { credentials: "same-origin" });
    if (!response.ok) throw new Error(`Failed to warm nav cache: ${response.status}`);
    await nav.put(key, response.clone());

    const staticStore = await caches.open(staticCache);
    const nodes = Array.from(document.querySelectorAll("script[src], link[rel='stylesheet']"));
    const urls = nodes
      .map((node) => {
        if (node instanceof HTMLScriptElement) return node.src;
        if (node instanceof HTMLLinkElement) return node.href;
        return "";
      })
      .filter((href) => href.includes("/_next/static/") || href.includes("/icons/"));
    await Promise.all(urls.map(async (href) => {
      if (await staticStore.match(href, { ignoreVary: true })) return;
      const asset = await fetch(href);
      if (asset.ok) await staticStore.put(href, asset.clone());
    }));
  }, { url: sessionUrl, navCache: NAV_CACHE, staticCache: STATIC_CACHE });
}

test.describe("Wave 05 offline sync", () => {
  test.beforeEach(async ({ page }) => {
    await enterLocalMode(page);
  });

  test("known session reloads offline with stored sets visible", async ({ page, context }) => {
    test.setTimeout(90_000);

    await page.getByRole("button", { name: /Commencer la s.ance/i }).first().click();
    await expect(page).toHaveURL(/\/session\//, { timeout: 15_000 });
    const sessionUrl = page.url();
    const sessionId = new URL(sessionUrl).pathname.split("/").pop();

    await expect(page.getByRole("heading", { name: "Vélo" })).toBeVisible();
    await page.getByRole("button", { name: /Suivant/i }).click();
    await expect(page.getByRole("heading", { name: "Glutes bridges" })).toBeVisible();
    await page.getByRole("button", { name: /Suivant/i }).click();
    await expect(page.getByRole("heading", { name: "Quadriceps Stretch" })).toBeVisible();

    const done = page.getByRole("button", { name: /S.rie termin.e/i });
    await done.click();
    await expect(page.getByText("2 / 2", { exact: true })).toBeVisible();

    await expect.poll(async () => {
      const sessions = await readStoredSessions(page);
      return sessions.reduce(
        (count, row) => count + row.setLogs.filter((log) => log.workoutItemId === QUADRICEPS_STRETCH).length,
        0,
      );
    }).toBe(1);

    await page.reload({ waitUntil: "load" });
    await expect(page.getByRole("heading", { name: "Quadriceps Stretch" })).toBeVisible();
    await expect(page.getByText("2 / 2", { exact: true })).toBeVisible();

    await registerAndControlServiceWorker(page);
    await expect(page.getByRole("heading", { name: "Quadriceps Stretch" })).toBeVisible();
    await page.reload({ waitUntil: "load" });
    await expect(page.getByRole("heading", { name: "Quadriceps Stretch" })).toBeVisible();
    await warmOfflineCaches(page, sessionUrl);

    try {
      await context.setOffline(true);
      // WebKit is brittle with reload()+offline; goto the known session URL instead.
      await page.goto(sessionUrl, { waitUntil: "domcontentloaded" });

      await expect(page.getByRole("heading", { name: "Séance introuvable" })).toHaveCount(0);
      await expect(page.getByText(/Mode hors ligne/i)).toHaveCount(0);
      await expect(page.getByRole("heading", { name: "Hors ligne" })).toHaveCount(0);
      await expect(page.getByRole("heading", { name: "Quadriceps Stretch" })).toBeVisible({ timeout: 20_000 });
      await expect(page.getByText("2 / 2", { exact: true })).toBeVisible();
      await expect(page.getByRole("button", { name: /S.rie termin.e/i })).toBeVisible();

      const offlineSessions = await readStoredSessions(page);
      const active = offlineSessions.find((row) => row.id === sessionId);
      expect(active?.status).toBe("active");
      expect(active?.setLogs.some((log) => log.workoutItemId === QUADRICEPS_STRETCH)).toBe(true);
      expect(offlineSessions.filter((row) => row.status === "active")).toHaveLength(1);
    } finally {
      await context.setOffline(false);
    }
  });

  test("Wave 03 regression: one active session, ordered sets, durable notes", async ({ page }) => {
    test.setTimeout(60_000);
    await page.getByRole("button", { name: /Commencer la s.ance/i }).first().click();
    await expect(page).toHaveURL(/\/session\//, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: "Vélo" })).toBeVisible();
    await page.getByRole("button", { name: /Suivant/i }).click();
    await page.getByRole("button", { name: /Suivant/i }).click();
    await expect(page.getByRole("heading", { name: "Quadriceps Stretch" })).toBeVisible();

    const done = page.getByRole("button", { name: /S.rie termin.e/i });
    await done.click();
    await done.click();
    await expect(page.getByRole("heading", { name: "Squats" })).toBeVisible({ timeout: 15_000 });

    const exerciseNote = `offline-ex-${Date.now()}`;
    const sessionNote = `offline-session-${Date.now()}`;
    await page.locator("summary").filter({ hasText: "Notes" }).click();
    await page.getByPlaceholder("Commentaire personnel sur ce mouvement...").fill(exerciseNote);
    await page.getByPlaceholder("Commentaire global de séance...").fill(sessionNote);

    await expect.poll(async () => {
      const sessions = await readStoredSessions(page);
      const active = sessions.filter((row) => row.status === "active");
      if (active.length !== 1) return false;
      const stretchLogs = active[0]?.setLogs.filter((log) => log.workoutItemId === QUADRICEPS_STRETCH) ?? [];
      return stretchLogs.length === 2
        && Object.values(active[0]?.exerciseNotes ?? {}).includes(exerciseNote)
        && active[0]?.notes === sessionNote;
    }).toBe(true);

    await page.reload({ waitUntil: "load" });
    await expect(page.getByRole("heading", { name: "Squats" })).toBeVisible({ timeout: 15_000 });
    await page.locator("summary").filter({ hasText: "Notes" }).click();
    await expect(page.getByPlaceholder("Commentaire personnel sur ce mouvement...")).toHaveValue(exerciseNote);
    await expect(page.getByPlaceholder("Commentaire global de séance...")).toHaveValue(sessionNote);

    const sessions = await readStoredSessions(page);
    expect(sessions.filter((row) => row.status === "active")).toHaveLength(1);
    expect(sessions.some((row) => row.status === "completed")).toBe(false);

    const started = new URL(page.url());
    const sessionId = started.pathname.split("/").pop();
    const workoutId = started.searchParams.get("workout");
    const otherWorkout = workoutId === WEEK1_DAY2 ? WEEK1_DAY1 : WEEK1_DAY2;
    await page.goto(`/workout/${otherWorkout}`);
    await page.getByRole("button", { name: /Commencer la s.ance/i }).first().click();
    await expect(page).toHaveURL(new RegExp(`/session/${sessionId}`), { timeout: 15_000 });
    expect(new URL(page.url()).searchParams.get("workout")).toBe(workoutId);
  });
});
