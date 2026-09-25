import type { LocalWorkoutSession, SessionSetLog, WorkoutItem } from "@/lib/training-model";
import type { WeightUnit } from "@/lib/units";

export interface SetCompletionInput {
  reps: number | null;
  weight: number | null;
  unit: WeightUnit | null;
  durationSec: number | null;
}

export type LoadedSessionState =
  | { state: "missing" }
  | { state: "mismatch" }
  | { state: "found"; session: LocalWorkoutSession };

export function targetSets(item: WorkoutItem): number {
  if (item.item_kind === "cardio" || item.item_kind === "strength_test") return 1;
  return Math.max(1, item.prescribed_sets ?? 1);
}

export function resolveLoadedSession(
  stored: LocalWorkoutSession | undefined,
  workoutDayId: string,
): LoadedSessionState {
  if (!stored) return { state: "missing" };
  if (stored.workoutDayId !== workoutDayId) return { state: "mismatch" };
  return { state: "found", session: stored };
}

export function applySetCompletion(
  current: LocalWorkoutSession,
  item: WorkoutItem,
  sequence: ReadonlyArray<{ item: WorkoutItem }>,
  data: SetCompletionInput,
  ids: { nextId?: () => string; nowIso?: () => string; nowMs?: () => number } = {},
): LocalWorkoutSession {
  const nextId = ids.nextId ?? (() => crypto.randomUUID());
  const nowIso = ids.nowIso ?? (() => new Date().toISOString());
  const nowMs = ids.nowMs ?? (() => Date.now());
  const itemLogs = current.setLogs.filter((log) => log.workoutItemId === item.id);
  const itemTarget = targetSets(item);
  const nextLog: SessionSetLog = {
    id: nextId(),
    workoutItemId: item.id,
    exerciseId: item.exercise_id,
    setNumber: Math.min(itemTarget, itemLogs.length + 1),
    targetReps: item.prescribed_reps,
    actualReps: data.reps,
    targetWeight: item.prescribed_weight,
    targetWeightUnit: item.weight_unit,
    actualWeight: data.weight,
    weightUnit: data.unit,
    durationSec: data.durationSec,
    rpe: null,
    completedAt: nowIso(),
  };
  const setLogs = [...current.setLogs, nextLog];
  const logsForItemAfter = itemLogs.length + 1;
  const completesItem = logsForItemAfter >= itemTarget;
  const completedItemCount = sequence.filter(({ item: candidate }) => {
    const count = setLogs.filter((log) => log.workoutItemId === candidate.id).length;
    return count >= targetSets(candidate);
  }).length;
  const itemIndex = sequence.findIndex((entry) => entry.item.id === item.id);
  const alreadyPast = itemIndex >= 0 && current.currentItemIndex > itemIndex;
  const nextIndex = completesItem && !alreadyPast && itemIndex >= 0
    ? Math.min(itemIndex + 1, Math.max(0, sequence.length - 1))
    : current.currentItemIndex;
  const willCompleteWorkout = sequence.length > 0 && completesItem && completedItemCount >= sequence.length;
  let restTargetEndTime: number | null;
  if (alreadyPast) {
    restTargetEndTime = current.restTargetEndTime;
  } else if (item.rest_seconds && item.rest_seconds > 0 && !willCompleteWorkout) {
    restTargetEndTime = nowMs() + item.rest_seconds * 1000;
  } else {
    restTargetEndTime = null;
  }

  return {
    ...current,
    setLogs,
    currentItemIndex: nextIndex,
    restTargetEndTime,
  };
}
