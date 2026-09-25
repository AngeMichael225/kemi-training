import { expect, test, type Page } from "@playwright/test";

const WEEK1_DAY1 = "22a6f767-4aa0-5b1a-80f8-54b8d4c06e54";
const WEEK1_DAY2 = "578ad006-79bd-5815-b741-4896912e1094";
const QUADRICEPS_STRETCH = "cff5f213-5def-56c1-9934-afeeabadadec";

interface StoredSessionRow {
  id: string;
  status: string;
  notes: string;
  workoutDayId: string;
  currentItemIndex: number;
  exerciseNotes?: Record<string, string>;
  setLogs: Array<{ workoutItemId: string }>;
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

async function readPendingIds(page: Page): Promise<string[]> {
  return page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("kemi-training-v1");
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
    try {
      return await new Promise<string[]>((resolve, reject) => {
        const request = database.transaction("pendingMutations", "readonly").objectStore("pendingMutations").getAll();
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve((request.result as Array<{ id: string }>).map((row) => row.id));
      });
    } finally {
      database.close();
    }
  });
}

test.describe("KEMI Training local-first flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/auth/login");
    const localMode = page.getByRole("link", { name: /Continuer en mode local/i });
    if (await localMode.isVisible().catch(() => false)) {
      await localMode.click();
      await page.waitForURL(/\/today/);
    } else {
      await page.goto("/today");
    }
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
    await expect(page).toHaveURL(/\/session\//);
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
    await expect(page.getByRole("dialog", { name: /Minuteur de repos/i })).toBeVisible();
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

  test("primary routes stay inside the viewport", async ({ page }) => {
    for (const route of ["/today", "/plan", "/progress", "/exercises", "/profile"]) {
      await page.goto(route);
      await expect(page.locator("main, .app-main").first()).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    }
  });

  test("wave 01 screenshots on the phone viewports", async ({ page }, testInfo) => {
    test.skip(!["iphone-14-pro-max", "webkit-compact-iphone"].includes(testInfo.project.name));
    for (const route of ["today", "plan", "progress", "profile"]) {
      await page.goto(`/${route}`);
      await expect(page.getByRole("navigation", { name: "Navigation principale" })).toBeVisible();
      await page.screenshot({
        path: `qa/visual/wave-01/${testInfo.project.name}-${route}.png`,
        fullPage: false,
      });
    }
    await expect(page.getByRole("link", { name: "Flaticon" })).toBeVisible();
  });

  test("weight preference can switch to lbs", async ({ page }) => {
    await page.goto("/profile");
    await page.getByRole("button", { name: /Livres/i }).click();
    await expect(page.getByRole("button", { name: /Livres/i })).toHaveAttribute("data-active", "true");
  });

  test.describe("Wave 03 session persistence", () => {
    test("completed sets and progression survive reload", async ({ page }) => {
      await page.getByRole("button", { name: /Commencer la s.ance/i }).first().click();
      await expect(page.getByRole("heading", { name: "Vélo" })).toBeVisible();
      await page.getByRole("button", { name: /Suivant/i }).click();
      await expect(page.getByRole("heading", { name: "Glutes bridges" })).toBeVisible();
      await page.getByRole("button", { name: /Suivant/i }).click();
      await expect(page.getByRole("heading", { name: "Quadriceps Stretch" })).toBeVisible();
      await expect(page.getByText("1 / 2", { exact: true })).toBeVisible();

      const done = page.getByRole("button", { name: /S.rie termin.e/i });
      await done.click();
      await expect(page.getByText("2 / 2", { exact: true })).toBeVisible();
      await done.click();
      await expect(page.getByRole("heading", { name: "Squats" })).toBeVisible();
      await expect.poll(async () => {
        const sessions = await readStoredSessions(page);
        return sessions.reduce((count, row) => count + row.setLogs.filter((log) => log.workoutItemId === QUADRICEPS_STRETCH).length, 0);
      }).toBe(2);

      await page.reload();
      await expect(page.getByRole("heading", { name: "Squats" })).toBeVisible();
      await page.getByRole("button", { name: /Pr.c.dent/i }).click();
      await expect(page.getByRole("heading", { name: "Quadriceps Stretch" })).toBeVisible();
      await expect(page.getByText("2 / 2", { exact: true })).toBeVisible();
    });

    test("unknown session id shows Séance introuvable and not a fabricated workout", async ({ page }) => {
      const unknownId = "00000000-0000-4000-8000-000000000099";
      await page.goto(`/session/${unknownId}?workout=${WEEK1_DAY1}`);
      await expect(page.getByRole("heading", { name: "Séance introuvable" })).toBeVisible();
      await expect(page.getByText(/n.existe plus sur cet appareil/i)).toBeVisible();
      await expect(page.getByRole("link", { name: /Retour à l'accueil/i })).toBeVisible();
      await expect(page.getByRole("link", { name: /Voir le programme/i })).toBeVisible();
      await expect(page.getByRole("button", { name: /S.rie termin.e/i })).toHaveCount(0);
      await expect(page.getByText(/Bloc 1/i)).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);

      const sessions = await readStoredSessions(page);
      expect(sessions.some((row) => row.id === unknownId)).toBe(false);
      const pending = await readPendingIds(page);
      expect(pending.some((id) => id === `session:${unknownId}`)).toBe(false);
    });

    test("session and exercise notes persist after reload without blur", async ({ page }) => {
      const exerciseNote = `exercise-${Date.now()}`;
      const sessionNote = `session-${Date.now()}`;
      await page.getByRole("button", { name: /Commencer la s.ance/i }).first().click();
      await expect(page.getByRole("heading", { name: "Vélo" })).toBeVisible();
      await page.locator("summary").filter({ hasText: "Notes" }).click();

      const exerciseField = page.getByPlaceholder("Commentaire personnel sur ce mouvement...");
      const sessionField = page.getByPlaceholder("Commentaire global de séance...");
      await exerciseField.fill(exerciseNote);
      await expect.poll(async () => {
        const sessions = await readStoredSessions(page);
        return sessions.some((row) => Object.values(row.exerciseNotes ?? {}).includes(exerciseNote));
      }).toBe(true);
      await expect(exerciseField).toBeFocused();

      await sessionField.fill(sessionNote);
      await expect.poll(async () => {
        const sessions = await readStoredSessions(page);
        return sessions.some((row) => row.notes === sessionNote);
      }).toBe(true);
      await expect(sessionField).toBeFocused();

      await page.reload();
      await page.locator("summary").filter({ hasText: "Notes" }).click();
      await expect(exerciseField).toHaveValue(exerciseNote);
      await expect(sessionField).toHaveValue(sessionNote);
    });

    test("starting another workout resumes the existing active session", async ({ page }) => {
      await page.getByRole("button", { name: /Commencer la s.ance/i }).first().click();
      await expect(page).toHaveURL(/\/session\//);
      const started = new URL(page.url());
      const sessionId = started.pathname.split("/").pop();
      const workoutId = started.searchParams.get("workout");
      const otherWorkout = workoutId === WEEK1_DAY2 ? WEEK1_DAY1 : WEEK1_DAY2;

      await page.goto(`/workout/${otherWorkout}`);
      await page.getByRole("button", { name: /Commencer la s.ance/i }).first().click();
      await expect(page).toHaveURL(new RegExp(`/session/${sessionId}`));
      expect(new URL(page.url()).searchParams.get("workout")).toBe(workoutId);

      const sessions = await readStoredSessions(page);
      expect(sessions.filter((row) => row.status === "active")).toHaveLength(1);
      expect(sessions.find((row) => row.status === "active")?.id).toBe(sessionId);
      expect(sessions.find((row) => row.status === "active")?.workoutDayId).toBe(workoutId);
    });
  });
});
