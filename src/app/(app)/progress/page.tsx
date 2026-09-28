import type { Metadata } from "next";
import { ProgressClient } from "@/components/ProgressClient";
import { trainingSeed } from "@/lib/training-data";

export const metadata: Metadata = { title: "Progression" };

export default function ProgressPage() {
  const exerciseNames = Object.fromEntries(trainingSeed.exercises.map((exercise) => [exercise.id, exercise.name]));
  return <ProgressClient exerciseNames={exerciseNames} />;
}
