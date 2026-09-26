import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { getAllSessions, getOrCreateActiveSession, getPendingMutations, resetOfflineDatabaseForTests } from "@/lib/offline-db";
import { getWorkoutContext } from "@/lib/training-data";

const day1 = getWorkoutContext("22a6f767-4aa0-5b1a-80f8-54b8d4c06e54");
const day2 = getWorkoutContext("578ad006-79bd-5815-b741-4896912e1094");

if (!day1 || !day2) {
  throw new Error("Week 1 workout days are missing from the training seed");
}

describe("one active local session", () => {
  beforeEach(async () => {
    await resetOfflineDatabaseForTests();
  });

  it("creates a session and a matching pending mutation on the first start", async () => {
    const created = await getOrCreateActiveSession(day1.day, day1.week);
    const sessions = await getAllSessions();
    const pending = await getPendingMutations();

    expect(created.status).toBe("active");
    expect(created.workoutDayId).toBe(day1.day.id);
    expect(sessions).toHaveLength(1);
    expect(pending).toEqual([
      expect.objectContaining({
        id: `session:${created.id}`,
        type: "session_snapshot",
        payload: created,
      }),
    ]);
  });

  it("returns the same active session on a second start", async () => {
    const first = await getOrCreateActiveSession(day1.day, day1.week);
    const second = await getOrCreateActiveSession(day1.day, day1.week);

    expect(second.id).toBe(first.id);
    expect(await getAllSessions()).toHaveLength(1);
    expect(second.status).toBe("active");
  });

  it("keeps a single active session when starts overlap", async () => {
    const [first, second] = await Promise.all([
      getOrCreateActiveSession(day1.day, day1.week),
      getOrCreateActiveSession(day1.day, day1.week),
    ]);
    const sessions = await getAllSessions();

    expect(first.id).toBe(second.id);
    expect(sessions.filter((row) => row.status === "active")).toHaveLength(1);
  });

  it("resumes the existing workout day when another day is requested", async () => {
    const existing = await getOrCreateActiveSession(day1.day, day1.week);
    const resumed = await getOrCreateActiveSession(day2.day, day2.week);
    const sessions = await getAllSessions();

    expect(resumed.id).toBe(existing.id);
    expect(resumed.workoutDayId).toBe(existing.workoutDayId);
    expect(resumed.workoutDayId).toBe(day1.day.id);
    expect(sessions.filter((row) => row.status === "active")).toHaveLength(1);
  });
});
