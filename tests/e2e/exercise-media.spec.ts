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

async function clearExerciseMediaDb(page: Page) {
  await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase("kemi-exercise-media-v1");
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error ?? new Error("deleteDatabase failed"));
      request.onblocked = () => resolve();
    });
  });
}

async function uploadPng(page: Page, bytes = 128, name = "personal.png") {
  const input = page.getByTestId("exercise-media-input");
  await expect(input).toBeAttached();
  await input.setInputFiles({
    name,
    mimeType: "image/png",
    buffer: Buffer.alloc(bytes, 7),
  });
}

async function readPersonalMedia(page: Page) {
  return page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("kemi-exercise-media-v1");
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
    try {
      if (!database.objectStoreNames.contains("personalMedia")) return [];
      return await new Promise<Array<{ key: string; ownerScope: string; exerciseId: string }>>((resolve, reject) => {
        const request = database.transaction("personalMedia", "readonly").objectStore("personalMedia").getAll();
        request.onerror = () => reject(request.error);
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
    await clearExerciseMediaDb(page);
  });

  test("local upload persists across reload", async ({ page }) => {
    await page.goto(ARM_ROTATIONS, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /Arm rotations/i })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("exercise-media-upload")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText("Média personnel", { exact: true })).toHaveCount(0);

    await uploadPng(page);
    await expect(page.getByTestId("exercise-media-status")).toContainText(/enregistr/i, {
      timeout: 20_000,
    });
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

  test("offline reload still shows stored personal media", async ({ page, context }) => {
    await page.goto(ARM_ROTATIONS, { waitUntil: "domcontentloaded" });
    await uploadPng(page, 96, "offline.png");
    await expect(page.getByTestId("exercise-media-status")).toContainText(/enregistr/i, { timeout: 20_000 });
    await expect(page.getByText("Média personnel", { exact: true })).toBeVisible({ timeout: 20_000 });

    await context.setOffline(true);
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByText("Média personnel", { exact: true })).toBeVisible({ timeout: 20_000 });
    const retained = await readPersonalMedia(page);
    expect(retained.some((row) => row.ownerScope === "local-athlete" && row.exerciseId === ARM_ROTATIONS_ID)).toBe(true);
    await context.setOffline(false);
  });

  test("invalid MIME shows unsupported format UX", async ({ page }) => {
    await page.goto(ARM_ROTATIONS, { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("exercise-media-upload")).toBeVisible({ timeout: 20_000 });
    await page.getByTestId("exercise-media-input").setInputFiles({
      name: "notes.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("hello"),
    });
    await expect(page.getByTestId("exercise-media-status")).toContainText(/Format non pris en charge/i, {
      timeout: 10_000,
    });
    await expect(page.getByText("Média personnel", { exact: true })).toHaveCount(0);
  });

  test("oversized file shows 24 Mo UX", async ({ page }) => {
    await page.goto(ARM_ROTATIONS, { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("exercise-media-upload")).toBeVisible({ timeout: 20_000 });

    // Avoid allocating a real 24 MiB buffer in the Playwright worker (causes OOM).
    await page.evaluate(() => {
      const input = document.querySelector<HTMLInputElement>('[data-testid="exercise-media-input"]');
      if (!input) throw new Error("media input missing");
      const file = new File(["tiny"], "huge.png", { type: "image/png" });
      Object.defineProperty(file, "size", { value: 24 * 1024 * 1024 + 1 });
      const transfer = new DataTransfer();
      transfer.items.add(file);
      input.files = transfer.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });

    await expect(page.getByTestId("exercise-media-status")).toContainText(/24 Mo/i, { timeout: 10_000 });
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
        request.onerror = () => reject(request.error);
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
        const bytes = [1, 2, 3];
        const blob = new Blob([new Uint8Array(bytes)], { type: "image/png" });
        await new Promise<void>((resolve, reject) => {
          const tx = database.transaction("personalMedia", "readwrite");
          const store = tx.objectStore("personalMedia");
          store.delete(`local-athlete:${exerciseId}`);
          store.put({
            key: `user-b:${exerciseId}`,
            ownerScope: "user-b",
            exerciseId,
            bytes,
            blob,
            fileName: "b.png",
            mimeType: "image/png",
            updatedAt: new Date().toISOString(),
          });
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
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
