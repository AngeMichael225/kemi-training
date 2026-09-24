import { Sparkles } from "lucide-react";

export function CoachTip({ children }: { children: React.ReactNode }) {
  return (
    <div className="coach-tip">
      <strong><Sparkles size={13} style={{ display: "inline", marginRight: 5 }} /> Conseil du coach</strong>
      <span>{children}</span>
    </div>
  );
}
