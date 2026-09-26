import { describe, expect, it } from "vitest";
import { brzyckiEstimated1RM } from "@/lib/strength";
import {
  bestEstimated1rmKg,
  completedSessionSummaries,
  displayLoggedWeight,
  exerciseHistoryRows,
  personalRecordsFromSessions,
  progressVolumesKg,
  recentStrengthTests,
  selectCompletedSessions,
  sessionVolumeKg,
} from "@/lib/progress-data";
import type { LocalWorkoutSession, SessionSetLog, StrengthTestResultLocal } from "@/lib/training-model";

function log(partial: Partial<SessionSetLog> & Pick<SessionSetLog, "id" | "exerciseId">): SessionSetLog {
  return {
    workoutItemId: "item-1",
    setNumber: 1,
    targetReps: 5,
    actualReps: 5,
    targetWeight: 50,
    targetWeightUnit: "kg",
    actualWeight: 50,
    weightUnit: "kg",
    durationSec: null,
    rpe: null,
    completedAt: "2026-09-25T12:00:00.000Z",
    ...partial,
  };
}

function session(partial: Partial<LocalWorkoutSession> & Pick<LocalWorkoutSession, "id" | "status">): LocalWorkoutSession {
  return {
    workoutDayId: "day-1",
    workoutTitle: "Jour 1",
    weekNumber: 1,
    dayNumber: 1,
    startedAt: "2026-09-25T11:00:00.000Z",
    completedAt: partial.status === "completed" ? "2026-09-25T12:00:00.000Z" : null,
    currentItemIndex: 0,
    notes: "",
    setLogs: [],
    restTargetEndTime: null,
    updatedAt: "2026-09-25T12:00:00.000Z",
    ...partial,
  };
}

describe("progress-data selectors", () => {
  it("counts only completed sessions toward progress", () => {
    const sessions = [
      session({ id: "active", status: "active", setLogs: [log({ id: "a", exerciseId: "ex-1", actualWeight: 100 })] }),
      session({ id: "done", status: "completed", setLogs: [log({ id: "b", exerciseId: "ex-1", actualWeight: 40, actualReps: 5 })] }),
    ];

    const completed = selectCompletedSessions(sessions);
    expect(completed).toHaveLength(1);
    expect(completed[0].id).toBe("done");
    expect(completedSessionSummaries(sessions)).toHaveLength(1);
    expect(progressVolumesKg(sessions)).toEqual([200]);
    expect(personalRecordsFromSessions(sessions, () => "Squat")).toEqual([
      { exerciseId: "ex-1", name: "Squat", weightKg: 40 },
    ]);
  });

  it("builds personal records from actual logged weight only", () => {
    const sessions = [
      session({
        id: "done",
        status: "completed",
        setLogs: [
          log({ id: "1", exerciseId: "squat", actualWeight: 50, targetWeight: 999 }),
          log({ id: "2", exerciseId: "squat", actualWeight: null, weightUnit: null, targetWeight: 120 }),
          log({ id: "3", exerciseId: "row", actualWeight: 80, weightUnit: "lbs" }),
        ],
      }),
    ];

    const records = personalRecordsFromSessions(sessions, (id) => id);
    expect(records.map((row) => row.exerciseId)).toEqual(["squat", "row"]);
    expect(records[0].weightKg).toBe(50);
    expect(records[1].weightKg).toBeCloseTo(80 / 2.2046, 4);
  });

  it("does not invent missing loads in exercise history", () => {
    const sessions = [
      session({
        id: "done",
        status: "completed",
        weekNumber: 2,
        dayNumber: 3,
        setLogs: [
          log({ id: "1", exerciseId: "deadlift", actualWeight: null, weightUnit: null, actualReps: 5 }),
          log({ id: "2", exerciseId: "deadlift", actualWeight: 60, weightUnit: "kg", actualReps: 3 }),
        ],
      }),
      session({
        id: "active",
        status: "active",
        setLogs: [log({ id: "3", exerciseId: "deadlift", actualWeight: 200 })],
      }),
    ];

    const rows = exerciseHistoryRows(sessions, "deadlift", "lbs");
    expect(rows).toHaveLength(2);
    expect(rows[0].displayWeight).toBeNull();
    expect(rows[0].actualReps).toBe(5);
    expect(rows[0].weekNumber).toBe(2);
    expect(rows[0].dayNumber).toBe(3);
    expect(rows[1].displayWeight).toBeCloseTo(60 * 2.2046, 4);
    expect(displayLoggedWeight(log({ id: "x", exerciseId: "deadlift", actualWeight: null, weightUnit: null }), "kg")).toBeNull();
  });

  it("converts kg/lbs for display without fabricating values", () => {
    const kgLog = log({ id: "kg", exerciseId: "ex", actualWeight: 50, weightUnit: "kg" });
    const lbsLog = log({ id: "lbs", exerciseId: "ex", actualWeight: 110, weightUnit: "lbs" });
    expect(displayLoggedWeight(kgLog, "lbs")).toBeCloseTo(110.23, 2);
    expect(displayLoggedWeight(lbsLog, "kg")).toBeCloseTo(110 / 2.2046, 4);
    expect(sessionVolumeKg(session({
      id: "done",
      status: "completed",
      setLogs: [log({ id: "v", exerciseId: "ex", actualWeight: 50, actualReps: 4 })],
    }))).toBe(200);
  });

  it("keeps recent strength tests newest-first by name", () => {
    const tests: StrengthTestResultLocal[] = [
      {
        id: "1",
        testId: "t1",
        testName: "Back Squat",
        exerciseId: "e1",
        performedAt: "2026-09-20T10:00:00.000Z",
        finalWeight: 50,
        repetitions: 5,
        weightUnit: "kg",
        estimated1rm: 56.25562556,
        formula: "Brzycki",
      },
      {
        id: "2",
        testId: "t1",
        testName: "Back Squat",
        exerciseId: "e1",
        performedAt: "2026-09-25T10:00:00.000Z",
        finalWeight: 52.5,
        repetitions: 5,
        weightUnit: "kg",
        estimated1rm: 59,
        formula: "Brzycki",
      },
      {
        id: "3",
        testId: "t2",
        testName: "Hip Thrust",
        exerciseId: "e2",
        performedAt: "2026-09-24T10:00:00.000Z",
        finalWeight: null,
        repetitions: 5,
        weightUnit: null,
        estimated1rm: null,
        formula: "Brzycki",
      },
    ];

    const recent = recentStrengthTests(tests);
    expect(recent.map((row) => row.id)).toEqual(["2", "3"]);
    expect(bestEstimated1rmKg(tests)).toBe(59);
    expect(bestEstimated1rmKg([{ ...tests[2] }])).toBeNull();
  });
});

describe("Brzycki estimated 1RM (Wave 06)", () => {
  it("matches the workbook formula", () => {
    expect(brzyckiEstimated1RM(50, 5)).toBeCloseTo(56.25562556, 6);
  });
});
