import "fake-indexeddb/auto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  comparePendingMutations,
  getOrCreateActiveSession,
  getPendingMutations,
  putPendingMutationForTests,
  resetOfflineDatabaseForTests,
  saveSession,
  type PendingMutation,
} from "@/lib/offline-db";
import { unauthenticatedSyncResponse } from "@/lib/sync-response";
import { getWorkoutContext } from "@/lib/training-data";
import type { LocalWorkoutSession } from "@/lib/training-model";

const { getUserMock } = vi.hoisted(() => ({
  getUserMock: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: getUserMock,
    },
  })),
}));

const day1 = getWorkoutContext("22a6f767-4aa0-5b1a-80f8-54b8d4c06e54");
if (!day1) {
  throw new Error("Week 1 day 1 is missing from the training seed");
}

function mutation(
  id: string,
  createdAt: string,
  type: PendingMutation["type"] = "strength_test_result",
): PendingMutation {
  return { id, type, payload: { id }, createdAt };
}

describe("sync queue ordering", () => {
  beforeEach(async () => {
    await resetOfflineDatabaseForTests();
  });

  it("sorts pending mutations oldest-first by createdAt", async () => {
    await putPendingMutationForTests(mutation("strength:b", "2026-09-25T12:00:02.000Z"));
    await putPendingMutationForTests(mutation("strength:a", "2026-09-25T12:00:00.000Z"));
    await putPendingMutationForTests(mutation("strength:c", "2026-09-25T12:00:01.000Z"));

    const pending = await getPendingMutations();
    expect(pending.map((row) => row.id)).toEqual(["strength:a", "strength:c", "strength:b"]);
  });

  it("breaks equal createdAt ties with a deterministic id order", () => {
    const sameTime = "2026-09-25T12:00:00.000Z";
    const rows = [
      mutation("strength:z", sameTime),
      mutation("strength:a", sameTime),
      mutation("strength:m", sameTime),
    ];
    expect([...rows].sort(comparePendingMutations).map((row) => row.id)).toEqual([
      "strength:a",
      "strength:m",
      "strength:z",
    ]);
  });

  it("returns equal-timestamp rows in deterministic id order from IndexedDB", async () => {
    const sameTime = "2026-09-25T15:00:00.000Z";
    await putPendingMutationForTests(mutation("strength:z", sameTime));
    await putPendingMutationForTests(mutation("strength:a", sameTime));
    await putPendingMutationForTests(mutation("strength:m", sameTime));

    const pending = await getPendingMutations();
    expect(pending.map((row) => row.id)).toEqual(["strength:a", "strength:m", "strength:z"]);
  });

  it("coalesces session snapshots so a later write keeps the newer logical payload", async () => {
    const created = await getOrCreateActiveSession(day1.day, day1.week);
    const older: LocalWorkoutSession = {
      ...created,
      notes: "older",
      setLogs: [],
      updatedAt: "2026-09-25T10:00:00.000Z",
    };
    const newer: LocalWorkoutSession = {
      ...created,
      notes: "newer",
      setLogs: [{
        id: "log-1",
        workoutItemId: "item-1",
        exerciseId: "exercise-1",
        setNumber: 1,
        targetReps: 8,
        actualReps: 8,
        targetWeight: 20,
        targetWeightUnit: "kg",
        actualWeight: 20,
        weightUnit: "kg",
        durationSec: null,
        rpe: null,
        completedAt: "2026-09-25T10:01:00.000Z",
      }],
      updatedAt: "2026-09-25T10:01:00.000Z",
    };

    await putPendingMutationForTests({
      id: `session:${created.id}`,
      type: "session_snapshot",
      payload: older,
      createdAt: "2026-09-25T10:01:00.000Z",
    });
    await saveSession(newer);

    const pending = await getPendingMutations();
    const sessionRows = pending.filter((row) => row.type === "session_snapshot");
    expect(sessionRows).toHaveLength(1);
    expect(sessionRows[0]?.id).toBe(`session:${created.id}`);
    expect((sessionRows[0]?.payload as LocalWorkoutSession).notes).toBe("newer");
    expect((sessionRows[0]?.payload as LocalWorkoutSession).setLogs).toHaveLength(1);
  });
});

describe("POST /api/sync unauthenticated JSON 401", () => {
  beforeEach(() => {
    getUserMock.mockReset();
    vi.unstubAllEnvs();
  });

  it("unauthenticatedSyncResponse is JSON 401 with no redirect Location", async () => {
    const response = unauthenticatedSyncResponse();
    expect(response.status).toBe(401);
    expect(response.headers.get("content-type")).toMatch(/application\/json/);
    expect(response.headers.get("location")).toBeNull();
    await expect(response.json()).resolves.toEqual({ ok: false });
  });

  it("returns HTTP 401 with application/json and never a login redirect", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "publishable-test-key");
    getUserMock.mockResolvedValue({ data: { user: null }, error: null });

    const { POST } = await import("@/app/api/sync/route");
    const response = await POST(new Request("http://localhost/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "session_snapshot", payload: {} }),
    }));

    expect(response.status).toBe(401);
    expect(response.headers.get("content-type")).toMatch(/application\/json/);
    expect(response.headers.get("location")).toBeNull();
    await expect(response.json()).resolves.toEqual({ ok: false });
  }, 15_000);
});

describe("service worker navigation cache strategy", () => {
  it("keeps navigations network-first, purges nav cache on activate, and retains offline.html", () => {
    const source = readFileSync(path.join(process.cwd(), "public/sw.js"), "utf8");
    expect(source).toContain("caches.delete(NAV_CACHE)");
    expect(source).toContain("isSessionNavigation");
    expect(source).toContain('"/offline.html"');
    expect(source).toContain("/_next/static/");
    expect(source).toMatch(/request\.mode === "navigate"/);
    expect(source).toMatch(/fetch\(request\)/);
    expect(source).not.toMatch(/\|\|\s*Response\.error\(\)/);
    expect(source).not.toMatch(/return\s+Response\.error\(\)/);
    expect(source).not.toMatch(/SHELL_CACHE\)\.then\(\(cache\) => cache\.put\(request/);
  });
});
