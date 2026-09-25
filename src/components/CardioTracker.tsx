"use client";

import { Icon } from "@/components/icons/Icon";
import { useEffect, useRef, useState } from "react";
import type { WorkoutItem } from "@/lib/training-model";
import { formatClock } from "@/lib/format";

export function CardioTracker({ item, onComplete }: { item: WorkoutItem; onComplete: (durationSec: number) => void }) {
  const target = item.prescribed_duration_sec ?? 0;
  const [running, setRunning] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [accumulated, setAccumulated] = useState(0);
  const [now, setNow] = useState(0);
  const frame = useRef(0);

  useEffect(() => {
    if (!running) return;
    const tick = () => {
      setNow(Date.now());
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [running]);

  const elapsed = accumulated + (running && startedAt ? now - startedAt : 0);
  const elapsedSec = Math.floor(elapsed / 1000);
  const remaining = target ? Math.max(0, target - elapsedSec) : elapsedSec;

  function toggle() {
    if (running) {
      const delta = startedAt ? Date.now() - startedAt : 0;
      setAccumulated((value) => value + delta);
      setStartedAt(null);
      setRunning(false);
    } else {
      setStartedAt(Date.now());
      setNow(Date.now());
      setRunning(true);
    }
  }

  function reset() {
    setRunning(false);
    setStartedAt(null);
    setAccumulated(0);
    setNow(Date.now());
  }

  const cardio = item.cardio;
  return (
    <div className="stack">
      <div className="card card-pad" style={{ textAlign: "center" }}>
        <span className="eyebrow">Cardio</span>
        <div className="rest-clock" style={{ fontSize: "clamp(4rem, 20vw, 7rem)", margin: "20px 0" }}>{formatClock(remaining)}</div>
        <div className="row wrap" style={{ justifyContent: "center" }}>
          {cardio?.speed_kmh ? <span className="pill">{cardio.speed_kmh} km/h</span> : null}
          {cardio?.incline_pct ? <span className="pill">Pente {cardio.incline_pct}%</span> : null}
          {cardio?.level ? <span className="pill">Niveau {cardio.level}</span> : null}
          {target ? <span className="pill pill-accent">Objectif {Math.round(target / 60)} min</span> : null}
        </div>
      </div>
      <div className="grid-2">
        <button type="button" className="button button-secondary" onClick={reset}><Icon name="rotate-left" size={18} /> Reset</button>
        <button type="button" className="button button-primary" onClick={toggle}>{running ? <Icon name="pause" size={18} /> : <Icon name="play" size={18} />} {running ? "Pause" : elapsedSec ? "Reprendre" : "Demarrer"}</button>
      </div>
      <button type="button" className="button button-ghost" onClick={() => onComplete(Math.max(1, elapsedSec))} disabled={elapsedSec === 0}><Icon name="check" size={18} /> Terminer le cardio</button>
    </div>
  );
}
