import { expect, test, type Page } from "@playwright/test";

const ARM_ROTATIONS = "/exercise/arm-rotations";
const CAT_COW = "/exercise/cat-cow";
const ARM_ROTATIONS_ID = "398cae0e-d0ad-5747-8e6c-f584636ec3e1";

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

async function uploadPng(page: Page, bytes = 128, name = "personal.png") {
  await page.getByTestId("exercise-media-input").setInputFiles({
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
  test.beforeEach(async ({ page }) => {
    await enterLocalMode(page);
  });

  test("local upload persists across reload", async ({ page }) => {
    await page.goto(ARM_ROTATIONS);
    await expect(page.getByRole("heading", { name: /Arm rotations/i })).toBeVisible();
    await expect(page.getByTestId("exercise-media-upload")).toBeVisible();

    await uploadPng(page);
    await expect(page.getByTestId("exercise-media-status")).toContainText(/enregistré sur cet appareil/i);
    await expect(page.getByTestId("exercise-media-frame")).toHaveAttribute("data-media-source", "local");
    await expect(page.getByText("Média personnel", { exact: true })).toBeVisible();

    await expect
      .poll(async () => {
        const rows = await readPersonalMedia(page);
        return rows.some((row) => row.exerciseId === ARM_ROTATIONS_ID && row.ownerScope === "local-athlete");
      })
      .toBe(true);

    await page.reload();
    await expect(page.getByRole("heading", { name: /Arm rotations/i })).toBeVisible();
    await expect(page.getByTestId("exercise-media-frame")).toHaveAttribute("data-media-source", "local", {
      timeout: 15_000,
    });
    await expect(page.getByText("Média personnel", { exact: true })).toBeVisible();
  });

  test("offline retains personal media in IndexedDB", async ({ page, context }) => {
    await page.goto(ARM_ROTATIONS);
    await uploadPng(page, 96, "offline.png");
    await expect(page.getByText("Média personnel", { exact: true })).toBeVisible();

    await context.setOffline(true);
    const retained = await readPersonalMedia(page);
    expect(retained.some((row) => row.ownerScope === "local-athlete" && row.exerciseId === ARM_ROTATIONS_ID)).toBe(true);
    await context.setOffline(false);
  });

  test("invalid MIME shows unsupported format UX", async ({ page }) => {
    await page.goto(ARM_ROTATIONS);
    await page.getByTestId("exercise-media-input").setInputFiles({
      name: "notes.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("hello"),
    });
    await expect(page.getByTestId("exercise-media-status")).toContainText(/Format non pris en charge/i);
    await expect(page.getByText("Média personnel", { exact: true })).toHaveCount(0);
  });

  test("oversized file shows 24 Mo UX", async ({ page }) => {
    await page.goto(ARM_ROTATIONS);
    const oversized = Buffer.alloc(24 * 1024 * 1024 + 1, 1);
    await page.getByTestId("exercise-media-input").setInputFiles({
      name: "huge.png",
      mimeType: "image/png",
      buffer: oversized,
    });
    await expect(page.getByTestId("exercise-media-status")).toContainText(/24 Mo/i);
  });

  test("seed/reference fallback remains when no personal media", async ({ page }) => {
    await page.goto(CAT_COW);
    const frame = page.getByTestId("exercise-media-frame");
    await expect(frame).toHaveAttribute("data-media-source", /reference|empty/);
    await expect(page.getByText(/Média personnel recommande/i)).toBeVisible();
  });

  test("coach direct media remains available without personal upload", async ({ page }) => {
    await page.goto(ARM_ROTATIONS);
    await expect(page.getByTestId("exercise-media-frame")).toHaveAttribute("data-media-source", "coach");
  });

  test("User B owner-scoped rows do not render for local-athlete scope", async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto(ARM_ROTATIONS);
    await expect(page.getByTestId("exercise-media-upload")).toBeVisible();
    await uploadPng(page, 64, "owner-a.png");
    await expect(page.getByTestId("exercise-media-frame")).toHaveAttribute("data-media-source", "local");

    await page.evaluate(async (exerciseId) => {
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open("kemi-exercise-media-v1");
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
      });
      try {
        await new Promise<void>((resolve, reject) => {
          const tx = database.transaction("personalMedia", "readwrite");
          tx.objectStore("personalMedia").clear();
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
        const blob = new Blob([new Uint8Array([1, 2, 3])], { type: "image/png" });
        await new Promise<void>((resolve, reject) => {
          const tx = database.transaction("personalMedia", "readwrite");
          tx.objectStore("personalMedia").put({
            key: `user-b:${exerciseId}`,
            ownerScope: "user-b",
            exerciseId,
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

    await page.reload();
    await expect(page.getByRole("heading", { name: /Arm rotations/i })).toBeVisible();
    await expect(page.getByTestId("exercise-media-frame")).toHaveAttribute("data-media-source", "coach", {
      timeout: 15_000,
    });
    await expect(page.getByText("Média personnel", { exact: true })).toHaveCount(0);
  });
});
