import type { WorkoutDaySeed, WorkoutItem, WorkoutSectionSeed } from "@/lib/training-model";

/** Pure workout walk. Kept out of `training-data` so client sessions do not import the seed JSON. */
export function flattenWorkout(day: WorkoutDaySeed): Array<{ section: WorkoutSectionSeed; item: WorkoutItem }> {
  return day.sections.flatMap((section) => section.items.map((item) => ({ section, item })));
}
