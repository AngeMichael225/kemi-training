"use client";

import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { LocalWorkoutSession, ProgramWeekSeed, StrengthTestResultLocal, WorkoutDaySeed } from "@/lib/training-model";
import type { WeightUnit } from "@/lib/units";

export interface PendingMutation {
  id: string;
  type: "session_snapshot" | "strength_test_result";
  payload: unknown;
  createdAt: string;
}

/** Oldest first; equal timestamps break ties by id for a stable sync order. */
export function comparePendingMutations(a: PendingMutation, b: PendingMutation): number {
  const byCreated = a.createdAt.localeCompare(b.createdAt);
  if (byCreated !== 0) return byCreated;
  return a.id.localeCompare(b.id);
}

interface PreferenceRecord {
  key: string;
  value: unknown;
}

interface CustomMediaRecord {
  exerciseId: string;
  blob: Blob;
  fileName: string;
  mimeType: string;
  updatedAt: string;
}

interface KemiDB extends DBSchema {
  sessions: {
    key: string;
    value: LocalWorkoutSession;
    indexes: { "by-status": string; "by-workout": string; "by-started": string };
  };
  pendingMutations: {
    key: string;
    value: PendingMutation;
    indexes: { "by-created": string };
  };
  preferences: {
    key: string;
    value: PreferenceRecord;
  };
  customMedia: {
    key: string;
    value: CustomMediaRecord;
  };
  strengthTests: {
    key: string;
    value: StrengthTestResultLocal;
    indexes: { "by-test": string; "by-performed": string };
  };
}

let database: Promise<IDBPDatabase<KemiDB>> | null = null;
let activeSessionChain: Promise<void> = Promise.resolve();

function db(): Promise<IDBPDatabase<KemiDB>> {
  if (!database) {
    database = openDB<KemiDB>("kemi-training-v1", 1, {
      upgrade(databaseInstance) {
        const sessions = databaseInstance.createObjectStore("sessions", { keyPath: "id" });
        sessions.createIndex("by-status", "status");
        sessions.createIndex("by-workout", "workoutDayId");
        sessions.createIndex("by-started", "startedAt");

        const pending = databaseInstance.createObjectStore("pendingMutations", { keyPath: "id" });
        pending.createIndex("by-created", "createdAt");

        databaseInstance.createObjectStore("preferences", { keyPath: "key" });
        databaseInstance.createObjectStore("customMedia", { keyPath: "exerciseId" });

        const tests = databaseInstance.createObjectStore("strengthTests", { keyPath: "id" });
        tests.createIndex("by-test", "testId");
        tests.createIndex("by-performed", "performedAt");
      },
    });
  }
  return database!;
}

function pendingSessionMutation(session: LocalWorkoutSession, createdAt: string): PendingMutation {
  return {
    id: `session:${session.id}`,
    type: "session_snapshot",
    payload: session,
    createdAt,
  };
}

export async function saveSession(session: LocalWorkoutSession, queueSync = true): Promise<void> {
  const databaseInstance = await db();
  const tx = databaseInstance.transaction(
    queueSync ? ["sessions", "pendingMutations"] : ["sessions"],
    "readwrite",
  );
  await tx.objectStore("sessions").put(session);
  if (queueSync) {
    // Coalesce by session id: put replaces any older snapshot for the same session.
    await tx.objectStore("pendingMutations").put(pendingSessionMutation(session, new Date().toISOString()));
  }
  await tx.done;
}

function blankActiveSession(day: WorkoutDaySeed, week: ProgramWeekSeed, now: string): LocalWorkoutSession {
  return {
    id: crypto.randomUUID(),
    workoutDayId: day.id,
    workoutTitle: `${week.name} - ${day.title}`,
    weekNumber: week.week_number,
    dayNumber: day.day_number,
    startedAt: now,
    completedAt: null,
    status: "active",
    currentItemIndex: 0,
    notes: "",
    exerciseNotes: {},
    setLogs: [],
    restTargetEndTime: null,
    updatedAt: now,
  };
}

