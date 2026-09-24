"use client";

import { Bell, Moon, Ruler, Volume2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { WeightUnit } from "@/lib/units";
import { getPreference, getPreferredWeightUnit, setPreference } from "@/lib/offline-db";

export function PreferencesPanel() {
  const [unit, setUnit] = useState<WeightUnit>("kg");
  const [sound, setSound] = useState(true);
  const [notifications, setNotifications] = useState(false);

  useEffect(() => {
    void Promise.all([
      getPreferredWeightUnit(),
      getPreference<boolean>("timerSound", true),
      getPreference<boolean>("notifications", false),
    ]).then(([u, s, n]) => { setUnit(u); setSound(s); setNotifications(n); });
  }, []);

  async function chooseUnit(next: WeightUnit) {
    setUnit(next);
    await setPreference("preferredWeightUnit", next);
  }

  async function toggle(key: "timerSound" | "notifications", value: boolean) {
    if (key === "timerSound") setSound(value); else setNotifications(value);
    await setPreference(key, value);
    if (key === "notifications" && value && "Notification" in window && Notification.permission === "default") {
      const permission = await Notification.requestPermission();
      const granted = permission === "granted";
      setNotifications(granted);
      await setPreference("notifications", granted);
    }
  }

  return (
    <div className="stack">
      <section className="card card-pad stack">
        <div className="row"><Ruler size={18} className="muted" /><div><h2 className="h3">Unites de charge</h2><p className="caption" style={{ margin: "3px 0 0" }}>La valeur source reste intacte. Seul l'affichage est converti.</p></div></div>
        <div className="segmented"><button type="button" data-active={unit === "kg"} onClick={() => void chooseUnit("kg")}>Kilogrammes</button><button type="button" data-active={unit === "lbs"} onClick={() => void chooseUnit("lbs")}>Livres</button></div>
      </section>
      <section className="card card-pad stack">
        <PreferenceToggle icon={<Volume2 size={18} />} label="Son du timer" description="Progressive enhancement; la séance fonctionne sans son." checked={sound} onChange={(value) => void toggle("timerSound", value)} />
        <div className="divider" />
        <PreferenceToggle icon={<Bell size={18} />} label="Notifications" description="Optionnelles. Le timer reste exact meme si elles sont refusees." checked={notifications} onChange={(value) => void toggle("notifications", value)} />
        <div className="divider" />
        <div className="row"><Moon size={18} className="muted" /><div><strong>Mode sombre</strong><p className="caption" style={{ margin: "3px 0 0" }}>Experience principale de la V1.</p></div></div>
      </section>
    </div>
  );
}

function PreferenceToggle({ icon, label, description, checked, onChange }: { icon: React.ReactNode; label: string; description: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="row-between" style={{ cursor: "pointer" }}>
      <span className="row">{icon}<span><strong>{label}</strong><span className="caption" style={{ display: "block", marginTop: 3 }}>{description}</span></span></span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} style={{ width: 22, height: 22, accentColor: "var(--accent)" }} />
    </label>
  );
}
