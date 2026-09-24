import Link from "next/link";
import { ArrowRight, Layers3, TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import { trainingSeed } from "@/lib/training-data";

export const metadata: Metadata = { title: "Programme" };

export default function PlanPage() {
  const highAnomalies = trainingSeed.anomalies.filter((item) => item.severity === "high");
  return (
    <div className="page-stack">
      <header className="page-heading">
        <span className="eyebrow">Programme</span>
        <h1 className="h1">Ton plan, sans le bruit d'Excel.</h1>
        <p className="muted" style={{ margin: 0 }}>Toutes les semaines actuellement presentes dans le classeur, conservees telles qu'elles ont ete prescrites.</p>
      </header>

      {highAnomalies.length ? (
        <div className="card card-pad row" style={{ alignItems: "flex-start" }}>
          <TriangleAlert size={20} style={{ color: "var(--warning)", flex: "0 0 auto", marginTop: 2 }} />
          <div><strong>Le fichier source est partiel</strong><p className="caption" style={{ margin: "5px 0 0" }}>Le Dashboard annonce 12 semaines, les phases vont jusqu'a 13, mais seules les semaines 1 a 4 sont presentes. Aucune semaine manquante n'a ete inventee.</p></div>
        </div>
      ) : null}

      <section className="stack">
        <div className="section-title"><h2 className="h2">Semaines disponibles</h2><span className="pill pill-accent"><Layers3 size={13} /> {trainingSeed.program.weeks.length}</span></div>
        <div className="grid-auto">
          {trainingSeed.program.weeks.map((week) => (
            <Link href={`/plan/week/${week.week_number}`} key={week.id} className="card card-pad card-elevated stack" style={{ minHeight: 190 }}>
              <div className="row-between"><span className="eyebrow" style={{ fontSize: ".66rem" }}>Semaine {week.week_number}</span><ArrowRight size={18} /></div>
              <div><h2 className="h2">{week.days.length} séances</h2><p className="caption" style={{ margin: "7px 0 0" }}>{week.days.reduce((sum, day) => sum + day.sections.reduce((inner, section) => inner + section.items.length, 0), 0)} items importes</p></div>
              <div className="progress-track"><div className="progress-fill" style={{ width: "100%" }} /></div>
            </Link>
          ))}
        </div>
      </section>

      <section className="stack">
        <div className="section-title"><h2 className="h2">Phases du coach</h2></div>
        {trainingSeed.program.phases.map((phase) => (
          <article className="card card-pad" key={phase.id}>
            <div className="row-between" style={{ alignItems: "flex-start" }}>
              <div><span className="eyebrow" style={{ fontSize: ".64rem" }}>{phase.name}</span><h3 className="h3" style={{ marginTop: 5 }}>{phase.label}</h3></div>
              <span className="pill">{phase.week_range}</span>
            </div>
            <p className="small muted" style={{ margin: "12px 0 0", lineHeight: 1.55 }}>{phase.description}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
