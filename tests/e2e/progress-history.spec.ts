import { expect, test, type Page } from "@playwright/test";

const WEEK1_DAY1 = "22a6f767-4aa0-5b1a-80f8-54b8d4c06e54";

async function enterLocalMode(page: Page) {
  await page.goto("/auth/login");
  const localMode = page.getByRole("link", { name: /Continuer en mode local/i });
  if (await localMode.isVisible().catch(() => false)) {
    await localMode.click();
    await page.waitForURL(/\/today/);
  } else {
    await page.goto("/today");
  }
  await expect(page.getByRole("heading", { name: /Bonjour Kemi/i })).toBeVisible();
}

async function startWorkoutFromToday(page: Page) {
  const start = page.getByRole("button", { name: /Commencer la s.ance/i }).first();
  await expect(start).toBeVisible();
  await expect(start).toBeEnabled();
  await start.click();
  await expect(page).toHaveURL(/\/session\//, { timeout: 15_000 });
}

async function skipRestIfPresent(page: Page) {
  const skip = page.getByRole("button", { name: /Passer|Skip/i });
  if (await skip.isVisible().catch(() => false)) {
    await skip.click();
  }
}

async function putSession(page: Page, session: Record<string, unknown>) {
  await page.evaluate(async (row) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("kemi-training-v1");
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = database.transaction("sessions", "readwrite");
        tx.objectStore("sessions").put(row);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } finally {
      database.close();
    }
  }, session);
}

test.describe("Wave 06 progress history", () => {
  test.beforeEach(async ({ page }) => {
    await enterLocalMode(page);
  });

  test("completed workout appears in Progress after navigation and reload; active does not inflate", async ({ page }) => {
    await startWorkoutFromToday(page);
    const sessionId = new URL(page.url()).pathname.split("/").pop()!;

    await putSession(page, {
      id: sessionId,
      workoutDayId: WEEK1_DAY1,
      workoutTitle: "Jour 1",
      weekNumber: 1,
      dayNumber: 1,
      startedAt: "2026-09-25T10:00:00.000Z",
      completedAt: "2026-09-25T11:00:00.000Z",
      status: "completed",
      currentItemIndex: 0,
      notes: "",
      setLogs: [
        {
          id: "log-completed",
          workoutItemId: "item-1",
          exerciseId: "ex-squat",
          setNumber: 1,
          targetReps: 8,
          actualReps: 8,
          targetWeight: 100,
          targetWeightUnit: "kg",
          actualWeight: 60,
          weightUnit: "kg",
          durationSec: null,
          rpe: null,
          completedAt: "2026-09-25T10:30:00.000Z",
        },
      ],
      restTargetEndTime: null,
      updatedAt: "2026-09-25T11:00:00.000Z",
    });

    await putSession(page, {
      id: "active-should-not-count",
      workoutDayId: WEEK1_DAY1,
      workoutTitle: "Jour 1",
      weekNumber: 1,
      dayNumber: 2,
      startedAt: "2026-09-25T12:00:00.000Z",
      completedAt: null,
      status: "active",
      currentItemIndex: 0,
      notes: "",
      setLogs: [
        {
          id: "log-active",
          workoutItemId: "item-1",
          exerciseId: "ex-squat",
          setNumber: 1,
          targetReps: 8,
          actualReps: 8,
          targetWeight: 100,
          targetWeightUnit: "kg",
          actualWeight: 200,
          weightUnit: "kg",
          durationSec: null,
          rpe: null,
          completedAt: "2026-09-25T12:05:00.000Z",
        },
      ],
      restTargetEndTime: null,
      updatedAt: "2026-09-25T12:05:00.000Z",
    });

    // Bottom nav is hidden on /session; navigate via URL like post-workout Progression CTA.
    await page.goto("/progress");
    await expect(page.getByTestId("completed-session-count")).toHaveText("1");
    await expect(page.getByTestId("completed-session-row")).toContainText(/Semaine 1 - Jour 1/);
    await expect(page.getByTestId("load-record")).toContainText(/60/);

    await page.getByRole("navigation", { name: "Navigation principale" }).getByRole("link", { name: /Progression/i }).click();
    await expect(page).toHaveURL(/\/progress/);
    await page.reload();
    await expect(page.getByTestId("completed-session-count")).toHaveText("1");
    await expect(page.getByTestId("completed-session-row")).toContainText(/Semaine 1 - Jour 1/);
  });

  test("active-only session is excluded from Progress completed count", async ({ page }) => {
    await startWorkoutFromToday(page);
    await page.goto("/progress");
    await expect(page.getByTestId("completed-session-count")).toHaveText("0");
    await page.reload();
    await expect(page.getByTestId("completed-session-count")).toHaveText("0");
  });

  test("strength test Estimated 1RM survives reload and appears in Progress", async ({ page }) => {
    test.setTimeout(90_000);

    await page.goto("/tests?test=back-squat");
    await expect(page.getByRole("heading", { name: /Un protocole clair/i })).toBeVisible();

    for (let i = 0; i < 6; i += 1) {
      await page.getByRole("button", { name: /S.rie termin.e/i }).click();
      await skipRestIfPresent(page);
    }

    await page.getByRole("button", { name: /Estimated 1RM/i }).click();
    await expect(page.getByText(/Estimated 1RM/i)).toBeVisible();
    await expect(page.getByText(/56\.3|56\.2/)).toBeVisible();

    // Strength-test CTA and bottom nav both say Progression — avoid strict-mode clash.
    await page.goto("/progress");
    await expect(page).toHaveURL(/\/progress/);
    await expect(page.getByTestId("strength-test-result")).toContainText("Back Squat");
    await expect(page.getByTestId("strength-test-result")).toContainText(/Estimated 1RM/i);
    await expect(page.getByTestId("strength-test-result")).toContainText(/56\.3|56\.2/);

    await page.reload();
    await expect(page.getByTestId("strength-test-result")).toContainText("Back Squat");
    await expect(page.getByTestId("strength-test-result")).toContainText(/56\.3|56\.2/);
  });

  test("Deadlift source keeps missing prescribed loads", async ({ page }) => {
    await page.goto("/tests?test=deadlift");
    await expect(page.getByText(/Charge non renseign/i).first()).toBeVisible();
    await expect(page.locator(".counter-value").first()).toHaveText("--");
  });
});
