"use client";

import { useState } from "react";
import { Icon } from "@/components/icons/Icon";
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
      <Icon name="play" size={18} />
      {busy ? "Ouverture..." : "Commencer la séance"}
    </button>
  );
}
