import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SessionRunner } from "@/components/SessionRunner";
import { getExerciseMedia, getWorkoutContext } from "@/lib/training-data";

export const metadata: Metadata = { title: "Séance en cours" };

export default async function SessionPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ workout?: string }>;
}) {
  const [{ sessionId }, query] = await Promise.all([params, searchParams]);
  if (!query.workout) return notFound();
  const context = getWorkoutContext(query.workout);
  if (!context) return notFound();

  const exerciseIds = new Set(context.day.sections.flatMap((section) => section.items.map((item) => item.exercise_id)));
  const mediaByExercise = Object.fromEntries(
    [...exerciseIds].map((id) => [id, getExerciseMedia(id)]),
  );

  return <SessionRunner sessionId={sessionId} week={context.week} day={context.day} mediaByExercise={mediaByExercise} />;
}
