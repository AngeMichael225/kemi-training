import Link from "next/link";
import { Icon } from "@/components/icons/Icon";
import type { Metadata } from "next";
import { InstallPWA } from "@/components/InstallPWA";
import { PreferencesPanel } from "@/components/PreferencesPanel";
import { trainingSeed } from "@/lib/training-data";

export const metadata: Metadata = { title: "Profil" };

export default function ProfilePage() {
  return (
    <div className="page-stack">
      <header className="page-heading"><span className="eyebrow">Profil</span><h1 className="h1">Kemi</h1><p className="muted" style={{ margin: 0 }}>Niveau source: {trainingSeed.athlete.level ?? "non renseigné"}. Début du programme: {trainingSeed.athlete.start_date}.</p></header>
      <section className="card card-pad row">
        <div className="workout-index workout-index-accent" style={{ width: 58, height: 58, borderRadius: 20 }}><Icon name="user" size={25} /></div>
        <div><strong>{trainingSeed.athlete.display_name}</strong><div className="caption" style={{ marginTop: 4 }}>Programme importé depuis {trainingSeed.source.filename}</div></div>
      </section>
      <InstallPWA />
      <PreferencesPanel />
      <section className="stack">
        <Link href="/tests" className="card card-pad row-between"><span className="row"><Icon name="clipboard-list-check" size={19} /><span><strong>Tests de force</strong><span className="caption" style={{ display: "block", marginTop: 3 }}>{trainingSeed.strength_tests.length} protocoles importes</span></span></span><Icon name="angle-small-right" size={18} /></Link>
        <Link href="/settings" className="card card-pad row-between"><span className="row"><Icon name="settings" size={19} /><strong>Réglages</strong></span><Icon name="angle-small-right" size={18} /></Link>
        <div className="card card-pad row-between"><span className="row"><Icon name="document" size={19} /><span><strong>Source Excel</strong><span className="caption" style={{ display: "block", marginTop: 3 }}>{trainingSeed.program.weeks.length} semaines actuellement disponibles</span></span></span></div>
      </section>
      <p className="caption" style={{ margin: 0 }}>Uicons by <a href="https://www.flaticon.com/uicons" target="_blank" rel="noreferrer">Flaticon</a></p>
    </div>
  );
}
