"use client";

import { useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { useRouter } from "next/navigation";
import type { ProgramWeekSeed, WorkoutDaySeed } from "@/lib/training-model";
import { getOrCreateActiveSession } from "@/lib/session-client";

export function StartWorkoutButton({ day, week, className = "button button-primary" }: { day: WorkoutDaySeed; week: ProgramWeekSeed; className?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const session = await getOrCreateActiveSession(day, week);
      router.push(`/session/${session.id}?workout=${session.workoutDayId}`);
    } catch (caught) {
      setBusy(false);
      setError(caught instanceof Error ? caught.message : "Impossible d'ouvrir la séance");
    }
  }

  return (
    <button type="button" className={className} onClick={() => void start()} disabled={busy}>
      <Icon name="play" size={18} />
      {error ?? (busy ? "Ouverture..." : "Commencer la séance")}
    </button>
  );
}
