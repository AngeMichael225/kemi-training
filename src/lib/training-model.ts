export type MediaType = "image" | "animated_image" | "video" | "poster" | "external_reference";
export type SectionType =
  | "warm_up"
  | "workout"
  | "lower_focus"
  | "upper_focus"
  | "glutes_focus"
  | "abs_core"
  | "finisher"
  | "cardio"
  | "strength_test";

export interface AthleteSeed {
  id: string;
  display_name: string;
  start_date: string;
  level: string | null;
  coach_calorie_context: string | null;
  source_title: string | null;
  preferred_units: "kg" | "lbs";
  locale: string;
}

export interface ProgramPhase {
  id: string;
  name: string | null;
  week_range: string | null;
  label: string | null;
  description: string | null;
  sort_order: number;
  source_sheet: string;
  source_cell: string;
}

export interface CardioPrescription {
  speed_kmh: number | null;
  incline_pct: number | null;
  level: number | null;
}

export interface WorkoutItem {
  id: string;
  exercise_id: string;
  exercise_name: string;
  item_kind: "exercise" | "cardio" | "strength_test";
  strength_test_ref: string | null;
  prescribed_sets: number | null;
  prescribed_reps: number | null;
  prescribed_duration_sec: number | null;
  prescription_mode: string | null;
  laterality: string | null;
  target_raw: string | null;
  prescribed_weight: number | null;
  weight_unit: "kg" | "lbs" | null;
  weight_quantity: number | null;
  load_raw: string | null;
  rest_seconds: number | null;
  rest_raw: string | null;
  intensity: string | null;
  cardio: CardioPrescription | null;
  notes: string | null;
  athlete_comment_source: string | null;
  sort_order: number;
  source_sheet: string;
  source_cell: string;
  source_url: string | null;
  source_location: string | null;
}

export interface WorkoutSectionSeed {
  id: string;
  section_type: SectionType;
  title: string;
  instructions: string | null;
  sort_order: number;
  source_sheet: string;
  source_cell: string;
  items: WorkoutItem[];
}

export interface WorkoutDaySeed {
  id: string;
  day_number: number;
  title: string;
  description: string | null;
  estimated_duration_min: number | null;
  sort_order: number;
  source_sheet: string;
  source_cell: string;
  sections: WorkoutSectionSeed[];
}

export interface ProgramWeekSeed {
  id: string;
  week_number: number;
  name: string;
  status: string;
  source_sheet: string;
  days: WorkoutDaySeed[];
  vigilance_notes: string[];
}

export interface ExerciseSeed {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  equipment: string | null;
  muscle_group: string | null;
  default_rest_seconds: number | null;
  aliases: string[];
}

export interface ExerciseMediaSeed {
  id: string;
  exercise_id: string;
  media_type: MediaType;
  storage_path: string | null;
  external_url: string | null;
  original_source_url: string | null;
  attribution: string | null;
  alt_text: string | null;
  sort_order: number;
  is_primary: boolean;
  status: string;
  source_sheet: string;
  source_cell: string;
}

export interface StrengthTestSetSeed {
  set_number: number;
  weight_raw: string | null;
  weight: number | null;
  weight_unit: "kg" | "lbs" | null;
  repetitions: number | null;
  rest_seconds: number | null;
  rest_raw: string | null;
  source_cell: string;
}

export interface StrengthTestSeed {
  id: string;
  slug: string;
  name: string;
  exercise_id: string;
  formula_name: string | null;
  formula: string | null;
  source_estimated_1rm: number | null;
  sets: StrengthTestSetSeed[];
  source_sheet: string;
  source_cell: string;
}

export interface ImportAnomaly {
  code: string;
  severity: "low" | "medium" | "high" | string;
  message: string;
  source_sheet: string | null;
  source_cell: string | null;
  source_value: unknown;
}

export interface TrainingSeed {
  schema_version: number;
  source: {
    filename: string;
    workbook_sheets: string[];
    importer: string;
  };
  athlete: AthleteSeed;
  program: {
    id: string;
    name: string;
    description: string;
    start_date: string;
    status: string;
    source: string;
    phases: ProgramPhase[];
    weeks: ProgramWeekSeed[];
    vigilance_notes: string[];
  };
  exercises: ExerciseSeed[];
  exercise_media: ExerciseMediaSeed[];
  strength_tests: StrengthTestSeed[];
  anomalies: ImportAnomaly[];
}

export interface SessionSetLog {
  id: string;
  workoutItemId: string;
  exerciseId: string;
  setNumber: number;
  targetReps: number | null;
  actualReps: number | null;
  targetWeight: number | null;
  targetWeightUnit: "kg" | "lbs" | null;
  actualWeight: number | null;
  weightUnit: "kg" | "lbs" | null;
  durationSec: number | null;
  rpe: number | null;
  completedAt: string;
}

export interface LocalWorkoutSession {
  id: string;
  workoutDayId: string;
  workoutTitle: string;
  weekNumber: number;
  dayNumber: number;
  startedAt: string;
  completedAt: string | null;
  status: "active" | "completed";
  currentItemIndex: number;
  notes: string;
  exerciseNotes?: Record<string, string>;
  setLogs: SessionSetLog[];
  restTargetEndTime: number | null;
  updatedAt: string;
}

export interface StrengthTestResultLocal {
  id: string;
  testId: string;
  testName: string;
  exerciseId: string;
  performedAt: string;
  finalWeight: number | null;
  repetitions: number | null;
  weightUnit: "kg" | "lbs" | null;
  estimated1rm: number | null;
  formula: "Brzycki";
}
