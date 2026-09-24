"use client";

export function HistoryChart({ values, label }: { values: number[]; label: string }) {
  if (values.length < 2) return <div className="empty-state">Pas encore assez de donnees pour tracer {label.toLowerCase()}.</div>;
  const width = 620;
  const height = 180;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);
  const points = values.map((value, index) => {
    const x = 16 + (index / (values.length - 1)) * (width - 32);
    const y = height - 16 - ((value - min) / range) * (height - 42);
    return `${x},${y}`;
  }).join(" ");
  return (
    <div className="card card-pad stack">
      <div className="row-between"><h3 className="h3">{label}</h3><span className="pill">{values.length} points</span></div>
      <svg role="img" aria-label={label} viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: "auto", overflow: "visible" }}>
        <line x1="16" x2={width - 16} y1={height - 16} y2={height - 16} stroke="rgba(255,255,255,.12)" />
        <polyline points={points} fill="none" stroke="var(--accent)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        {points.split(" ").map((point) => {
          const [cx, cy] = point.split(",");
          return <circle key={point} cx={cx} cy={cy} r="5" fill="var(--background)" stroke="var(--accent)" strokeWidth="4" />;
        })}
      </svg>
    </div>
  );
}
