"use client";

import { useEffect, useRef, useState } from "react";
import { Forward, Plus } from "lucide-react";
import { formatClock } from "@/lib/format";

export function RestTimer({
  targetEndTime,
  nextLabel,
  onChangeTarget,
  onDone,
}: {
  targetEndTime: number;
  nextLabel: string;
  onChangeTarget: (target: number | null) => void;
  onDone: () => void;
}) {
  const [remainingMs, setRemainingMs] = useState(() => Math.max(0, targetEndTime - Date.now()));
  const initialMs = useRef(Math.max(1_000, targetEndTime - Date.now()));
  const notifiedRef = useRef(false);

  useEffect(() => {
    let frame = 0;
    const tick = () => {
      const next = Math.max(0, targetEndTime - Date.now());
      setRemainingMs(next);
      if (next <= 0) {
        if (!notifiedRef.current) {
          notifiedRef.current = true;
          if ("vibrate" in navigator) navigator.vibrate?.([100, 60, 100]);
          if ("Notification" in window && Notification.permission === "granted" && "serviceWorker" in navigator) {
            void navigator.serviceWorker.ready.then((registration) => registration.showNotification("Repos terminé", {
              body: nextLabel,
              tag: "kemi-rest-timer",
              icon: "/icons/kemi-icon-192.png",
            })).catch(() => undefined);
          }
          onDone();
        }
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [targetEndTime, nextLabel, onDone]);

  const seconds = remainingMs / 1000;
  const progress = Math.max(0, Math.min(100, (remainingMs / initialMs.current) * 100));

  return (
    <div className="rest-panel" role="dialog" aria-modal="true" aria-label="Minuteur de repos">
      <div className="rest-card">
        <div className="row-between"><span className="eyebrow">Repos</span><span className="pill">Timer fiable en arrière-plan</span></div>
        <div className="stack" style={{ justifyItems: "center", textAlign: "center" }}>
          <div className="rest-clock">{formatClock(seconds)}</div>
          <div className="progress-track" style={{ width: "100%" }}><div className="progress-fill" style={{ width: `${Number.isFinite(progress) ? progress : 0}%` }} /></div>
          <div><span className="caption">Prochaine étape</span><h2 className="h2" style={{ marginTop: 5 }}>{nextLabel}</h2></div>
        </div>
        <div className="grid-2">
          <button type="button" className="button button-secondary" onClick={() => onChangeTarget(targetEndTime + 15_000)}><Plus size={18} /> 15 sec</button>
          <button type="button" className="button button-primary" onClick={() => onChangeTarget(null)}><Forward size={18} /> Passer</button>
        </div>
      </div>
    </div>
  );
}
