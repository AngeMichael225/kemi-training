import { describe, expect, it } from "vitest";
import { flattenWorkout, getAvailableWeek, getExerciseMedia, getWorkoutDay, trainingSeed } from "@/lib/training-data";

describe("normalized training seed", () => {
  it("contains every imported workbook week and workout day", () => {
    expect(trainingSeed.program.weeks).toHaveLength(4);
    expect(trainingSeed.program.weeks.flatMap((week) => week.days)).toHaveLength(12);
  });

  it("does not invent weeks beyond the workbook", () => {
    expect(getAvailableWeek(99).week_number).toBe(4);
  });

  it("flattens a workout day without dropping prescribed items", () => {
    const day = getWorkoutDay("22a6f767-4aa0-5b1a-80f8-54b8d4c06e54");
    expect(day).toBeDefined();
    if (!day) return;
    const flat = flattenWorkout(day);
    const expected = day.sections.reduce((sum, section) => sum + section.items.length, 0);
    expect(flat).toHaveLength(expected);
    expect(flat[0]?.item.id).toBe(day.sections[0]?.items[0]?.id);
  });

  it("retains direct and reference exercise media", () => {
    const media = trainingSeed.exercise_media;
    expect(media.some((item) => item.media_type === "external_reference")).toBe(true);
    expect(media.some((item) => item.media_type === "image" || item.media_type === "animated_image")).toBe(true);
    const exerciseId = media[0]?.exercise_id;
    expect(exerciseId ? getExerciseMedia(exerciseId).length : 0).toBeGreaterThan(0);
  });
});
