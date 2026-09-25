import { describe, expect, it } from "vitest";
import { parseSyncBody } from "@/lib/sync-payload";

const sessionId = "10000000-0000-4000-8000-000000000072";
const dayId = "10000000-0000-4000-8000-000000000031";
const itemId = "10000000-0000-4000-8000-000000000051";
const setId = "10000000-0000-4000-8000-000000000081";

function sessionPayload(overrides: Record<string, unknown> = {}) {
  return {
    type: "session_snapshot",
    payload: {
      id: sessionId,
      workoutDayId: dayId,
      startedAt: "2026-09-24T12:00:00.000Z",
      completedAt: null,
      status: "active",
      notes: "",
      updatedAt: "2026-09-24T12:00:00.000Z",
      setLogs: [{
        id: setId,
        workoutItemId: itemId,
        setNumber: 1,
        targetReps: 8,
        actualReps: 8,
        targetWeight: 20,
        targetWeightUnit: "kg",
        actualWeight: 20,
        weightUnit: "kg",
        durationSec: null,
        rpe: null,
        completedAt: "2026-09-24T12:05:00.000Z",
      }],
      ...overrides,
    },
  };
}

describe("sync payload", () => {
  it("rejects an unknown body before any write", () => {
    expect(parseSyncBody({ type: "nope" })).toEqual({ ok: false, error: "invalid_payload" });
    expect(parseSyncBody(null)).toEqual({ ok: false, error: "invalid_payload" });
  });

  it("rejects a set log that is not an object", () => {
    expect(parseSyncBody(sessionPayload({ setLogs: [null] }))).toEqual({ ok: false, error: "invalid_session_payload" });
  });

  it("accepts a session snapshot", () => {
    const parsed = parseSyncBody(sessionPayload());
    expect(parsed.ok).toBe(true);
  });
});
