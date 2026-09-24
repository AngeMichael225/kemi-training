export function formatDuration(seconds: number | null): string {
  if (seconds === null) return "Variable";
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  if (minutes && remaining) return `${minutes} min ${remaining} s`;
  if (minutes) return `${minutes} min`;
  return `${remaining} s`;
}

export function formatClock(seconds: number): string {
  const safe = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(safe / 60);
  const remaining = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`;
}

export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("fr-CA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
