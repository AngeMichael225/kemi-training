import type { Metadata } from "next";
import { ExerciseLibrary, type ExerciseLibraryItem } from "@/components/ExerciseLibrary";
import { findExerciseUsage, getExerciseMedia, trainingSeed } from "@/lib/training-data";

export const metadata: Metadata = { title: "Exercices" };

export default function ExercisesPage() {
  const items: ExerciseLibraryItem[] = trainingSeed.exercises.map((exercise) => {
    const media = getExerciseMedia(exercise.id);
    const directImage = media.find((item) => item.media_type === "image" && item.external_url)?.external_url ?? null;
    const usage = findExerciseUsage(exercise.id);
    return {
      id: exercise.id,
      slug: exercise.slug,
      name: exercise.name,
      sections: [...new Set(usage.map((item) => item.section))],
      imageUrl: directImage,
      hasMedia: media.some((item) => item.media_type !== "external_reference"),
    };
  });
  return <ExerciseLibrary items={items} />;
}
