import seedJson from "../../seed/kemi-training-program.json";
import type {
  ExerciseMediaSeed,
  ExerciseSeed,
  ProgramWeekSeed,
  TrainingSeed,
  WorkoutDaySeed,
  WorkoutItem,
  WorkoutSectionSeed,
} from "@/lib/training-model";

export const trainingSeed = seedJson as unknown as TrainingSeed;

export function parseProgramDate(value: string): Date {
  const [day, month, year] = value.split("/").map(Number);
  return new Date(year, month - 1, day);
}

export function getCalendarWeekNumber(date = new Date()): number {
  const start = parseProgramDate(trainingSeed.program.start_date);
  const diff = date.getTime() - start.getTime();
  return Math.max(1, Math.floor(diff / 604_800_000) + 1);
}

export function getAvailableWeek(preferredWeek?: number): ProgramWeekSeed {
  const weekNumber = preferredWeek ?? getCalendarWeekNumber();
  return (
    trainingSeed.program.weeks.find((week) => week.week_number === weekNumber) ??
    trainingSeed.program.weeks.at(-1) ??
    trainingSeed.program.weeks[0]
  );
}

export function getWorkoutDay(id: string): WorkoutDaySeed | undefined {
  for (const week of trainingSeed.program.weeks) {
    const day = week.days.find((candidate) => candidate.id === id);
    if (day) return day;
  }
  return undefined;
}

export function getWorkoutContext(id: string): { week: ProgramWeekSeed; day: WorkoutDaySeed } | undefined {
  for (const week of trainingSeed.program.weeks) {
    const day = week.days.find((candidate) => candidate.id === id);
    if (day) return { week, day };
  }
  return undefined;
}

export function flattenWorkout(day: WorkoutDaySeed): Array<{ section: WorkoutSectionSeed; item: WorkoutItem }> {
  return day.sections.flatMap((section) => section.items.map((item) => ({ section, item })));
}

export function getExercise(id: string): ExerciseSeed | undefined {
  return trainingSeed.exercises.find((exercise) => exercise.id === id);
}

export function getExerciseBySlug(slug: string): ExerciseSeed | undefined {
  return trainingSeed.exercises.find((exercise) => exercise.slug === slug);
}

export function getExerciseMedia(exerciseId: string): ExerciseMediaSeed[] {
  return trainingSeed.exercise_media
    .filter((media) => media.exercise_id === exerciseId)
    .sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order);
}

export function findExerciseUsage(exerciseId: string): Array<{ week: number; day: number; section: string }> {
  const usage: Array<{ week: number; day: number; section: string }> = [];
  for (const week of trainingSeed.program.weeks) {
    for (const day of week.days) {
      for (const section of day.sections) {
        if (section.items.some((item) => item.exercise_id === exerciseId)) {
          usage.push({ week: week.week_number, day: day.day_number, section: section.title });
        }
      }
    }
  }
  return usage;
}

export function mediaForItem(item: WorkoutItem): ExerciseMediaSeed[] {
  return getExerciseMedia(item.exercise_id);
}
