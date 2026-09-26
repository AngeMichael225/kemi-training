import { expect, test, type Page } from "@playwright/test";

const ARM_ROTATIONS = "/exercise/arm-rotations";
const CAT_COW = "/exercise/cat-cow";
const ARM_ROTATIONS_ID = "398cae0e-d0ad-5747-8e6c-f584636ec3e1";

async function enterLocalMode(page: Page) {
  await page.goto("/auth/login", { waitUntil: "domcontentloaded" });
  const localMode = page.getByRole("link", { name: /Continuer en mode local/i });
  if (await localMode.isVisible().catch(() => false)) {
    await localMode.click();
    await page.waitForURL(/\/today/, { timeout: 30_000 });
  } else {
    await page.goto("/today", { waitUntil: "domcontentloaded" });
  }
}

/**
 * Call the MediaUpload test hook — avoids accept= filters and hydration races
 * that break setInputFiles / change-event dispatch under Chromium.
 */
async function uploadViaHook(
  page: Page,
  options: { name: string; mimeType: string; contents: string; size?: number },
) {
  await expect(page.getByTestId("exercise-media-upload")).toBeVisible({ timeout: 20_000 });
  await page.waitForFunction(
    () =>
      typeof (window as Window & { __kemiUploadExerciseMedia?: unknown }).__kemiUploadExerciseMedia === "function",
    { timeout: 20_000 },
  );
  await page.evaluate(async (fileOptions) => {
    const upload = (window as Window & { __kemiUploadExerciseMedia?: (file: File) => Promise<void> })
      .__kemiUploadExerciseMedia;
    if (!upload) throw new Error("upload hook missing");
    const file = new File([fileOptions.contents], fileOptions.name, { type: fileOptions.mimeType });
    if (typeof fileOptions.size === "number") {
      Object.defineProperty(file, "size", { value: fileOptions.size });
    }
    await upload(file);
  }, options);
}

async function uploadPng(page: Page, bytes = 128, name = "personal.png") {
  await uploadViaHook(page, {
    name,
    mimeType: "image/png",
    contents: "x".repeat(bytes),
  });
}

async function uploadOversized(page: Page) {
  await uploadViaHook(page, {
    name: "huge.png",
    mimeType: "image/png",
    contents: "tiny",
    size: 24 * 1024 * 1024 + 1,
  });
}

async function uploadInvalidMime(page: Page) {
  await uploadViaHook(page, {
    name: "notes.txt",
    mimeType: "text/plain",
    contents: "hello",
  });
}

async function readPersonalMedia(page: Page) {
  return page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("kemi-exercise-media-v1");
      request.onerror = () => reject(request.error ?? new Error("indexedDB open failed"));
      request.onsuccess = () => resolve(request.result);
    });
    try {
      if (!database.objectStoreNames.contains("personalMedia")) return [];
      return await new Promise<Array<{ key: string; ownerScope: string; exerciseId: string }>>((resolve, reject) => {
        const request = database.transaction("personalMedia", "readonly").objectStore("personalMedia").getAll();
        request.onerror = () => reject(request.error ?? new Error("getAll failed"));
        request.onsuccess = () =>
          resolve(
            (request.result as Array<{ key: string; ownerScope: string; exerciseId: string }>).map((row) => ({
              key: row.key,
              ownerScope: row.ownerScope,
              exerciseId: row.exerciseId,
            })),
          );
      });
    } finally {
      database.close();
    }
  });
}

