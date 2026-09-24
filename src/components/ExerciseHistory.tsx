"use client";

import { useEffect, useMemo, useState } from "react";
import type { LocalWorkoutSession } from "@/lib/training-model";
import { getCompletedSessions, getPreferredWeightUnit } from "@/lib/offline-db";
import { convertWeight, type WeightUnit } from "@/lib/units";
import { formatDateTime } from "@/lib/format";

export function ExerciseHistory({ exerciseId }: { exerciseId: string }) {
  const [sessions, setSessions] = useState<LocalWorkoutSession[]>([]);
  const [unit, setUnit] = useState<WeightUnit>("kg");

  useEffect(() => {
    void Promise.all([getCompletedSessions(), getPreferredWeightUnit()]).then(([all, preferred]) => {
      setSessions(all);
      setUnit(preferred);
    });
  }, []);

  const rows = useMemo(() => sessions.flatMap((session) => session.setLogs
    .filter((log) => log.exerciseId === exerciseId)
    .map((log) => {
      const displayWeight = log.actualWeight === null || !log.weightUnit
        ? null
        : log.weightUnit === unit
          ? log.actualWeight
          : convertWeight(log.actualWeight, log.weightUnit, unit);
      return { ...log, displayWeight, session };
    })), [exerciseId, sessions, unit]);

  if (!rows.length) return <div className="empty-state">Aucune performance enregistrée pour ce mouvement pour le moment.</div>;

  const best = rows.reduce((max, row) => Math.max(max, row.displayWeight ?? 0), 0);
  return (
    <section className="card card-pad stack">
      <div className="row-between"><h2 className="h2">Historique</h2>{best ? <span className="pill pill-accent">Record {best.toFixed(best % 1 ? 1 : 0)} {unit}</span> : null}</div>
      {rows.slice(0, 5).map((row) => (
        <div key={row.id} className="row-between">
          <div><strong>{row.displayWeight === null ? "Charge non saisie" : `${row.displayWeight.toFixed(row.displayWeight % 1 ? 1 : 0)} ${unit}`} {row.actualReps !== null ? `× ${row.actualReps}` : ""}</strong><div className="caption" style={{ marginTop: 3 }}>{formatDateTime(row.completedAt)}</div></div>
          <span className="caption">S{row.session.weekNumber} J{row.session.dayNumber}</span>
        </div>
      ))}
    </section>
  );
}
