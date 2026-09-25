import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { TrainingSeed } from "../src/lib/training-model";

export interface SeedCounts {
  weeks: number;
  days: number;
  items: number;
  exercises: number;
  media: number;
  tests: number;
}

function parseDate(value: string): string {
  const [day, month, year] = value.split("/");
  return `${year}-${month}-${day}`;
}

function range(value: string | null): [number | null, number | null] {
  if (!value) return [null, null];
  const numbers = [...value.matchAll(/\d+/g)].map((match) => Number(match[0]));
  return [numbers[0] ?? null, numbers[1] ?? numbers[0] ?? null];
}

async function upsert(supabase: SupabaseClient, table: string, rows: Record<string, unknown>[], onConflict = "id") {
  if (!rows.length) return;
  const result = await supabase.from(table).upsert(rows, { onConflict });
  if (result.error) throw new Error(`${table}: ${result.error.message}`);
}

export async function seedKemiProgram(options: {
  url: string;
  serviceRoleKey: string;
  athleteId: string;
}): Promise<SeedCounts> {
  const seed = JSON.parse(await readFile(new URL("../seed/kemi-training-program.json", import.meta.url), "utf8")) as TrainingSeed;
  const supabase = createClient(options.url, options.serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const athleteId = options.athleteId;

  await upsert(supabase, "profiles", [{
  id: athleteId,
  display_name: seed.athlete.display_name,
  preferred_units: seed.athlete.preferred_units,
  locale: seed.athlete.locale,
  source_context: {
    level: seed.athlete.level,
    coach_calorie_context: seed.athlete.coach_calorie_context,
    source_title: seed.athlete.source_title,
  },
}]);
await upsert(supabase, "user_preferences", [{ athlete_id: athleteId, preferred_weight_unit: seed.athlete.preferred_units }], "athlete_id");
await upsert(supabase, "training_programs", [{
  id: seed.program.id,
  athlete_id: athleteId,
  name: seed.program.name,
  description: seed.program.description,
  start_date: parseDate(seed.program.start_date),
  status: seed.program.status,
  source: seed.program.source,
  metadata: { source: seed.source, anomalies: seed.anomalies },
}]);

const phases = seed.program.phases.map((phase) => {
  const [startWeek, endWeek] = range(phase.week_range);
  return {
    id: phase.id,
    program_id: seed.program.id,
    name: phase.name ?? `Phase ${phase.sort_order}`,
    label: phase.label,
    start_week: startWeek,
    end_week: endWeek,
    description: phase.description,
    sort_order: phase.sort_order,
    source_sheet: phase.source_sheet,
    source_cell: phase.source_cell,
  };
});
await upsert(supabase, "program_phases", phases);

const phaseForWeek = (week: number) => phases.find((phase) => (phase.start_week ?? week) <= week && (phase.end_week ?? week) >= week)?.id ?? null;
await upsert(supabase, "program_weeks", seed.program.weeks.map((week) => ({
  id: week.id,
  program_id: seed.program.id,
  phase_id: phaseForWeek(week.week_number),
  week_number: week.week_number,
  name: week.name,
  status: week.status,
  source_sheet: week.source_sheet,
})));

const days = seed.program.weeks.flatMap((week) => week.days.map((day) => ({
  id: day.id,
  program_week_id: week.id,
  day_number: day.day_number,
  title: day.title,
  description: day.description,
  estimated_duration_min: day.estimated_duration_min,
  sort_order: day.sort_order,
  source_sheet: day.source_sheet,
  source_cell: day.source_cell,
})));
await upsert(supabase, "workout_days", days);

const sections = seed.program.weeks.flatMap((week) => week.days.flatMap((day) => day.sections.map((section) => ({
  id: section.id,
  workout_day_id: day.id,
  section_type: section.section_type,
  title: section.title,
  instructions: section.instructions,
  sort_order: section.sort_order,
  source_sheet: section.source_sheet,
  source_cell: section.source_cell,
}))));
await upsert(supabase, "workout_sections", sections);

await upsert(supabase, "exercises", seed.exercises.map((exercise) => ({
  id: exercise.id,
  owner_id: null,
  slug: exercise.slug,
  name: exercise.name,
  description: exercise.description,
  equipment: exercise.equipment,
  muscle_group: exercise.muscle_group,
  default_rest_seconds: exercise.default_rest_seconds,
  aliases: exercise.aliases,
})));

await upsert(supabase, "exercise_media", seed.exercise_media.map((media) => ({
  id: media.id,
  exercise_id: media.exercise_id,
  owner_id: null,
  media_type: media.media_type,
  storage_path: media.storage_path,
  external_url: media.external_url,
  original_source_url: media.original_source_url,
  attribution: media.attribution,
  alt_text: media.alt_text,
  is_primary: media.is_primary,
  sort_order: media.sort_order,
  status: media.status,
  source_sheet: media.source_sheet,
  source_cell: media.source_cell,
})));

const items = seed.program.weeks.flatMap((week) => week.days.flatMap((day) => day.sections.flatMap((section) => section.items.map((item) => ({
  id: item.id,
  workout_section_id: section.id,
  exercise_id: item.exercise_id,
  item_kind: item.item_kind,
  strength_test_ref: item.strength_test_ref,
  prescribed_sets: item.prescribed_sets,
  prescribed_reps: item.prescribed_reps,
  prescribed_duration_sec: item.prescribed_duration_sec,
  prescription_mode: item.prescription_mode,
  laterality: item.laterality,
  target_raw: item.target_raw,
  prescribed_weight: item.prescribed_weight,
  weight_unit: item.weight_unit,
  weight_quantity: item.weight_quantity,
  load_raw: item.load_raw,
  rest_seconds: item.rest_seconds,
  rest_raw: item.rest_raw,
  intensity: item.intensity,
  cardio: item.cardio,
  notes: item.notes,
  sort_order: item.sort_order,
  source_sheet: item.source_sheet,
  source_cell: item.source_cell,
  source_url: item.source_url,
  source_location: item.source_location,
})))));
await upsert(supabase, "workout_items", items);

await upsert(supabase, "strength_test_templates", seed.strength_tests.map((test) => ({
  id: test.id,
  program_id: seed.program.id,
  exercise_id: test.exercise_id,
  slug: test.slug,
  name: test.name,
  formula_name: test.formula_name,
  formula_source: test.formula,
  source_estimated_1rm: test.source_estimated_1rm,
  source_sheet: test.source_sheet,
  source_cell: test.source_cell,
})));

await upsert(supabase, "strength_test_template_sets", seed.strength_tests.flatMap((test) => test.sets.map((set) => ({
  template_id: test.id,
  set_number: set.set_number,
  weight_raw: set.weight_raw,
  target_weight: set.weight,
  weight_unit: set.weight_unit,
  target_reps: set.repetitions,
  rest_seconds: set.rest_seconds,
  rest_raw: set.rest_raw,
  source_cell: set.source_cell,
}))), "template_id,set_number");

  const counts: SeedCounts = {
    weeks: seed.program.weeks.length,
    days: days.length,
    items: items.length,
    exercises: seed.exercises.length,
    media: seed.exercise_media.length,
    tests: seed.strength_tests.length,
  };
  console.log(`Seeded ${counts.weeks} weeks, ${counts.days} workout days, ${counts.items} workout items and ${counts.exercises} exercises.`);
  return counts;
}

export function resolveSeedAdminKey(env: Record<string, string | undefined>): string | undefined {
  const secret = env.SUPABASE_SECRET_KEY?.trim();
  if (secret) return secret;
  const legacy = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return legacy || undefined;
}

export function isAllowedSeedHost(url: string, linkedRef: string | null): boolean {
  const host = new URL(url).host;
  if (host === "127.0.0.1:54321" || host === "localhost:54321") return true;
  return Boolean(linkedRef) && host === `${linkedRef}.supabase.co`;
}

function linkedProjectRef(): string | null {
  try {
    const ref = readFileSync(new URL("../supabase/.temp/project-ref", import.meta.url), "utf8").trim();
    return ref || null;
  } catch {
    return null;
  }
}

function invokedAsCli(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  return import.meta.url.toLowerCase() === pathToFileURL(path.resolve(entry)).href.toLowerCase();
}

if (invokedAsCli()) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = resolveSeedAdminKey(process.env);
  const athleteId = process.env.KEMI_USER_ID;
  if (!url || !serviceRoleKey || !athleteId) {
    console.error("NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) and KEMI_USER_ID are required for seed.");
    process.exitCode = 1;
  } else if (!isAllowedSeedHost(url, linkedProjectRef())) {
    console.error(`Refusing to seed unexpected host ${new URL(url).host}.`);
    process.exitCode = 1;
  } else {
    console.log(`Seed target host: ${new URL(url).host}`);
    seedKemiProgram({ url, serviceRoleKey, athleteId }).catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : "Seed failed.");
      process.exitCode = 1;
    });
  }
}
