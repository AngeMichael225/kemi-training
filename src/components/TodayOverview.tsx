"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, CalendarDays, ChevronRight, Clock3, Dumbbell, Flame, RotateCcw } from "lucide-react";
import type { LocalWorkoutSession, ProgramWeekSeed } from "@/lib/training-model";
import { getActiveSession, getCompletedSessions } from "@/lib/offline-db";
import { StartWorkoutButton } from "@/components/StartWorkoutButton";

export function TodayOverview({ week, requestedWeek, maxAvailableWeek }: { week: ProgramWeekSeed; requestedWeek: number; maxAvailableWeek: number }) {
  const [active, setActive] = useState<LocalWorkoutSession | undefined>();
  const [completed, setCompleted] = useState<LocalWorkoutSession[]>([]);

  useEffect(() => {
    void Promise.all([getActiveSession(), getCompletedSessions()]).then(([a, c]) => {
      setActive(a);
      setCompleted(c);
    });
  }, []);

  const completedThisWeek = useMemo(
    () => completed.filter((session) => session.weekNumber === week.week_number).map((session) => session.dayNumber),
    [completed, week.week_number],
  );
  const recommended = week.days.find((day) => !completedThisWeek.includes(day.day_number)) ?? week.days[0];
  const itemCount = recommended.sections.reduce((sum, section) => sum + section.items.length, 0);
  const strengthCount = recommended.sections.flatMap((section) => section.items).filter((item) => item.item_kind !== "cardio").length;
  const cardioCount = recommended.sections.flatMap((section) => section.items).filter((item) => item.item_kind === "cardio").length;
  const weekProgress = Math.min(100, Math.round((new Set(completedThisWeek).size / week.days.length) * 100));

  const uniqueDays = new Set(completed.map((session) => new Date(session.completedAt ?? session.startedAt).toDateString()));
  const streak = uniqueDays.size;

  return (
    <div className="page-stack">
      <header className="page-heading">
        <span className="eyebrow">KEMI Training</span>
        <h1 className="h1">Bonjour Kemi.</h1>
        <p className="muted" style={{ margin: 0 }}>Ta prochaine séance est prete. Le programme du coach reste la reference.</p>
      </header>

      {requestedWeek > maxAvailableWeek ? (
        <div className="coach-tip">
          <strong>Programme source</strong>
          Les feuilles disponibles s’arretent a la semaine {maxAvailableWeek}. L’app affiche la derniere semaine importee sans inventer la suite.
        </div>
      ) : null}

      {active ? (
        <Link href={`/session/${active.id}?workout=${active.workoutDayId}`} className="card card-pad card-elevated row-between" aria-label="Reprendre la séance active">
          <div>
            <span className="eyebrow" style={{ fontSize: ".66rem" }}>Séance en cours</span>
            <h2 className="h2" style={{ marginTop: 5 }}>{active.workoutTitle}</h2>
          </div>
          <span className="icon-button" aria-hidden="true"><RotateCcw size={19} /></span>
        </Link>
      ) : null}

      <section className="hero-card">
        <div className="hero-orb" aria-hidden="true" />
        <div className="hero-content">
          <div className="row-between" style={{ alignItems: "flex-start" }}>
            <span className="hero-badge"><CalendarDays size={14} /> Semaine {week.week_number} / Jour {recommended.day_number}</span>
          </div>
          <div style={{ maxWidth: 520 }}>
            <div className="row wrap" style={{ marginBottom: 12 }}>
              <span className="pill pill-accent"><Dumbbell size={13} /> {strengthCount} mouvements</span>
              {cardioCount ? <span className="pill"><Clock3 size={13} /> cardio inclus</span> : null}
            </div>
            <h2 className="display" style={{ fontSize: "clamp(2.5rem, 11vw, 5.2rem)", maxWidth: 640 }}>{recommended.sections.find((section) => section.section_type.includes("focus"))?.title ?? recommended.title}</h2>
            <p className="muted" style={{ maxWidth: 500, margin: "14px 0 20px" }}>{itemCount} exercices et blocs, avec les temps de repos et les consignes du fichier source.</p>
            <div className="row wrap">
              <StartWorkoutButton day={recommended} week={week} />
              <Link href={`/workout/${recommended.id}`} className="button button-secondary">Voir le detail <ArrowUpRight size={17} /></Link>
            </div>
          </div>
        </div>
      </section>

      <section className="card card-pad stack">
        <div className="row-between">
          <div>
            <span className="eyebrow" style={{ fontSize: ".66rem" }}>Cette semaine</span>
            <h2 className="h2" style={{ marginTop: 4 }}>{new Set(completedThisWeek).size} / {week.days.length} séances</h2>
          </div>
          <strong className="metric" style={{ fontSize: "1.4rem" }}>{weekProgress}%</strong>
        </div>
        <div className="progress-track" aria-label={`Progression hebdomadaire ${weekProgress}%`}><div className="progress-fill" style={{ width: `${weekProgress}%` }} /></div>
        <div className="grid-2">
          <div className="stat-cell"><strong>{streak || "--"}</strong><span><Flame size={12} style={{ display: "inline", marginRight: 4 }} />jours avec historique</span></div>
          <div className="stat-cell"><strong>{completed.length}</strong><span>séances terminées</span></div>
        </div>
      </section>

      <section className="stack">
        <div className="section-title"><h2 className="h2">Aperçu</h2><Link href={`/plan/week/${week.week_number}`} className="small muted row">Programme <ChevronRight size={16} /></Link></div>
        <div className="workout-list">
          {recommended.sections.slice(0, 3).map((section, index) => (
            <div className="workout-row" key={section.id}>
              <div className={`workout-index ${index === 0 ? "workout-index-accent" : ""}`}>{index + 1}</div>
              <div style={{ minWidth: 0 }}><strong>{section.title}</strong><div className="caption" style={{ marginTop: 4 }}>{section.items.length} items</div></div>
              <ChevronRight size={18} className="muted" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
