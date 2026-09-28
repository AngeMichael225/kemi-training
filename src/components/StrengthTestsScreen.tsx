"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/icons/Icon";
import type { StrengthTestResultLocal, StrengthTestSeed } from "@/lib/training-model";
import { RestTimer } from "@/components/RestTimer";
import { brzyckiEstimated1RM } from "@/lib/strength";
import { convertWeight, displayWeight, type WeightUnit } from "@/lib/units";
import { getPreferredWeightUnit, saveStrengthTestResult } from "@/lib/offline-db";

interface ActualSet {
  weight: number | null;
  reps: number | null;
  completed: boolean;
}

export function StrengthTestsScreen({ tests, initialSlug }: { tests: StrengthTestSeed[]; initialSlug?: string }) {
  const initialIndex = Math.max(0, tests.findIndex((test) => test.slug === initialSlug));
  const [testIndex, setTestIndex] = useState(initialIndex);
  const [setIndex, setSetIndex] = useState(0);
  const [unit, setUnit] = useState<WeightUnit>("kg");
  const [actuals, setActuals] = useState<ActualSet[]>(() => {
    const first = tests[initialIndex] ?? tests[0];
    return first.sets.map((set) => ({
      weight: set.weight === null ? null : displayWeight(set.weight, set.weight_unit ?? "kg", "kg").value,
      reps: set.repetitions,
      completed: false,
    }));
  });
  const [restTarget, setRestTarget] = useState<number | null>(null);
  const [savedResult, setSavedResult] = useState<StrengthTestResultLocal | null>(null);
  const test = tests[testIndex];
  const prescribed = test.sets[setIndex];
  const draftKey = `${test.id}:${unit}`;
  const [draftKeySeen, setDraftKeySeen] = useState(draftKey);

  if (draftKeySeen !== draftKey) {
    setDraftKeySeen(draftKey);
    setSetIndex(0);
    setSavedResult(null);
    setActuals(test.sets.map((set) => ({
      weight: set.weight === null ? null : displayWeight(set.weight, set.weight_unit ?? "kg", unit).value,
      reps: set.repetitions,
      completed: false,
    })));
  }

  useEffect(() => {
    void getPreferredWeightUnit().then(setUnit);
  }, []);

  const current = actuals[setIndex] ?? { weight: null, reps: null, completed: false };
  const step = unit === "kg" ? 1.25 : 5;
  const completedCount = actuals.filter((set) => set.completed).length;
  const progress = test.sets.length ? Math.round((completedCount / test.sets.length) * 100) : 0;

  function patchCurrent(patch: Partial<ActualSet>) {
    setActuals((values) => values.map((value, index) => index === setIndex ? { ...value, ...patch } : value));
  }

  function completeSet() {
    patchCurrent({ completed: true });
    const isLast = setIndex >= test.sets.length - 1;
    if (!isLast && prescribed.rest_seconds && prescribed.rest_seconds > 0) {
      setRestTarget(Date.now() + prescribed.rest_seconds * 1000);
    }
    if (!isLast) setSetIndex((value) => value + 1);
  }

  async function finishTest() {
    const lastCompleted = actuals.map((value, index) => ({ ...value, index })).filter((value) => value.completed && value.weight !== null && value.reps !== null).at(-1);
    if (!lastCompleted) return;
    const weightKg = unit === "kg" ? lastCompleted.weight as number : convertWeight(lastCompleted.weight as number, "lbs", "kg");
    const estimateKg = brzyckiEstimated1RM(weightKg, lastCompleted.reps as number);
    const result: StrengthTestResultLocal = {
      id: crypto.randomUUID(),
      testId: test.id,
      testName: test.name,
      exerciseId: test.exercise_id,
      performedAt: new Date().toISOString(),
      finalWeight: weightKg,
      repetitions: lastCompleted.reps,
      weightUnit: "kg",
      estimated1rm: estimateKg,
      formula: "Brzycki",
    };
    await saveStrengthTestResult(result);
    setSavedResult(result);
  }

  const visibleEstimate = useMemo(() => {
    if (!savedResult?.estimated1rm) return null;
    return unit === "kg" ? savedResult.estimated1rm : convertWeight(savedResult.estimated1rm, "kg", "lbs");
  }, [savedResult, unit]);

  if (savedResult) {
    return (
      <div className="page-stack">
        <header className="page-heading"><span className="eyebrow">Test terminé</span><h1 className="h1">{test.name}</h1></header>
        <section className="card card-pad card-elevated stack" style={{ minHeight: "54dvh", justifyContent: "space-between" }}>
          <div className="workout-index workout-index-accent" style={{ width: 64, height: 64, borderRadius: 22 }}><Icon name="trophy" size={28} /></div>
          <div><span className="caption">Estimated 1RM - Brzycki</span><div className="rest-clock" style={{ fontSize: "clamp(4rem, 18vw, 7rem)", marginTop: 8 }}>{visibleEstimate?.toFixed(1) ?? "--"}</div><div className="h2">{visibleEstimate ? unit : ""}</div><p className="small muted">Il s’agit d’une estimation calculee a partir de la derniere serie renseignee, pas d’un 1RM mesure.</p></div>
          <div className="grid-2">
            <button type="button" className="button button-secondary" onClick={() => { setSavedResult(null); setSetIndex(0); setActuals(test.sets.map((set) => ({
              weight: set.weight === null ? null : displayWeight(set.weight, set.weight_unit ?? "kg", unit).value,
              reps: set.repetitions,
              completed: false,
            }))); }}><Icon name="rotate-left" size={18} /> Refaire le test</button>
            <Link href="/progress" className="button button-primary">Progression <Icon name="arrow-right" size={18} /></Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <header className="page-heading"><span className="eyebrow">Tests de force</span><h1 className="h1">Un protocole clair, serie par serie.</h1><p className="muted" style={{ margin: 0 }}>Les charges du classeur restent la reference. Tu peux enregistrer ce que tu realises reellement.</p></header>
      <div className="segmented" aria-label="Choix du test">
        {tests.map((candidate, index) => <button type="button" key={candidate.id} data-active={index === testIndex} onClick={() => setTestIndex(index)}>{candidate.name}</button>)}
      </div>
      <div className="row-between"><div><span className="eyebrow" style={{ fontSize: ".64rem" }}>{test.name}</span><h2 className="h2" style={{ marginTop: 4 }}>Serie {setIndex + 1} / {test.sets.length}</h2></div><strong className="metric">{progress}%</strong></div>
      <div className="progress-track"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>

      <section className="card card-pad stack">
        <div className="row-between"><div><span className="caption">Prescription source</span><div className="h3" style={{ marginTop: 4 }}>{prescribed.weight_raw ?? "Charge non renseignée"}</div></div><span className="pill">{prescribed.rest_raw ?? "--"}</span></div>
        <label className="label">Charge realisee
          <div className="counter-control">
            <button type="button" className="icon-button" onClick={() => patchCurrent({ weight: Math.max(0, (current.weight ?? 0) - step) })}><Icon name="minus" size={18} /></button>
            <div className="counter-value">{current.weight ?? "--"} {current.weight !== null ? unit : ""}</div>
            <button type="button" className="icon-button" onClick={() => patchCurrent({ weight: (current.weight ?? 0) + step })}><Icon name="plus" size={18} /></button>
          </div>
        </label>
        <label className="label">Répétitions
          <div className="counter-control">
            <button type="button" className="icon-button" onClick={() => patchCurrent({ reps: Math.max(0, (current.reps ?? 0) - 1) })}><Icon name="minus" size={18} /></button>
            <div className="counter-value">{current.reps ?? "--"} reps</div>
            <button type="button" className="icon-button" onClick={() => patchCurrent({ reps: (current.reps ?? 0) + 1 })}><Icon name="plus" size={18} /></button>
          </div>
        </label>
        <button type="button" className="button button-primary" onClick={completeSet}><Icon name="check" size={19} /> Serie terminée</button>
      </section>

      <div className="row-between">
        <button type="button" className="button button-secondary" onClick={() => setSetIndex((value) => Math.max(0, value - 1))} disabled={setIndex === 0}><Icon name="angle-small-left" size={18} /> Précédent</button>
        <button type="button" className="button button-secondary" onClick={() => setSetIndex((value) => Math.min(test.sets.length - 1, value + 1))} disabled={setIndex === test.sets.length - 1}>Suivant <Icon name="angle-small-right" size={18} /></button>
      </div>

      {completedCount === test.sets.length ? <button type="button" className="button button-primary" style={{ minHeight: 58 }} onClick={() => void finishTest()}><Icon name="trophy" size={19} /> Calculer l’Estimated 1RM</button> : null}

      {restTarget ? <RestTimer key={restTarget} targetEndTime={restTarget} nextLabel={`Serie ${Math.min(test.sets.length, setIndex + 1)} - ${test.name}`} onChangeTarget={setRestTarget} onDone={() => setRestTarget(null)} /> : null}
    </div>
  );
}
