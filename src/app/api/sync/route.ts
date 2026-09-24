import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { LocalWorkoutSession, StrengthTestResultLocal } from "@/lib/training-model";

function isSession(value: unknown): value is LocalWorkoutSession {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<LocalWorkoutSession>;
  return typeof item.id === "string" && typeof item.workoutDayId === "string" && Array.isArray(item.setLogs);
}

function isStrengthResult(value: unknown): value is StrengthTestResultLocal {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<StrengthTestResultLocal>;
  return typeof item.id === "string" && typeof item.exerciseId === "string" && typeof item.performedAt === "string";
}

export async function POST(request: Request) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    return NextResponse.json({ ok: false, mode: "local" }, { status: 503 });
  }
  const body = await request.json().catch(() => null) as { type?: string; payload?: unknown } | null;
  if (!body || !["session_snapshot", "strength_test_result"].includes(body.type ?? "")) {
    return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return NextResponse.json({ ok: false }, { status: 401 });

  if (body.type === "strength_test_result") {
    if (!isStrengthResult(body.payload)) return NextResponse.json({ ok: false, error: "invalid_strength_payload" }, { status: 400 });
    const result = body.payload;
    const write = await supabase.from("strength_tests").upsert({
      id: result.id,
      athlete_id: auth.user.id,
      exercise_id: result.exerciseId,
      performed_at: result.performedAt,
      result_weight: result.finalWeight,
      repetitions: result.repetitions,
      weight_unit: result.weightUnit,
      estimated_1rm: result.estimated1rm,
      formula: result.formula,
    }, { onConflict: "id" });
    if (write.error) return NextResponse.json({ ok: false, error: write.error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  if (!isSession(body.payload)) return NextResponse.json({ ok: false, error: "invalid_session_payload" }, { status: 400 });
  const session = body.payload;

  const sessionResult = await supabase.from("workout_sessions").upsert({
    id: session.id,
    athlete_id: auth.user.id,
    workout_day_id: session.workoutDayId,
    started_at: session.startedAt,
    completed_at: session.completedAt,
    status: session.status,
    notes: session.notes,
    updated_at: session.updatedAt,
  }, { onConflict: "id" });
  if (sessionResult.error) return NextResponse.json({ ok: false, error: sessionResult.error.message }, { status: 400 });

  const itemIds = [...new Set(session.setLogs.map((log) => log.workoutItemId))];
  if (itemIds.length) {
    const rows = itemIds.map((workoutItemId) => ({
      session_id: session.id,
      workout_item_id: workoutItemId,
      status: "in_progress",
      notes: session.exerciseNotes?.[workoutItemId] ?? "",
    }));
    const upsertExercises = await supabase.from("session_exercises").upsert(rows, { onConflict: "session_id,workout_item_id" }).select("id,workout_item_id");
    if (upsertExercises.error) return NextResponse.json({ ok: false, error: upsertExercises.error.message }, { status: 400 });
    const idMap = new Map((upsertExercises.data ?? []).map((row) => [row.workout_item_id, row.id]));
    const setRows = session.setLogs.flatMap((log) => {
      const sessionExerciseId = idMap.get(log.workoutItemId);
      if (!sessionExerciseId) return [];
      return [{
        id: log.id,
        session_exercise_id: sessionExerciseId,
        set_number: log.setNumber,
        target_reps: log.targetReps,
        actual_reps: log.actualReps,
        target_weight: log.targetWeight,
        target_weight_unit: log.targetWeightUnit,
        actual_weight: log.actualWeight,
        actual_weight_unit: log.weightUnit,
        duration_sec: log.durationSec,
        rpe: log.rpe,
        completed_at: log.completedAt,
      }];
    });
    if (setRows.length) {
      const upsertSets = await supabase.from("session_sets").upsert(setRows, { onConflict: "id" });
      if (upsertSets.error) return NextResponse.json({ ok: false, error: upsertSets.error.message }, { status: 400 });
    }
  }
  return NextResponse.json({ ok: true });
}
