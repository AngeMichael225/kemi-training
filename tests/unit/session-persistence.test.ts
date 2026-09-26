import { describe, expect, it } from "vitest";
import type { LocalWorkoutSession, WorkoutItem } from "@/lib/training-model";
import { applySetCompletion, resolveLoadedSession } from "@/lib/session-mutations";
import { createSessionPersistence, createSessionStore } from "@/lib/session-persistence";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function session(overrides: Partial<LocalWorkoutSession> = {}): LocalWorkoutSession {
  return {
    id: "10000000-0000-4000-8000-000000000001",
    workoutDayId: "day-1",
    workoutTitle: "Week 1 - Jour 1",
    weekNumber: 1,
    dayNumber: 1,
    startedAt: "2026-09-25T12:00:00.000Z",
    completedAt: null,
    status: "active",
    currentItemIndex: 0,
    notes: "",
    exerciseNotes: {},
    setLogs: [],
    restTargetEndTime: null,
    updatedAt: "2026-09-25T12:00:00.000Z",
    ...overrides,
  };
}

function workoutItem(id: string, sets: number, restSeconds: number | null = null): WorkoutItem {
  return {
    id,
    exercise_id: `exercise-${id}`,
    exercise_name: id,
    item_kind: "exercise",
    strength_test_ref: null,
    prescribed_sets: sets,
    prescribed_reps: 10,
    prescribed_duration_sec: null,
    prescription_mode: null,
    laterality: null,
    target_raw: null,
    prescribed_weight: 20,
    weight_unit: "kg",
    weight_quantity: null,
    load_raw: null,
    rest_seconds: restSeconds,
    rest_raw: null,
    intensity: null,
    cardio: null,
    notes: null,
    athlete_comment_source: null,
    sort_order: 1,
    source_sheet: "Week 1",
    source_cell: "B6",
    source_url: null,
    source_location: null,
  };
}

const completion = { reps: 10, weight: 20, unit: "kg" as const, durationSec: null };

describe("session persistence ordering", () => {
  it("persists the latest snapshot when an older write finishes after a newer one", async () => {
    let durable = "";
    const persistence = createSessionPersistence(async (snapshot: { id: string }) => {
      if (snapshot.id === "A") await delay(40);
      durable = snapshot.id;
    });

    await Promise.all([
      persistence.submit({ id: "A" }),
      persistence.submit({ id: "B" }),
    ]);

    expect(durable).toBe("B");
  });

  it("surfaces a writer failure and still persists the next snapshot", async () => {
    const durable: string[] = [];
    const persistence = createSessionPersistence(async (snapshot: { id: string }) => {
      if (snapshot.id === "A") throw new Error("write failed");
      durable.push(snapshot.id);
    });

    await expect(persistence.submit({ id: "A" })).rejects.toThrow("write failed");
    await persistence.submit({ id: "B" });
    expect(durable).toEqual(["B"]);
  });

  it("does not let a queued active snapshot overwrite a completed snapshot", async () => {
    let durable: { status: string; completedAt: string | null; restTargetEndTime: number | null } | null = null;
    const persistence = createSessionPersistence(async (snapshot: { status: "active" | "completed"; completedAt: string | null; restTargetEndTime: number | null }) => {
      if (snapshot.status === "active") await delay(40);
      durable = {
        status: snapshot.status,
        completedAt: snapshot.completedAt,
        restTargetEndTime: snapshot.restTargetEndTime,
      };
    });

    await Promise.all([
      persistence.submit({ status: "active", completedAt: null, restTargetEndTime: Date.now() + 60_000 }),
      persistence.submit({ status: "completed", completedAt: "2026-09-25T12:30:00.000Z", restTargetEndTime: null }),
    ]);

    expect(durable).toEqual({
      status: "completed",
      completedAt: "2026-09-25T12:30:00.000Z",
      restTargetEndTime: null,
    });
  });
});

