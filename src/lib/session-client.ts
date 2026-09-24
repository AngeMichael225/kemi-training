"use client";

import type { LocalWorkoutSession, ProgramWeekSeed, WorkoutDaySeed } from "@/lib/training-model";
import { saveSession } from "@/lib/offline-db";

export async function createLocalSession(day: WorkoutDaySeed, week: ProgramWeekSeed): Promise<LocalWorkoutSession> {
  const now = new Date().toISOString();
  const session: LocalWorkoutSession = {
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
  await saveSession(session);
  return session;
}
