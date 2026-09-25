import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseSyncBody, type SyncSessionPayload } from "@/lib/sync-payload";

function jsonError(error: string, status: number) {
  return NextResponse.json({ ok: false, error }, { status });
}

async function sessionReferencesAreOwned(
  supabase: Awaited<ReturnType<typeof createClient>>,
  session: SyncSessionPayload,
) {
  const day = await supabase.from("workout_days").select("id").eq("id", session.workoutDayId).maybeSingle();
  if (day.error || !day.data) return "workout_day_forbidden" as const;

  const itemIds = [...new Set(session.setLogs.map((log) => log.workoutItemId))];
  if (!itemIds.length) return null;

  const items = await supabase.from("workout_items").select("id, workout_section_id").in("id", itemIds);
  if (items.error || !items.data || items.data.length !== itemIds.length) return "workout_item_forbidden" as const;

  const sectionIds = [...new Set(items.data.map((item) => item.workout_section_id))];
  const sections = await supabase.from("workout_sections").select("id, workout_day_id").in("id", sectionIds);
  if (sections.error || !sections.data) return "workout_item_forbidden" as const;
  const dayBySection = new Map(sections.data.map((section) => [section.id, section.workout_day_id]));
  const aligned = items.data.every((item) => dayBySection.get(item.workout_section_id) === session.workoutDayId);
  if (!aligned) return "workout_item_forbidden" as const;
  return null;
}

export async function POST(request: Request) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    return NextResponse.json({ ok: false, mode: "local" }, { status: 503 });
  }

  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return NextResponse.json({ ok: false }, { status: 401 });

  const parsed = parseSyncBody(await request.json().catch(() => null));
  if (!parsed.ok) return jsonError(parsed.error, 400);

  if (parsed.type === "strength_test_result") {
    const result = parsed.payload;
    const exercise = await supabase.from("exercises").select("id").eq("id", result.exerciseId).maybeSingle();
    if (exercise.error || !exercise.data) return jsonError("exercise_forbidden", 403);
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
    if (write.error) return jsonError("write_failed", 400);
    return NextResponse.json({ ok: true });
  }

  const session = parsed.payload;
  const referenceError = await sessionReferencesAreOwned(supabase, session);
  if (referenceError) return jsonError(referenceError, 403);

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
  if (sessionResult.error) return jsonError("write_failed", 400);

  const itemIds = [...new Set(session.setLogs.map((log) => log.workoutItemId))];
  if (!itemIds.length) return NextResponse.json({ ok: true });

  const rows = itemIds.map((workoutItemId) => ({
    session_id: session.id,
    workout_item_id: workoutItemId,
    status: "in_progress",
    notes: session.exerciseNotes[workoutItemId] ?? "",
  }));
  const upsertExercises = await supabase.from("session_exercises").upsert(rows, { onConflict: "session_id,workout_item_id" }).select("id,workout_item_id");
  if (upsertExercises.error || !upsertExercises.data) return jsonError("write_failed", 400);

  const idMap = new Map(upsertExercises.data.map((row) => [row.workout_item_id, row.id]));
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
    if (upsertSets.error) return jsonError("write_failed", 400);
  }
  return NextResponse.json({ ok: true });
}
