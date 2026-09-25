import { Icon } from "@/components/icons/Icon";

export function CoachTip({ children }: { children: React.ReactNode }) {
  return (
    <div className="coach-tip">
      <strong><Icon name="comment-alt" size={13} style={{ marginRight: 5 }} /> Conseil du coach</strong>
      <span>{children}</span>
    </div>
  );
}
