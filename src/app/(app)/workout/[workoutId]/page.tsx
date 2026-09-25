import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/icons/Icon";
import type { Metadata } from "next";
import { getWorkoutContext, getExerciseMedia } from "@/lib/training-data";
import { StartWorkoutButton } from "@/components/StartWorkoutButton";
import { ExerciseMedia } from "@/components/ExerciseMedia";

export async function generateMetadata({ params }: { params: Promise<{ workoutId: string }> }): Promise<Metadata> {
  const { workoutId } = await params;
  const context = getWorkoutContext(workoutId);
  return { title: context ? `${context.week.name} - ${context.day.title}` : "Séance" };
}

export default async function WorkoutPage({ params }: { params: Promise<{ workoutId: string }> }) {
  const { workoutId } = await params;
  const context = getWorkoutContext(workoutId);
  if (!context) return notFound();
  const { week, day } = context;
  const allItems = day.sections.flatMap((section) => section.items);
  const firstMediaItem = allItems.find((item) => getExerciseMedia(item.exercise_id).some((media) => media.media_type !== "external_reference"));

  return (
    <div className="page-stack">
      <header className="page-heading">
        <Link href={`/plan/week/${week.week_number}`} className="row small muted" style={{ width: "fit-content" }}><Icon name="arrow-left" size={16} /> Semaine {week.week_number}</Link>
        <span className="eyebrow">Jour {day.day_number}</span>
        <h1 className="h1">{day.sections.find((section) => section.section_type.includes("focus"))?.title ?? day.title}</h1>
        <div className="row wrap" style={{ marginTop: 4 }}>
          <span className="pill"><Icon name="dumbbell-fitness" size={13} /> {allItems.length} items</span>
          <span className="pill"><Icon name="stopwatch" size={13} /> temps selon prescription</span>
          {allItems.some((item) => item.item_kind === "strength_test") ? <span className="pill pill-accent"><Icon name="dashboard" size={13} /> test de force</span> : null}
        </div>
      </header>

      {firstMediaItem ? <ExerciseMedia exerciseId={firstMediaItem.exercise_id} media={getExerciseMedia(firstMediaItem.exercise_id)} alt={firstMediaItem.exercise_name} priority /> : null}

      <StartWorkoutButton day={day} week={week} />

      <section className="stack">
        {day.sections.map((section) => (
          <article key={section.id} className="card card-pad stack">
            <div className="row-between"><h2 className="h2">{section.title}</h2><span className="pill">{section.items.length}</span></div>
            <div className="workout-list">
              {section.items.map((item, index) => (
                <div className="workout-row" key={item.id} style={{ gridTemplateColumns: "48px 1fr auto" }}>
                  <div className={`workout-index ${index === 0 ? "workout-index-accent" : ""}`}>{index + 1}</div>
                  <div style={{ minWidth: 0 }}>
                    <strong>{item.exercise_name}</strong>
                    <div className="caption" style={{ marginTop: 4 }}>{item.target_raw ?? "Test"}{item.load_raw ? ` - ${item.load_raw}` : ""}{item.rest_raw ? ` - repos ${item.rest_raw}` : ""}</div>
                  </div>
                  <Icon name="angle-small-right" size={17} className="muted" />
                </div>
              ))}
            </div>
          </article>
        ))}
      </section>

      <StartWorkoutButton day={day} week={week} />
    </div>
  );
}