describe("rapid session mutations", () => {
  it("appendSetLog twice increases setLogs length by 2 without dropping either log", () => {
    const firstItem = workoutItem("item-1", 2, 90);
    const nextItem = workoutItem("item-2", 1);
    const sequence = [{ item: firstItem }, { item: nextItem }];
    const once = applySetCompletion(session(), firstItem, sequence, completion, { nextId: () => "log-1", nowIso: () => "2026-09-25T12:01:00.000Z", nowMs: () => 1_000 });
    const twice = applySetCompletion(once, firstItem, sequence, completion, { nextId: () => "log-2", nowIso: () => "2026-09-25T12:02:00.000Z", nowMs: () => 2_000 });

    expect(once.restTargetEndTime).toBe(91_000);
    expect(twice.setLogs).toHaveLength(session().setLogs.length + 2);
    expect(twice.setLogs.map((log) => log.id)).toEqual(["log-1", "log-2"]);
    expect(twice.currentItemIndex).toBe(1);
  });

  it("keeps both rapid set logs when the first write is still in flight", async () => {
    const firstItem = workoutItem("item-1", 2);
    const sequence = [{ item: firstItem }];
    const writes: LocalWorkoutSession[] = [];
    let releaseFirst: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    const store = createSessionStore({
      initial: session(),
      now: () => "2026-09-25T12:05:00.000Z",
      write: async (snapshot) => {
        if (writes.length === 0) await gate;
        writes.push(snapshot);
      },
    });

    const first = store.update((current) => applySetCompletion(current, firstItem, sequence, completion, { nextId: () => "log-1", nowIso: () => "t1", nowMs: () => 1 }));
    const second = store.update((current) => applySetCompletion(current, firstItem, sequence, completion, { nextId: () => "log-2", nowIso: () => "t2", nowMs: () => 2 }));
    expect(store.current.setLogs).toHaveLength(2);
    expect(store.current.setLogs.map((log) => log.id)).toEqual(["log-1", "log-2"]);

    releaseFirst();
    await Promise.all([first, second]);
    expect(writes.map((snapshot) => snapshot.setLogs.length)).toEqual([1, 2]);
    expect(writes[1]?.setLogs.map((log) => log.id)).toEqual(["log-1", "log-2"]);
  });

  it("does not persist a stale active snapshot after completion", async () => {
    const writes: Array<LocalWorkoutSession["status"]> = [];
    const store = createSessionStore({
      initial: session({ restTargetEndTime: 50_000 }),
      now: () => "2026-09-25T12:10:00.000Z",
      write: async (snapshot) => {
        if (snapshot.status === "active") await delay(30);
        writes.push(snapshot.status);
      },
    });

    const activeWrite = store.update((current) => ({ ...current, notes: "still-active" }));
    const completedWrite = store.update((current) => ({
      ...current,
      status: "completed",
      completedAt: "2026-09-25T12:11:00.000Z",
      restTargetEndTime: null,
    }));
    const rollback = store.update((current) => ({
      ...current,
      status: "active",
      completedAt: null,
      restTargetEndTime: 99_000,
    }));

    await Promise.all([activeWrite, completedWrite, rollback]);

    expect(store.current.status).toBe("completed");
    expect(store.current.completedAt).toBe("2026-09-25T12:11:00.000Z");
    expect(store.current.restTargetEndTime).toBeNull();
    expect(writes).toEqual(["active", "completed"]);
  });

  it("clears rest on the latest snapshot instead of rolling back set logs", async () => {
    const firstItem = workoutItem("item-1", 1);
    const sequence = [{ item: firstItem }];
    const writes: LocalWorkoutSession[] = [];
    const store = createSessionStore({
      initial: session(),
      now: () => "2026-09-25T12:12:00.000Z",
      write: async (snapshot) => {
        writes.push(snapshot);
      },
    });

    void store.update((current) => applySetCompletion(current, firstItem, sequence, completion, { nextId: () => "log-1", nowIso: () => "t1", nowMs: () => 1 }));
    void store.update((current) => ({ ...current, restTargetEndTime: null }));
    await store.whenIdle();

    expect(store.current.setLogs).toHaveLength(1);
    expect(store.current.restTargetEndTime).toBeNull();
    expect(writes.at(-1)?.setLogs).toHaveLength(1);
  });
});

describe("loaded session routing", () => {
  it("treats a missing record and a mismatched workout as unusable", () => {
    expect(resolveLoadedSession(undefined, "day-1")).toEqual({ state: "missing" });
    expect(resolveLoadedSession(session({ workoutDayId: "day-2" }), "day-1")).toEqual({ state: "mismatch" });
    expect(resolveLoadedSession(session(), "day-1").state).toBe("found");
  });
});