test.describe("Exercise media (Wave 04)", () => {
  test.describe.configure({ timeout: 90_000 });

  test.beforeEach(async ({ page }) => {
    await enterLocalMode(page);
  });

  test("local upload persists across reload", async ({ page }) => {
    await page.goto(ARM_ROTATIONS, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /Arm rotations/i })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("exercise-media-upload")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText("Média personnel", { exact: true })).toHaveCount(0);

    await uploadPng(page);
    await expect(page.getByTestId("exercise-media-status")).toContainText(/enregistr/i, { timeout: 20_000 });
    await expect(page.getByTestId("exercise-media-frame")).toHaveAttribute("data-media-source", "local", {
      timeout: 20_000,
    });
    await expect(page.getByText("Média personnel", { exact: true })).toBeVisible();

    await expect
      .poll(async () => {
        const rows = await readPersonalMedia(page);
        return rows.some((row) => row.exerciseId === ARM_ROTATIONS_ID && row.ownerScope === "local-athlete");
      })
      .toBe(true);

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /Arm rotations/i })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("exercise-media-frame")).toHaveAttribute("data-media-source", "local", {
      timeout: 20_000,
    });
    await expect(page.getByText("Média personnel", { exact: true })).toBeVisible();
  });

  test("offline retains personal media in IndexedDB", async ({ page, context }) => {
    await page.goto(ARM_ROTATIONS, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /Arm rotations/i })).toBeVisible({ timeout: 20_000 });
    await uploadPng(page, 96, "offline.png");
    await expect(page.getByTestId("exercise-media-frame")).toHaveAttribute("data-media-source", "local", {
      timeout: 20_000,
    });

    await expect
      .poll(async () => {
        const rows = await readPersonalMedia(page);
        return rows.some((row) => row.ownerScope === "local-athlete" && row.exerciseId === ARM_ROTATIONS_ID);
      })
      .toBe(true);

    await context.setOffline(true);
    const retainedOffline = await readPersonalMedia(page);
    expect(
      retainedOffline.some((row) => row.ownerScope === "local-athlete" && row.exerciseId === ARM_ROTATIONS_ID),
    ).toBe(true);
    await context.setOffline(false);
  });

  test("invalid MIME shows unsupported format UX", async ({ page }) => {
    await page.goto(ARM_ROTATIONS, { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("exercise-media-upload")).toBeVisible({ timeout: 20_000 });
    await uploadInvalidMime(page);
    await expect(page.getByTestId("exercise-media-status")).toContainText(/Format non pris en charge/i, {
      timeout: 20_000,
    });
    await expect(page.getByText("Média personnel", { exact: true })).toHaveCount(0);
  });

  test("oversized file shows 24 Mo UX", async ({ page }) => {
    await page.goto(ARM_ROTATIONS, { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("exercise-media-upload")).toBeVisible({ timeout: 20_000 });
    await uploadOversized(page);
    await expect(page.getByTestId("exercise-media-status")).toContainText(/24 Mo/i, { timeout: 20_000 });
  });

  test("seed/reference fallback remains when no personal media", async ({ page }) => {
    await page.goto(CAT_COW, { waitUntil: "domcontentloaded" });
    const frame = page.getByTestId("exercise-media-frame");
    await expect(frame).toHaveAttribute("data-media-source", /reference|empty/, { timeout: 20_000 });
    await expect(page.getByText(/Média personnel recommande/i)).toBeVisible();
  });

  test("coach direct media remains available without personal upload", async ({ page }) => {
    await page.goto(ARM_ROTATIONS, { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("exercise-media-frame")).toHaveAttribute("data-media-source", "coach", {
      timeout: 20_000,
    });
  });

  test("User B owner-scoped rows do not render for local-athlete scope", async ({ page }) => {
    await page.goto(ARM_ROTATIONS, { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("exercise-media-frame")).toHaveAttribute("data-media-source", "coach", {
      timeout: 20_000,
    });

    await page.evaluate(async (exerciseId) => {
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open("kemi-exercise-media-v1");
        request.onerror = () => reject(request.error ?? new Error("indexedDB open failed"));
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains("personalMedia")) {
            const store = db.createObjectStore("personalMedia", { keyPath: "key" });
            store.createIndex("by-owner", "ownerScope");
            store.createIndex("by-exercise", "exerciseId");
          }
        };
        request.onsuccess = () => resolve(request.result);
      });
      try {
        await new Promise<void>((resolve, reject) => {
          const tx = database.transaction("personalMedia", "readwrite");
          const store = tx.objectStore("personalMedia");
          store.delete(`local-athlete:${exerciseId}`);
          store.put({
            key: `user-b:${exerciseId}`,
            ownerScope: "user-b",
            exerciseId,
            byteValues: [1, 2, 3],
            fileName: "b.png",
            mimeType: "image/png",
            updatedAt: new Date().toISOString(),
          });
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error ?? new Error("put failed"));
        });
      } finally {
        database.close();
      }
    }, ARM_ROTATIONS_ID);

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /Arm rotations/i })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("exercise-media-frame")).toHaveAttribute("data-media-source", "coach");
    await expect(page.getByText("Média personnel", { exact: true })).toHaveCount(0);
  });
});
