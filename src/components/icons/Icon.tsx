import type { CSSProperties } from "react";
import { UICON_EM, uiconPaths, type UIconName } from "@/components/icons/uicon-paths";

export type { UIconName };

export function Icon({
  name,
  size = 18,
  className,
  style,
}: {
  name: UIconName;
  size?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      viewBox={`0 0 ${UICON_EM} ${UICON_EM}`}
      width={size}
      height={size}
      className={className ? `kemi-icon ${className}` : "kemi-icon"}
      style={style}
      aria-hidden="true"
      focusable="false"
    >
      <g transform={`translate(0 ${UICON_EM}) scale(1 -1)`}>
        <path d={uiconPaths[name]} fill="currentColor" />
      </g>
    </svg>
  );
}
