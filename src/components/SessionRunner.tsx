"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { MotionMoment } from "@/components/motion/MotionMoment";
import type {
  ExerciseMediaSeed,
  LocalWorkoutSession,
  ProgramWeekSeed,
  SessionSetLog,
  WorkoutDaySeed,
  WorkoutItem,
} from "@/lib/training-model";
import { flattenWorkout } from "@/lib/training-data";
import { getLastPerformance, getPreferredWeightUnit, getSession, saveSession } from "@/lib/offline-db";
import { convertWeight, type WeightUnit } from "@/lib/units";
import { ExerciseMedia } from "@/components/ExerciseMedia";
import { CoachTip } from "@/components/CoachTip";
import { SetTracker } from "@/components/SetTracker";
import { CardioTracker } from "@/components/CardioTracker";
import { RestTimer } from "@/components/RestTimer";
import { formatDuration } from "@/lib/format";

function targetSets(item: WorkoutItem): number {
  if (item.item_kind === "cardio" || item.item_kind === "strength_test") return 1;
  return Math.max(1, item.prescribed_sets ?? 1);
}

export function SessionRunner({
  sessionId,
  week,
  day,
  mediaByExercise,
}: {
  sessionId: string;
  week: ProgramWeekSeed;
  day: WorkoutDaySeed;
  mediaByExercise: Record<string, ExerciseMediaSeed[]>;
}) {
  const sequence = useMemo(() => flattenWorkout(day), [day]);
  const [session, setSession] = useState<LocalWorkoutSession | null>(null);
  const [preferredUnit, setPreferredUnit] = useState<WeightUnit>("kg");
  const [previous, setPrevious] = useState<SessionSetLog | undefined>();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void Promise.all([getSession(sessionId), getPreferredWeightUnit()]).then(([stored, unit]) => {
      setPreferredUnit(unit);
      if (stored) {
        setSession(stored);
      } else {
        const now = new Date().toISOString();
        setSession({
          id: sessionId,
          workoutDayId: day.id,
          workoutTitle: `${week.name} - ${day.title}`,
          weekNumber: week.week_number,
          dayNumber: day.day_number,
          startedAt: now,
          completedAt: null,
          status: "active",
          currentItemIndex: 0,
          notes: "",
          exerciseNotes: {},
          setLogs: [],
          restTargetEndTime: null,
          updatedAt: now,
        });
      }
      setReady(true);
    });
  }, [sessionId, day.id, day.day_number, day.title, week.name, week.week_number]);

  const currentIndex = Math.min(session?.currentItemIndex ?? 0, Math.max(0, sequence.length - 1));
  const current = sequence[currentIndex];
  const item = current?.item;
  const section = current?.section;
  const itemLogs = session && item ? session.setLogs.filter((log) => log.workoutItemId === item.id) : [];
  const itemTargetSets = item ? targetSets(item) : 1;
  const setNumber = Math.min(itemTargetSets, itemLogs.length + 1);

  const exerciseId = item?.exercise_id;
  useEffect(() => {
    if (!exerciseId) return;
    void getLastPerformance(exerciseId).then(setPrevious);
  }, [exerciseId]);

  const persist = useCallback(async (next: LocalWorkoutSession) => {
    const stamped = { ...next, updatedAt: new Date().toISOString() };
    setSession(stamped);
    await saveSession(stamped);
  }, []);

  const completedItemCount = useMemo(() => {
    if (!session) return 0;
    return sequence.filter(({ item: candidate }) => {
      const count = session.setLogs.filter((log) => log.workoutItemId === candidate.id).length;
      return count >= targetSets(candidate);
    }).length;
  }, [session, sequence]);
  const progress = sequence.length ? Math.round((completedItemCount / sequence.length) * 100) : 0;
  const allComplete = sequence.length > 0 && completedItemCount === sequence.length;

  const clearRest = useCallback(() => {
    if (!session) return;
    void persist({ ...session, restTargetEndTime: null });
  }, [persist, session]);

  const changeRestTarget = useCallback((target: number | null) => {
    if (!session) return;
    void persist({ ...session, restTargetEndTime: target });
  }, [persist, session]);

  async function completeItem(data: { reps: number | null; weight: number | null; unit: WeightUnit | null; durationSec: number | null }) {
    if (!session || !item) return;
    const nextLog: SessionSetLog = {
      id: crypto.randomUUID(),
      workoutItemId: item.id,
      exerciseId: item.exercise_id,
      setNumber,
      targetReps: item.prescribed_reps,
      actualReps: data.reps,
      targetWeight: item.prescribed_weight,
      targetWeightUnit: item.weight_unit,
      actualWeight: data.weight,
      weightUnit: data.unit,
      durationSec: data.durationSec,
      rpe: null,
      completedAt: new Date().toISOString(),
    };
    const logs = [...session.setLogs, nextLog];
    const completesItem = itemLogs.length + 1 >= itemTargetSets;
    const nextIndex = completesItem ? Math.min(currentIndex + 1, sequence.length - 1) : currentIndex;
    const willCompleteWorkout = completesItem && completedItemCount + 1 >= sequence.length;
    const restTarget = item.rest_seconds && item.rest_seconds > 0 && !willCompleteWorkout ? Date.now() + item.rest_seconds * 1000 : null;
    await persist({ ...session, setLogs: logs, currentItemIndex: nextIndex, restTargetEndTime: restTarget });
  }

  async function markStrengthTestDone() {
    await completeItem({ reps: null, weight: null, unit: null, durationSec: null });
  }

  async function move(delta: number) {
    if (!session) return;
    const nextIndex = Math.max(0, Math.min(sequence.length - 1, currentIndex + delta));
    await persist({ ...session, currentItemIndex: nextIndex, restTargetEndTime: null });
  }

  async function finishWorkout() {
    if (!session) return;
    const now = new Date().toISOString();
    await persist({ ...session, status: "completed", completedAt: now, restTargetEndTime: null, currentItemIndex: sequence.length - 1 });
  }

  if (!ready || !session || !item || !section) {
    return <div className="card card-pad" style={{ marginTop: 60 }}>Chargement de la séance...</div>;
  }

  if (session.status === "completed") {
    const durationMin = Math.max(1, Math.round((new Date(session.completedAt ?? session.updatedAt).getTime() - new Date(session.startedAt).getTime()) / 60_000));
    const volumeKg = session.setLogs.reduce((sum, log) => {
      if (log.actualWeight === null || log.actualReps === null || !log.weightUnit) return sum;
      const weightKg = log.weightUnit === "kg" ? log.actualWeight : convertWeight(log.actualWeight, "lbs", "kg");
      return sum + weightKg * log.actualReps;
    }, 0);
    return (
      <div className="page-stack" style={{ paddingTop: 28 }}>
        <div className="card card-pad card-elevated stack" style={{ minHeight: "62dvh", justifyContent: "space-between" }}>
          <MotionMoment name="workout-complete" size={88} fallback={<div className="workout-index workout-index-accent" style={{ width: 62, height: 62, borderRadius: 22 }}><Icon name="check-circle" size={28} /></div>} />
          <div><span className="eyebrow">Séance terminée</span><h1 className="display" style={{ marginTop: 10 }}>Belle séance.</h1><p className="muted">Tes donnees sont conservees localement et synchronisees lorsque le backend est disponible.</p></div>
          <div className="stat-strip">
            <div className="stat-cell"><strong>{durationMin} min</strong><span>duree</span></div>
            <div className="stat-cell"><strong>{session.setLogs.length}</strong><span>series / blocs</span></div>
            <div className="stat-cell"><strong>{volumeKg ? `${Math.round(volumeKg)} kg` : "--"}</strong><span>volume calc.</span></div>
          </div>
          {session.notes ? <div className="coach-tip"><strong>Ta note</strong>{session.notes}</div> : null}
          <div className="grid-2"><Link href="/today" className="button button-secondary"><Icon name="arrow-left" size={18} /> Accueil</Link><Link href="/progress" className="button button-primary">Progression <Icon name="arrow-right" size={18} /></Link></div>
        </div>
      </div>
    );
  }

  const media = mediaByExercise[item.exercise_id] ?? [];
  const sectionPosition = day.sections.findIndex((candidate) => candidate.id === section.id) + 1;
  const nextEntry = sequence[Math.min(currentIndex + 1, sequence.length - 1)];
  const nextLabel = itemLogs.length + 1 < itemTargetSets ? `${item.exercise_name} - serie ${setNumber + 1}` : nextEntry?.item.exercise_name ?? "Fin de séance";

  return (
    <div className="page-stack" style={{ paddingBottom: 28 }}>
      <header className="stack" style={{ paddingTop: 6 }}>
        <div className="row-between">
          <Link href="/today" className="icon-button" aria-label="Quitter la séance"><Icon name="arrow-left" size={20} /></Link>
          <div style={{ textAlign: "center" }}><span className="caption">Semaine {week.week_number} - Jour {day.day_number}</span><div className="small" style={{ fontWeight: 760 }}>{progress}% terminé</div></div>
          <span className="pill"><Icon name="stopwatch" size={13} /> {item.rest_raw ?? "--"}</span>
        </div>
        <div className="progress-track"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
      </header>

      <div className="row-between" style={{ alignItems: "flex-end" }}>
        <div><span className="eyebrow" style={{ fontSize: ".64rem" }}>Bloc {sectionPosition} / {day.sections.length}</span><h1 className="h1" style={{ marginTop: 5 }}>{item.exercise_name}</h1></div>
        <span className="pill">{currentIndex + 1}/{sequence.length}</span>
      </div>

      <ExerciseMedia exerciseId={item.exercise_id} media={media} alt={`Démonstration ${item.exercise_name}`} priority />

      <div className="row wrap">
        {item.target_raw ? <span className="pill pill-accent">{item.target_raw}</span> : null}
        {item.load_raw ? <span className="pill">{item.load_raw}</span> : null}
        {item.rest_seconds !== null ? <span className="pill">Repos {formatDuration(item.rest_seconds)}</span> : null}
      </div>

      {item.notes ? <CoachTip>{item.notes}</CoachTip> : null}

      <section className="card card-pad">
        {item.item_kind === "strength_test" ? (
          <div className="stack">
            <div><span className="eyebrow" style={{ fontSize: ".64rem" }}>Protocole special</span><h2 className="h2" style={{ marginTop: 5 }}>Test de force</h2><p className="small muted">Le protocole du classeur est disponible dans l’écran Tests. Termine-le puis reviens marquer ce bloc comme complete.</p></div>
            <Link href={`/tests?test=${item.strength_test_ref ?? ""}`} className="button button-secondary"><Icon name="clipboard-list-check" size={18} /> Ouvrir le test</Link>
            <button type="button" className="button button-primary" onClick={() => void markStrengthTestDone()}><Icon name="check-circle" size={18} /> Test complete</button>
          </div>
        ) : item.item_kind === "cardio" ? (
          <CardioTracker item={item} onComplete={(durationSec) => void completeItem({ reps: null, weight: null, unit: null, durationSec })} />
        ) : (
          <SetTracker key={`${item.id}-${setNumber}-${preferredUnit}`} item={item} setNumber={setNumber} totalSets={itemTargetSets} preferredUnit={preferredUnit} previous={previous} onComplete={(data) => void completeItem(data)} />
        )}
      </section>

      <details className="card card-pad">
        <summary className="row-between" style={{ cursor: "pointer", minHeight: 44 }}><strong>Notes</strong><span className="caption">optionnel</span></summary>
        <div className="stack" style={{ marginTop: 14 }}>
          <label className="label">Sur cet exercice
            <textarea
              className="input textarea"
              value={session.exerciseNotes?.[item.id] ?? ""}
              placeholder="Commentaire personnel sur ce mouvement..."
              onChange={(event) => setSession({ ...session, exerciseNotes: { ...(session.exerciseNotes ?? {}), [item.id]: event.target.value } })}
              onBlur={(event) => void persist({ ...session, exerciseNotes: { ...(session.exerciseNotes ?? {}), [item.id]: event.target.value } })}
            />
          </label>
          <label className="label">Sur la séance
            <textarea
              className="input textarea"
              value={session.notes}
              placeholder="Commentaire global de séance..."
              onChange={(event) => setSession({ ...session, notes: event.target.value })}
              onBlur={(event) => void persist({ ...session, notes: event.target.value })}
            />
          </label>
        </div>
      </details>

      <div className="row-between">
        <button type="button" className="button button-secondary" style={{ minWidth: 120 }} onClick={() => void move(-1)} disabled={currentIndex === 0}><Icon name="angle-small-left" size={18} /> Précédent</button>
        <button type="button" className="button button-secondary" style={{ minWidth: 120 }} onClick={() => void move(1)} disabled={currentIndex === sequence.length - 1}>Suivant <Icon name="angle-small-right" size={18} /></button>
      </div>

      {allComplete ? (
        <button type="button" className="button button-primary" style={{ minHeight: 58 }} onClick={() => void finishWorkout()}><Icon name="flag" size={19} /> Terminer la séance</button>
      ) : null}

      {session.restTargetEndTime ? (
        <RestTimer key={session.restTargetEndTime} targetEndTime={session.restTargetEndTime} nextLabel={nextLabel} onChangeTarget={changeRestTarget} onDone={clearRest} />
      ) : null}
    </div>
  );
}