async function insertOrResumeActiveSession(day: WorkoutDaySeed, week: ProgramWeekSeed): Promise<LocalWorkoutSession> {
  const databaseInstance = await db();
  const tx = databaseInstance.transaction(["sessions", "pendingMutations"], "readwrite");
  const sessions = tx.objectStore("sessions");
  const actives = await sessions.index("by-status").getAll("active");
  if (actives.length > 0) {
    const canonical = actives.reduce((best, candidate) => (
      candidate.updatedAt.localeCompare(best.updatedAt) > 0 ? candidate : best
    ));
    await tx.done;
    return canonical;
  }

  const now = new Date().toISOString();
  const session = blankActiveSession(day, week, now);
  await sessions.put(session);
  await tx.objectStore("pendingMutations").put(pendingSessionMutation(session, now));
  await tx.done;
  return session;
}

export function getOrCreateActiveSession(day: WorkoutDaySeed, week: ProgramWeekSeed): Promise<LocalWorkoutSession> {
  const run = activeSessionChain.then(() => insertOrResumeActiveSession(day, week));
  activeSessionChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export async function resetOfflineDatabaseForTests(): Promise<void> {
  activeSessionChain = Promise.resolve();
  const pending = database;
  database = null;
  if (pending) {
    try {
      const instance = await pending;
      instance.close();
    } catch {
      // A failed open is already discarded with the singleton.
    }
  }
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase("kemi-training-v1");
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error("IndexedDB delete failed"));
    request.onblocked = () => resolve();
  });
}

export async function getSession(id: string): Promise<LocalWorkoutSession | undefined> {
  return (await db()).get("sessions", id);
}

export async function getActiveSession(): Promise<LocalWorkoutSession | undefined> {
  const values = await (await db()).getAllFromIndex("sessions", "by-status", "active");
  return values.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
}

export async function getAllSessions(): Promise<LocalWorkoutSession[]> {
  return (await db()).getAll("sessions");
}

export async function getCompletedSessions(): Promise<LocalWorkoutSession[]> {
  const values = await (await db()).getAllFromIndex("sessions", "by-status", "completed");
  return values.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

export async function getLastPerformance(exerciseId: string) {
  const sessions = await getCompletedSessions();
  for (const session of sessions) {
    const logs = session.setLogs
      .filter((log) => log.exerciseId === exerciseId)
      .sort((a, b) => b.setNumber - a.setNumber);
    if (logs.length) return logs[0];
  }
  return undefined;
}

export async function getPendingMutations(): Promise<PendingMutation[]> {
  const values = await (await db()).getAll("pendingMutations");
  return values.sort(comparePendingMutations);
}

/** Test helper: insert a pending row with an explicit createdAt. */
export async function putPendingMutationForTests(mutation: PendingMutation): Promise<void> {
  await (await db()).put("pendingMutations", mutation);
}

export async function deletePendingMutation(id: string): Promise<void> {
  await (await db()).delete("pendingMutations", id);
}

export async function setPreference(key: string, value: unknown): Promise<void> {
  await (await db()).put("preferences", { key, value });
}

export async function getPreference<T>(key: string, fallback: T): Promise<T> {
  const record = await (await db()).get("preferences", key);
  return (record?.value as T | undefined) ?? fallback;
}

export async function getPreferredWeightUnit(): Promise<WeightUnit> {
  return getPreference<WeightUnit>("preferredWeightUnit", "kg");
}

export async function saveCustomMedia(
  exerciseId: string,
  blob: Blob,
  fileName: string,
  mimeType: string,
): Promise<void> {
  await (await db()).put("customMedia", {
    exerciseId,
    blob,
    fileName,
    mimeType,
    updatedAt: new Date().toISOString(),
  });
}

export async function getCustomMedia(exerciseId: string): Promise<CustomMediaRecord | undefined> {
  return (await db()).get("customMedia", exerciseId);
}

export async function saveStrengthTestResult(result: StrengthTestResultLocal): Promise<void> {
  const databaseInstance = await db();
  await databaseInstance.put("strengthTests", result);
  await databaseInstance.put("pendingMutations", {
    id: `strength:${result.id}`,
    type: "strength_test_result",
    payload: result,
    createdAt: new Date().toISOString(),
  });
}

export async function getStrengthTestResults(): Promise<StrengthTestResultLocal[]> {
  const values = await (await db()).getAll("strengthTests");
  return values.sort((a, b) => b.performedAt.localeCompare(a.performedAt));
}
