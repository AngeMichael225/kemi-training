const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_SET_LOGS = 200;

export interface SyncSetLog {
  id: string;
  workoutItemId: string;
  setNumber: number;
  targetReps: number | null;
  actualReps: number | null;
  targetWeight: number | null;
  targetWeightUnit: "kg" | "lbs" | null;
  actualWeight: number | null;
  weightUnit: "kg" | "lbs" | null;
  durationSec: number | null;
  rpe: number | null;
  completedAt: string | null;
}

export interface SyncSessionPayload {
  id: string;
  workoutDayId: string;
  startedAt: string;
  completedAt: string | null;
  status: "active" | "completed" | "abandoned";
  notes: string;
  updatedAt: string;
  exerciseNotes: Record<string, string>;
  setLogs: SyncSetLog[];
}

export interface SyncStrengthPayload {
  id: string;
  exerciseId: string;
  performedAt: string;
  finalWeight: number | null;
  repetitions: number | null;
  weightUnit: "kg" | "lbs" | null;
  estimated1rm: number | null;
  formula: string | null;
}

export type ParsedSyncBody =
  | { ok: true; type: "session_snapshot"; payload: SyncSessionPayload }
  | { ok: true; type: "strength_test_result"; payload: SyncStrengthPayload }
  | { ok: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

function isNullableNumber(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isFinite(value));
}

function isUnit(value: unknown): value is "kg" | "lbs" | null {
  return value === null || value === "kg" || value === "lbs";
}

function parseSetLog(value: unknown): SyncSetLog | null {
  if (!isRecord(value)) return null;
  if (!isUuid(value.id) || !isUuid(value.workoutItemId)) return null;
  if (typeof value.setNumber !== "number" || !Number.isInteger(value.setNumber) || value.setNumber < 1) return null;
  if (!isNullableNumber(value.targetReps) || !isNullableNumber(value.actualReps)) return null;
  if (!isNullableNumber(value.targetWeight) || !isNullableNumber(value.actualWeight)) return null;
  if (!isUnit(value.targetWeightUnit) || !isUnit(value.weightUnit)) return null;
  if (!isNullableNumber(value.durationSec) || !isNullableNumber(value.rpe)) return null;
  if (value.completedAt !== null && typeof value.completedAt !== "string") return null;
  return {
    id: value.id,
    workoutItemId: value.workoutItemId,
    setNumber: value.setNumber,
    targetReps: value.targetReps,
    actualReps: value.actualReps,
    targetWeight: value.targetWeight,
    targetWeightUnit: value.targetWeightUnit,
    actualWeight: value.actualWeight,
    weightUnit: value.weightUnit,
    durationSec: value.durationSec,
    rpe: value.rpe,
    completedAt: value.completedAt,
  };
}

function parseSession(value: unknown): SyncSessionPayload | null {
  if (!isRecord(value)) return null;
  if (!isUuid(value.id) || !isUuid(value.workoutDayId)) return null;
  if (typeof value.startedAt !== "string" || typeof value.updatedAt !== "string") return null;
  if (value.completedAt !== null && typeof value.completedAt !== "string") return null;
  if (value.status !== "active" && value.status !== "completed" && value.status !== "abandoned") return null;
  if (typeof value.notes !== "string") return null;
  if (!Array.isArray(value.setLogs) || value.setLogs.length > MAX_SET_LOGS) return null;
  const setLogs: SyncSetLog[] = [];
  const seenIds = new Set<string>();
  const seenNumbers = new Set<string>();
  for (const entry of value.setLogs) {
    const log = parseSetLog(entry);
    if (!log) return null;
    if (seenIds.has(log.id)) return null;
    const numberKey = `${log.workoutItemId}:${log.setNumber}`;
    if (seenNumbers.has(numberKey)) return null;
    seenIds.add(log.id);
    seenNumbers.add(numberKey);
    setLogs.push(log);
  }
  const exerciseNotes: Record<string, string> = {};
  if (value.exerciseNotes !== undefined) {
    if (!isRecord(value.exerciseNotes)) return null;
    for (const [key, note] of Object.entries(value.exerciseNotes)) {
      if (!isUuid(key) || typeof note !== "string") return null;
      exerciseNotes[key] = note;
    }
  }
  return {
    id: value.id,
    workoutDayId: value.workoutDayId,
    startedAt: value.startedAt,
    completedAt: value.completedAt,
    status: value.status,
    notes: value.notes,
    updatedAt: value.updatedAt,
    exerciseNotes,
    setLogs,
  };
}

function parseStrength(value: unknown): SyncStrengthPayload | null {
  if (!isRecord(value)) return null;
  if (!isUuid(value.id) || !isUuid(value.exerciseId) || typeof value.performedAt !== "string") return null;
  if (!isNullableNumber(value.finalWeight) || !isNullableNumber(value.repetitions) || !isNullableNumber(value.estimated1rm)) return null;
  if (!isUnit(value.weightUnit)) return null;
  if (value.formula !== null && value.formula !== undefined && typeof value.formula !== "string") return null;
  return {
    id: value.id,
    exerciseId: value.exerciseId,
    performedAt: value.performedAt,
    finalWeight: value.finalWeight,
    repetitions: value.repetitions,
    weightUnit: value.weightUnit,
    estimated1rm: value.estimated1rm,
    formula: typeof value.formula === "string" ? value.formula : null,
  };
}

export function parseSyncBody(body: unknown): ParsedSyncBody {
  if (!isRecord(body)) return { ok: false, error: "invalid_payload" };
  if (body.type === "session_snapshot") {
    const payload = parseSession(body.payload);
    return payload ? { ok: true, type: "session_snapshot", payload } : { ok: false, error: "invalid_session_payload" };
  }
  if (body.type === "strength_test_result") {
    const payload = parseStrength(body.payload);
    return payload ? { ok: true, type: "strength_test_result", payload } : { ok: false, error: "invalid_strength_payload" };
  }
  return { ok: false, error: "invalid_payload" };
}
