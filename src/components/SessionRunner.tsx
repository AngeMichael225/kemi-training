"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { MotionMoment } from "@/components/motion/MotionMoment";
import type {
  ExerciseMediaSeed,
  LocalWorkoutSession,
  ProgramWeekSeed,
  SessionSetLog,
  WorkoutDaySeed,
} from "@/lib/training-model";
import { flattenWorkout } from "@/lib/training-data";
import { getLastPerformance, getPreferredWeightUnit, getSession, saveSession } from "@/lib/offline-db";
import { applySetCompletion, resolveLoadedSession, targetSets, type SetCompletionInput } from "@/lib/session-mutations";
import { createSessionStore, type SessionStore } from "@/lib/session-persistence";
import { convertWeight, type WeightUnit } from "@/lib/units";
import { ExerciseMedia } from "@/components/ExerciseMedia";
import { CoachTip } from "@/components/CoachTip";
import { SetTracker } from "@/components/SetTracker";
import { CardioTracker } from "@/components/CardioTracker";
import { RestTimer } from "@/components/RestTimer";
import { formatDuration } from "@/lib/format";

function UnavailableSession({ detail }: { detail: string }) {
  return (
    <div className="page-stack" style={{ paddingTop: 28 }}>
      <div className="card card-pad stack">
        <span className="eyebrow">Séance</span>
        <h1 className="h1">Séance introuvable</h1>
        <p className="muted">{detail}</p>
        <div className="stack">
          <Link href="/today" className="button button-primary">Retour à l&apos;accueil</Link>
          <Link href="/plan" className="button button-secondary">Voir le programme</Link>
        </div>
      </div>
    </div>
  );
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
  const [loadState, setLoadState] = useState<"loading" | "found" | "missing" | "mismatch">("loading");
  const [persistError, setPersistError] = useState<string | null>(null);
  const [notesOpen, setNotesOpen] = useState(false);
  const requestKey = `${sessionId}:${day.id}`;
  const [requestKeySeen, setRequestKeySeen] = useState(requestKey);
  const storeRef = useRef<SessionStore<LocalWorkoutSession> | null>(null);
  const mountedRef = useRef(true);

  if (requestKeySeen !== requestKey) {
    setRequestKeySeen(requestKey);
    setLoadState("loading");
    setSession(null);
    setPersistError(null);
  }

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const commit = useCallback((mutator: (current: LocalWorkoutSession) => LocalWorkoutSession) => {
    const store = storeRef.current;
    if (!store) return;
    const persisted = store.update(mutator);
    setSession(store.current);
    void persisted.then(() => {
      if (mountedRef.current) setPersistError(null);
    }, (error: unknown) => {
      if (!mountedRef.current) return;
      setPersistError(error instanceof Error ? error.message : "La séance n’a pas pu être enregistrée.");
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    storeRef.current = null;
    void (async () => {
      try {
        const [stored, unit] = await Promise.all([getSession(sessionId), getPreferredWeightUnit()]);
        if (cancelled) return;
        setPreferredUnit(unit);
        const resolved = resolveLoadedSession(stored, day.id);
        if (resolved.state !== "found") {
          setSession(null);
          setLoadState(resolved.state);
          return;
        }
        storeRef.current = createSessionStore({
          initial: resolved.session,
          write: (snapshot) => saveSession(snapshot),
        });
        setSession(resolved.session);
        setLoadState("found");
      } catch (error) {
        if (cancelled) return;
        setSession(null);
        setPersistError(error instanceof Error ? error.message : "La séance n’a pas pu être lue.");
        setLoadState("missing");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId, day.id]);

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
    commit((current) => ({ ...current, restTargetEndTime: null }));
  }, [commit]);

  const changeRestTarget = useCallback((target: number | null) => {
    commit((current) => ({ ...current, restTargetEndTime: target }));
  }, [commit]);

  function completeItem(data: SetCompletionInput) {
    if (!item) return;
    const captured = item;
    commit((current) => applySetCompletion(current, captured, sequence, data));
  }

  function markStrengthTestDone() {
    completeItem({ reps: null, weight: null, unit: null, durationSec: null });
  }

  function move(delta: number) {
    commit((current) => {
      const index = Math.max(0, Math.min(sequence.length - 1, current.currentItemIndex));
      const nextIndex = Math.max(0, Math.min(sequence.length - 1, index + delta));
      return { ...current, currentItemIndex: nextIndex, restTargetEndTime: null };
    });
  }

  function finishWorkout() {
    const now = new Date().toISOString();
    commit((current) => ({
      ...current,
      status: "completed",
      completedAt: current.completedAt ?? now,
      restTargetEndTime: null,
      currentItemIndex: Math.max(0, sequence.length - 1),
    }));
  }

  if (loadState === "missing") {
    return <UnavailableSession detail="Cette séance n’existe plus sur cet appareil." />;
  }

  if (loadState === "mismatch") {
    return <UnavailableSession detail="Cette séance ne correspond pas à cet entraînement." />;
  }

  if (loadState !== "found" || !session || !item || !section) {
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
          {persistError ? <p className="caption" role="alert">{persistError}</p> : null}
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
            <button type="button" className="button button-primary" onClick={() => markStrengthTestDone()}><Icon name="check-circle" size={18} /> Test complete</button>
          </div>
        ) : item.item_kind === "cardio" ? (
          <CardioTracker item={item} onComplete={(durationSec) => completeItem({ reps: null, weight: null, unit: null, durationSec })} />
        ) : (
          <SetTracker key={`${item.id}-${setNumber}-${preferredUnit}`} item={item} setNumber={setNumber} totalSets={itemTargetSets} preferredUnit={preferredUnit} previous={previous} onComplete={(data) => completeItem(data)} />
        )}
      </section>

      {persistError ? <p className="caption" role="alert">{persistError}</p> : null}

      <details className="card card-pad" open={notesOpen} onToggle={(event) => setNotesOpen(event.currentTarget.open)}>
        <summary className="row-between" style={{ cursor: "pointer", minHeight: 44 }}><strong>Notes</strong><span className="caption">optionnel</span></summary>
        <div className="stack" style={{ marginTop: 14 }}>
          <label className="label">Sur cet exercice
            <textarea
              className="input textarea"
              value={session.exerciseNotes?.[item.id] ?? ""}
              placeholder="Commentaire personnel sur ce mouvement..."
              onChange={(event) => {
                const value = event.target.value;
                const itemId = item.id;
                commit((current) => ({
                  ...current,
                  exerciseNotes: { ...(current.exerciseNotes ?? {}), [itemId]: value },
                }));
              }}
            />
          </label>
          <label className="label">Sur la séance
            <textarea
              className="input textarea"
              value={session.notes}
              placeholder="Commentaire global de séance..."
              onChange={(event) => {
                const value = event.target.value;
                commit((current) => ({ ...current, notes: value }));
              }}
            />
          </label>
        </div>
      </details>

      <div className="row-between">
        <button type="button" className="button button-secondary" style={{ minWidth: 120 }} onClick={() => move(-1)} disabled={currentIndex === 0}><Icon name="angle-small-left" size={18} /> Précédent</button>
        <button type="button" className="button button-secondary" style={{ minWidth: 120 }} onClick={() => move(1)} disabled={currentIndex === sequence.length - 1}>Suivant <Icon name="angle-small-right" size={18} /></button>
      </div>

      {allComplete ? (
        <button type="button" className="button button-primary" style={{ minHeight: 58 }} onClick={() => finishWorkout()}><Icon name="flag" size={19} /> Terminer la séance</button>
      ) : null}

      {session.restTargetEndTime ? (
        <RestTimer key={session.restTargetEndTime} targetEndTime={session.restTargetEndTime} nextLabel={nextLabel} onChangeTarget={changeRestTarget} onDone={clearRest} />
      ) : null}
    </div>
  );
}
