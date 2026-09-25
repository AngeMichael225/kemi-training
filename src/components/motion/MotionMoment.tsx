"use client";

import { useSyncExternalStore } from "react";
import { Lottie } from "lottie-react";
import { motionLoops, motionMoments, type MotionName } from "@/components/motion/moments";

function subscribe(onChange: () => void) {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function motionPreferred() {
  return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function MotionMoment({
  name,
  size = 96,
  fallback,
}: {
  name: MotionName;
  size?: number;
  fallback: React.ReactNode;
}) {
  const play = useSyncExternalStore(subscribe, motionPreferred, () => false);

  return (
    <div className="motion-moment" style={{ width: size, height: size }} data-motion={name} data-reduced={play ? "false" : "true"}>
      {play ? (
        <Lottie src={motionMoments[name]} loop={motionLoops[name]} autoplay aria-hidden="true" />
      ) : (
        <span data-testid="motion-static">{fallback}</span>
      )}
    </div>
  );
}
