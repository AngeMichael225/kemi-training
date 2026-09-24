"use client";

import { useState } from "react";
import { Play } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ProgramWeekSeed, WorkoutDaySeed } from "@/lib/training-model";
import { createLocalSession } from "@/lib/session-client";

export function StartWorkoutButton({ day, week, className = "button button-primary" }: { day: WorkoutDaySeed; week: ProgramWeekSeed; className?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function start() {
    if (busy) return;
    setBusy(true);
    const session = await createLocalSession(day, week);
    router.push(`/session/${session.id}?workout=${day.id}`);
  }

  return (
    <button type="button" className={className} onClick={() => void start()} disabled={busy}>
      <Play size={18} fill="currentColor" aria-hidden="true" />
      {busy ? "Ouverture..." : "Commencer la séance"}
    </button>
  );
}
