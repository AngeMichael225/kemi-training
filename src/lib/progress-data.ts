import type { LocalWorkoutSession, SessionSetLog, StrengthTestResultLocal } from "@/lib/training-model";
import { convertWeight, type WeightUnit } from "@/lib/units";

export interface PersonalRecord {
  exerciseId: string;
  name: string;
  weightKg: number;
}

export interface ExerciseHistoryRow {
  id: string;
  exerciseId: string;
  completedAt: string;
  weekNumber: number;
  dayNumber: number;
  actualReps: number | null;
  /** Logged weight converted to the preferred display unit, or null when missing. */
  displayWeight: number | null;
  weightUnit: WeightUnit | null;
}

export interface CompletedSessionSummary {
  id: string;
  weekNumber: number;
  dayNumber: number;
  workoutTitle: string;
  completedAt: string;
  setCount: number;
  volumeKg: number;
}

function weightKgFromLog(log: SessionSetLog): number | null {
  if (log.actualWeight === null || !log.weightUnit) return null;
  return log.weightUnit === "kg" ? log.actualWeight : convertWeight(log.actualWeight, "lbs", "kg");
}

/** Prefer completed sessions only; never count active/incomplete toward progress. */
export function selectCompletedSessions(sessions: readonly LocalWorkoutSession[]): LocalWorkoutSession[] {
  return sessions
    .filter((session) => session.status === "completed" && session.completedAt !== null)
    .slice()
    .sort((a, b) => (b.completedAt ?? b.startedAt).localeCompare(a.completedAt ?? a.startedAt));
}

export function sessionVolumeKg(session: LocalWorkoutSession): number {
  return session.setLogs.reduce((sum, log) => {
    const kg = weightKgFromLog(log);
    if (kg === null || log.actualReps === null) return sum;
    return sum + kg * log.actualReps;
  }, 0);
}

export function progressVolumesKg(sessions: readonly LocalWorkoutSession[]): number[] {
  return selectCompletedSessions(sessions)
    .slice()
    .reverse()
    .map(sessionVolumeKg)
    .filter((value) => value > 0);
}

export function personalRecordsFromSessions(
  sessions: readonly LocalWorkoutSession[],
  resolveName: (exerciseId: string) => string,
  limit = 5,
): PersonalRecord[] {
  const byExercise = new Map<string, number>();
  for (const session of selectCompletedSessions(sessions)) {
    for (const log of session.setLogs) {
      const kg = weightKgFromLog(log);
      if (kg === null) continue;
      byExercise.set(log.exerciseId, Math.max(byExercise.get(log.exerciseId) ?? 0, kg));
    }
  }
  return [...byExercise.entries()]
    .map(([exerciseId, weightKg]) => ({
      exerciseId,
      name: resolveName(exerciseId),
      weightKg,
    }))
    .sort((a, b) => b.weightKg - a.weightKg)
    .slice(0, limit);
}

export function displayLoggedWeight(log: SessionSetLog, preferredUnit: WeightUnit): number | null {
  const kg = weightKgFromLog(log);
  if (kg === null) return null;
  return preferredUnit === "kg" ? kg : convertWeight(kg, "kg", "lbs");
}

export function exerciseHistoryRows(
  sessions: readonly LocalWorkoutSession[],
  exerciseId: string,
  preferredUnit: WeightUnit,
): ExerciseHistoryRow[] {
  return selectCompletedSessions(sessions).flatMap((session) =>
    session.setLogs
      .filter((log) => log.exerciseId === exerciseId)
      .map((log) => ({
        id: log.id,
        exerciseId: log.exerciseId,
        completedAt: log.completedAt,
        weekNumber: session.weekNumber,
        dayNumber: session.dayNumber,
        actualReps: log.actualReps,
        displayWeight: displayLoggedWeight(log, preferredUnit),
        weightUnit: log.actualWeight === null || !log.weightUnit ? null : preferredUnit,
      })),
  );
}

export function completedSessionSummaries(
  sessions: readonly LocalWorkoutSession[],
  limit = 8,
): CompletedSessionSummary[] {
  return selectCompletedSessions(sessions)
    .slice(0, limit)
    .map((session) => ({
      id: session.id,
      weekNumber: session.weekNumber,
      dayNumber: session.dayNumber,
      workoutTitle: session.workoutTitle,
      completedAt: session.completedAt ?? session.startedAt,
      setCount: session.setLogs.length,
      volumeKg: sessionVolumeKg(session),
    }));
}

export function recentStrengthTests(
  tests: readonly StrengthTestResultLocal[],
  limit = 3,
): StrengthTestResultLocal[] {
  const newestFirst = tests.slice().sort((a, b) => b.performedAt.localeCompare(a.performedAt));
  const byName = new Map<string, StrengthTestResultLocal>();
  for (const result of newestFirst) {
    if (!byName.has(result.testName)) byName.set(result.testName, result);
  }
  return [...byName.values()].slice(0, limit);
}

export function bestEstimated1rmKg(tests: readonly StrengthTestResultLocal[]): number | null {
  let best: number | null = null;
  for (const result of tests) {
    if (result.estimated1rm === null) continue;
    best = best === null ? result.estimated1rm : Math.max(best, result.estimated1rm);
  }
  return best;
}

export function formatRecordWeight(weightKg: number, unit: WeightUnit): string {
  const value = unit === "kg" ? weightKg : convertWeight(weightKg, "kg", "lbs");
  return `${value.toFixed(value % 1 ? 1 : 0)} ${unit}`;
}
