import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/icons/Icon";
import type { Metadata } from "next";
import { trainingSeed } from "@/lib/training-data";

export async function generateMetadata({ params }: { params: Promise<{ weekNumber: string }> }): Promise<Metadata> {
  const { weekNumber } = await params;
  return { title: `Semaine ${weekNumber}` };
}

export default async function WeekPage({ params }: { params: Promise<{ weekNumber: string }> }) {
  const { weekNumber } = await params;
  const week = trainingSeed.program.weeks.find((item) => item.week_number === Number(weekNumber));
  if (!week) return notFound();
  return (
    <div className="page-stack">
      <header className="page-heading">
        <Link href="/plan" className="row small muted" style={{ width: "fit-content" }}><Icon name="arrow-left" size={16} /> Programme</Link>
        <span className="eyebrow">Semaine {week.week_number}</span>
        <h1 className="h1">Trois séances. Une lecture claire.</h1>
      </header>

      <section className="stack">
        {week.days.map((day) => {
          const items = day.sections.flatMap((section) => section.items);
          const cardio = items.filter((item) => item.item_kind === "cardio").length;
          const tests = items.filter((item) => item.item_kind === "strength_test").length;
          return (
            <Link href={`/workout/${day.id}`} key={day.id} className="card card-pad card-elevated stack">
              <div className="row-between"><div><span className="eyebrow" style={{ fontSize: ".64rem" }}>Jour {day.day_number}</span><h2 className="h2" style={{ marginTop: 5 }}>{day.sections.find((section) => section.section_type.includes("focus"))?.title ?? day.title}</h2></div><span className="icon-button"><Icon name="arrow-right" size={18} /></span></div>
              <div className="row wrap">
                <span className="pill"><Icon name="dumbbell-fitness" size={13} /> {items.length} items</span>
                {cardio ? <span className="pill"><Icon name="stopwatch" size={13} /> cardio</span> : null}
                {tests ? <span className="pill pill-accent"><Icon name="dashboard" size={13} /> test de force</span> : null}
              </div>
            </Link>
          );
        })}
      </section>

      {week.vigilance_notes.length ? (
        <section className="card card-pad stack">
          <span className="eyebrow" style={{ fontSize: ".64rem" }}>Points de vigilance</span>
          {week.vigilance_notes.map((note) => <p key={note} className="small muted" style={{ margin: 0, lineHeight: 1.5 }}>{note}</p>)}
        </section>
      ) : null}
    </div>
  );
}
