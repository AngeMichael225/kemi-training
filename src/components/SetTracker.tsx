"use client";

import { Check, Minus, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import type { SessionSetLog, WorkoutItem } from "@/lib/training-model";
import type { WeightUnit } from "@/lib/units";
import { displayWeight } from "@/lib/units";

export function SetTracker({
  item,
  setNumber,
  totalSets,
  preferredUnit,
  previous,
  onComplete,
}: {
  item: WorkoutItem;
  setNumber: number;
  totalSets: number;
  preferredUnit: WeightUnit;
  previous?: SessionSetLog;
  onComplete: (data: { reps: number | null; weight: number | null; unit: WeightUnit | null; durationSec: number | null }) => void;
}) {
  const targetWeight = useMemo(
    () => displayWeight(item.prescribed_weight, item.weight_unit, preferredUnit),
    [item.prescribed_weight, item.weight_unit, preferredUnit],
  );
  const [weight, setWeight] = useState<number | null>(targetWeight.value);
  const [reps, setReps] = useState<number | null>(item.prescribed_reps);

  const weightStep = preferredUnit === "kg" ? 1.25 : 5;
  const hasWeight = item.prescribed_weight !== null || weight !== null || Boolean(item.load_raw);
  const hasReps = item.prescribed_reps !== null;
  const simpleTimed = item.prescribed_duration_sec !== null && !hasReps && !hasWeight;

  return (
    <div className="stack">
      <div className="row-between">
        <div><span className="caption">Serie</span><div className="h2 metric">{setNumber} / {totalSets}</div></div>
        <div style={{ textAlign: "right" }}><span className="caption">Objectif</span><div className="h3">{item.target_raw ?? "A completer"}{item.load_raw ? ` - ${item.load_raw}` : ""}</div></div>
      </div>

      {previous ? (
        <div className="pill" style={{ width: "fit-content" }}>Derniere fois: {previous.actualWeight !== null ? `${previous.actualWeight} ${previous.weightUnit ?? ""} x ` : ""}{previous.actualReps ?? "--"}</div>
      ) : null}

      {hasWeight ? (
        <label className="label">Charge
          <div className="counter-control">
            <button type="button" className="icon-button" onClick={() => setWeight((value) => Math.max(0, (value ?? 0) - weightStep))} aria-label="Diminuer la charge"><Minus size={18} /></button>
            <div className="counter-value">{weight === null ? "--" : `${weight} ${preferredUnit}`}</div>
            <button type="button" className="icon-button" onClick={() => setWeight((value) => (value ?? 0) + weightStep)} aria-label="Augmenter la charge"><Plus size={18} /></button>
          </div>
        </label>
      ) : null}

      {hasReps ? (
        <label className="label">Répétitions
          <div className="counter-control">
            <button type="button" className="icon-button" onClick={() => setReps((value) => Math.max(0, (value ?? 0) - 1))} aria-label="Diminuer les répétitions"><Minus size={18} /></button>
            <div className="counter-value">{reps ?? "--"} reps</div>
            <button type="button" className="icon-button" onClick={() => setReps((value) => (value ?? 0) + 1)} aria-label="Augmenter les répétitions"><Plus size={18} /></button>
          </div>
        </label>
      ) : null}

      {simpleTimed ? <div className="card card-pad row-between"><span className="muted">Duree prescrite</span><strong className="metric">{item.prescribed_duration_sec} sec</strong></div> : null}

      <button type="button" className="button button-primary" onClick={() => onComplete({ reps, weight, unit: hasWeight ? preferredUnit : null, durationSec: simpleTimed ? item.prescribed_duration_sec : null })}>
        <Check size={19} strokeWidth={3} /> Serie terminée
      </button>
    </div>
  );
}
