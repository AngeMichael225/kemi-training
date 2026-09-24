"use client";

import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { LocalWorkoutSession, StrengthTestResultLocal } from "@/lib/training-model";
import type { WeightUnit } from "@/lib/units";

interface PendingMutation {
  id: string;
  type: "session_snapshot" | "strength_test_result";
  payload: unknown;
  createdAt: string;
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

export async function saveSession(session: LocalWorkoutSession, queueSync = true): Promise<void> {
  const databaseInstance = await db();
  await databaseInstance.put("sessions", session);
  if (queueSync) {
    await databaseInstance.put("pendingMutations", {
      id: `session:${session.id}`,
      type: "session_snapshot",
      payload: session,
      createdAt: new Date().toISOString(),
    });
  }
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
  return (await db()).getAll("pendingMutations");
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
