"use client";

import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { MotionMoment } from "@/components/motion/MotionMoment";
import type { LocalWorkoutSession, StrengthTestResultLocal } from "@/lib/training-model";
import { getCompletedSessions, getPreferredWeightUnit, getStrengthTestResults } from "@/lib/offline-db";
import { convertWeight, type WeightUnit } from "@/lib/units";
import { formatDateTime } from "@/lib/format";
import { getExercise } from "@/lib/training-data";
import { HistoryChart } from "@/components/HistoryChart";
import {
  bestEstimated1rmKg,
  completedSessionSummaries,
  formatRecordWeight,
  personalRecordsFromSessions,
  progressVolumesKg,
  recentStrengthTests,
  selectCompletedSessions,
} from "@/lib/progress-data";

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

  const completed = useMemo(() => selectCompletedSessions(sessions), [sessions]);
  const volumes = useMemo(() => progressVolumesKg(sessions), [sessions]);
  const summaries = useMemo(() => completedSessionSummaries(sessions), [sessions]);
  const totalSets = completed.reduce((sum, session) => sum + session.setLogs.length, 0);
  const activeWeeks = new Set(completed.map((session) => session.weekNumber)).size;
  const best1rm = bestEstimated1rmKg(tests);
  const display1rm = best1rm === null ? 0 : unit === "kg" ? best1rm : convertWeight(best1rm, "kg", "lbs");

  const records = useMemo(
    () => personalRecordsFromSessions(sessions, (exerciseId) => getExercise(exerciseId)?.name ?? "Exercice"),
    [sessions],
  );

  const recentTestsByName = useMemo(() => recentStrengthTests(tests), [tests]);

  return (
    <div className="page-stack">
      <header className="page-heading"><span className="eyebrow">Progression</span><h1 className="h1">Ce que tu as reellement fait.</h1><p className="muted" style={{ margin: 0 }}>Historique local, volume calculable et estimations de force. Aucune calorie inventee.</p></header>
      <div className="stat-strip" data-testid="progress-summary">
        <div className="stat-cell"><strong data-testid="completed-session-count">{completed.length}</strong><span><Icon name="calendar-check" size={12} style={{ marginRight: 4 }} />séances</span></div>
        <div className="stat-cell"><strong>{totalSets}</strong><span><Icon name="dumbbell-fitness" size={12} style={{ marginRight: 4 }} />series/blocs</span></div>
        <div className="stat-cell"><strong>{activeWeeks || "--"}</strong><span><Icon name="time-past" size={12} style={{ marginRight: 4 }} />semaines actives</span></div>
      </div>

      <HistoryChart values={volumes} label="Volume de charge (kg equivalents)" />

      <section className="stack">
        <div className="section-title"><h2 className="h2">Force estimee</h2>{display1rm ? <span className="pill pill-accent"><Icon name="dashboard" size={13} /> max {display1rm.toFixed(1)} {unit}</span> : null}</div>
        {recentTestsByName.length ? recentTestsByName.map((result) => {
          const value = result.estimated1rm === null ? null : unit === "kg" ? result.estimated1rm : convertWeight(result.estimated1rm, "kg", "lbs");
          return <div key={result.id} className="card card-pad row-between" data-testid="strength-test-result"><div><strong>{result.testName}</strong><div className="caption" style={{ marginTop: 4 }}>{formatDateTime(result.performedAt)}</div></div><div style={{ textAlign: "right" }}><span className="caption">Estimated 1RM</span><div className="h2 metric">{value ? value.toFixed(1) : "--"} {value ? unit : ""}</div></div></div>;
        }) : <div className="empty-state"><Icon name="trophy" size={24} className="empty-mark" />Complete un test de force pour afficher une estimation 1RM.</div>}
      </section>

      <section className="stack">
        <div className="section-title"><h2 className="h2">Records de charge</h2></div>
        {records.length ? records.map((record) => (
          <div key={record.exerciseId} className="card card-pad row-between" data-testid="load-record"><strong>{record.name}</strong><span className="pill pill-accent">{formatRecordWeight(record.weightKg, unit)}</span></div>
        )) : <div className="empty-state">Les records apparaîtront après tes premières séries chargées.</div>}
      </section>

      <section className="stack">
        <div className="section-title"><h2 className="h2">Historique recent</h2></div>
        {summaries.length ? summaries.map((session) => (
          <article className="card card-pad row-between" key={session.id} data-testid="completed-session-row">
            <div><strong>Semaine {session.weekNumber} - Jour {session.dayNumber}</strong><div className="caption" style={{ marginTop: 4 }}>{formatDateTime(session.completedAt)} - {session.setCount} series/blocs</div></div>
            <Icon name="angle-small-right" size={17} className="muted" />
          </article>
        )) : <div className="empty-state"><MotionMoment name="empty-progress" size={72} fallback={<Icon name="chart-line-up" size={24} className="empty-mark" />} />Ton historique apparaitra ici apres la premiere séance terminée.</div>}
      </section>
    </div>
  );
}
