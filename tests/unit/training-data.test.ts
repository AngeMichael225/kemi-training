import { describe, expect, it } from "vitest";
import { getAvailableWeek, getExerciseMedia, trainingSeed } from "@/lib/training-data";

describe("normalized training seed", () => {
  it("contains every imported workbook week and workout day", () => {
    expect(trainingSeed.program.weeks).toHaveLength(4);
    expect(trainingSeed.program.weeks.flatMap((week) => week.days)).toHaveLength(12);
  });

  it("does not invent weeks beyond the workbook", () => {
    expect(getAvailableWeek(99).week_number).toBe(4);
  });

  it("retains direct and reference exercise media", () => {
    const media = trainingSeed.exercise_media;
    expect(media.some((item) => item.media_type === "external_reference")).toBe(true);
    expect(media.some((item) => item.media_type === "image" || item.media_type === "animated_image")).toBe(true);
    const exerciseId = media[0]?.exercise_id;
    expect(exerciseId ? getExerciseMedia(exerciseId).length : 0).toBeGreaterThan(0);
  });
});
