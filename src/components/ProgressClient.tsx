"use client";

import { useEffect, useMemo, useState } from "react";
import { Award, CalendarCheck2, ChevronRight, Dumbbell, Gauge, History } from "lucide-react";
import type { LocalWorkoutSession, StrengthTestResultLocal } from "@/lib/training-model";
import { getCompletedSessions, getPreferredWeightUnit, getStrengthTestResults } from "@/lib/offline-db";
import { convertWeight, type WeightUnit } from "@/lib/units";
import { formatDateTime } from "@/lib/format";
import { getExercise } from "@/lib/training-data";
import { HistoryChart } from "@/components/HistoryChart";

function sessionVolumeKg(session: LocalWorkoutSession): number {
  return session.setLogs.reduce((sum, log) => {
    if (log.actualWeight === null || log.actualReps === null || !log.weightUnit) return sum;
    const kg = log.weightUnit === "kg" ? log.actualWeight : convertWeight(log.actualWeight, "lbs", "kg");
    return sum + kg * log.actualReps;
  }, 0);
}

export function ProgressClient() {
  const [sessions, setSessions] = useState<LocalWorkoutSession[]>([]);
  const [tests, setTests] = useState<StrengthTestResultLocal[]>([]);
  const [unit, setUnit] = useState<WeightUnit>("kg");

  useEffect(() => {
    void Promise.all([getCompletedSessions(), getStrengthTestResults(), getPreferredWeightUnit()]).then(([s, t, u]) => {
      setSessions(s);
      setTests(t);
      setUnit(u);
    });
  }, []);

  const volumes = useMemo(() => sessions.slice().reverse().map(sessionVolumeKg), [sessions]);
  const totalSets = sessions.reduce((sum, session) => sum + session.setLogs.length, 0);
  const activeWeeks = new Set(sessions.map((session) => session.weekNumber)).size;
  const best1rm = tests.reduce((best, result) => Math.max(best, result.estimated1rm ?? 0), 0);
  const display1rm = best1rm ? (unit === "kg" ? best1rm : convertWeight(best1rm, "kg", "lbs")) : 0;

  const records = useMemo(() => {
    const byExercise = new Map<string, number>();
    for (const session of sessions) {
      for (const log of session.setLogs) {
        if (log.actualWeight === null || !log.weightUnit) continue;
        const kg = log.weightUnit === "kg" ? log.actualWeight : convertWeight(log.actualWeight, "lbs", "kg");
        byExercise.set(log.exerciseId, Math.max(byExercise.get(log.exerciseId) ?? 0, kg));
      }
    }
    return [...byExercise.entries()]
      .map(([exerciseId, kg]) => ({ exerciseId, name: getExercise(exerciseId)?.name ?? "Exercice", kg }))
      .sort((a, b) => b.kg - a.kg)
      .slice(0, 5);
  }, [sessions]);

  const recentTestsByName = [...new Map(tests.map((result) => [result.testName, result])).values()].slice(0, 3);

  return (
    <div className="page-stack">
      <header className="page-heading"><span className="eyebrow">Progression</span><h1 className="h1">Ce que tu as reellement fait.</h1><p className="muted" style={{ margin: 0 }}>Historique local, volume calculable et estimations de force. Aucune calorie inventee.</p></header>
      <div className="stat-strip">
        <div className="stat-cell"><strong>{sessions.length}</strong><span><CalendarCheck2 size={12} style={{ display: "inline", marginRight: 4 }} />séances</span></div>
        <div className="stat-cell"><strong>{totalSets}</strong><span><Dumbbell size={12} style={{ display: "inline", marginRight: 4 }} />series/blocs</span></div>
        <div className="stat-cell"><strong>{activeWeeks || "--"}</strong><span><History size={12} style={{ display: "inline", marginRight: 4 }} />semaines actives</span></div>
      </div>

      <HistoryChart values={volumes.filter((value) => value > 0)} label="Volume de charge (kg equivalents)" />

      <section className="stack">
        <div className="section-title"><h2 className="h2">Force estimee</h2>{display1rm ? <span className="pill pill-accent"><Gauge size={13} /> max {display1rm.toFixed(1)} {unit}</span> : null}</div>
        {recentTestsByName.length ? recentTestsByName.map((result) => {
          const value = result.estimated1rm === null ? null : unit === "kg" ? result.estimated1rm : convertWeight(result.estimated1rm, "kg", "lbs");
          return <div key={result.id} className="card card-pad row-between"><div><strong>{result.testName}</strong><div className="caption" style={{ marginTop: 4 }}>{formatDateTime(result.performedAt)}</div></div><div style={{ textAlign: "right" }}><span className="caption">Estimated 1RM</span><div className="h2 metric">{value ? value.toFixed(1) : "--"} {value ? unit : ""}</div></div></div>;
        }) : <div className="empty-state"><Award size={24} style={{ margin: "0 auto 10px" }} />Complete un test de force pour afficher une estimation 1RM.</div>}
      </section>

      <section className="stack">
        <div className="section-title"><h2 className="h2">Records de charge</h2></div>
        {records.length ? records.map((record) => {
          const value = unit === "kg" ? record.kg : convertWeight(record.kg, "kg", "lbs");
          return <div key={record.exerciseId} className="card card-pad row-between"><strong>{record.name}</strong><span className="pill pill-accent">{value.toFixed(value % 1 ? 1 : 0)} {unit}</span></div>;
        }) : <div className="empty-state">Les records apparaîtront après tes premières séries chargées.</div>}
      </section>

      <section className="stack">
        <div className="section-title"><h2 className="h2">Historique recent</h2></div>
        {sessions.length ? sessions.slice(0, 8).map((session) => (
          <article className="card card-pad row-between" key={session.id}>
            <div><strong>Semaine {session.weekNumber} - Jour {session.dayNumber}</strong><div className="caption" style={{ marginTop: 4 }}>{formatDateTime(session.completedAt ?? session.startedAt)} - {session.setLogs.length} series/blocs</div></div>
            <ChevronRight size={17} className="muted" />
          </article>
        )) : <div className="empty-state">Ton historique apparaitra ici apres la premiere séance terminée.</div>}
      </section>
    </div>
  );
}
