import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/icons/Icon";
import type { Metadata } from "next";
import { ExerciseMedia } from "@/components/ExerciseMedia";
import { MediaUpload } from "@/components/MediaUpload";
import { CoachTip } from "@/components/CoachTip";
import { ExerciseHistory } from "@/components/ExerciseHistory";
import { findExerciseUsage, getExerciseBySlug, getExerciseMedia, trainingSeed } from "@/lib/training-data";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return { title: getExerciseBySlug(slug)?.name ?? "Exercice" };
}

export default async function ExercisePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const exercise = getExerciseBySlug(slug);
  if (!exercise) return notFound();
  const media = getExerciseMedia(exercise.id);
  const usages = findExerciseUsage(exercise.id);
  const tips = [...new Set(trainingSeed.program.weeks.flatMap((week) => week.days.flatMap((day) => day.sections.flatMap((section) => section.items.filter((item) => item.exercise_id === exercise.id && item.notes).map((item) => item.notes as string)))) )];
  const source = media.find((item) => item.original_source_url)?.original_source_url ?? null;

  return (
    <div className="page-stack">
      <header className="page-heading"><Link href="/exercises" className="row small muted" style={{ width: "fit-content" }}><Icon name="arrow-left" size={16} /> Exercices</Link><span className="eyebrow">Mouvement</span><h1 className="h1">{exercise.name}</h1></header>
      <ExerciseMedia exerciseId={exercise.id} media={media} alt={`Démonstration ${exercise.name}`} priority />
      {tips.map((tip) => <CoachTip key={tip}>{tip}</CoachTip>)}
      <ExerciseHistory exerciseId={exercise.id} />
      <section className="card card-pad stack">
        <h2 className="h2">Mon media</h2>
        <p className="small muted" style={{ margin: 0 }}>Ajoute ta propre photo, GIF, WebP ou MP4. Elle devient prioritaire sur cet appareil et, si Supabase est configure, est envoyee dans Storage.</p>
        <MediaUpload exerciseId={exercise.id} />
      </section>
      <section className="card card-pad stack">
        <div className="row-between"><h2 className="h2">Dans le programme</h2><Icon name="marker" size={18} className="muted" /></div>
        {usages.map((usage, index) => <div key={`${usage.week}-${usage.day}-${usage.section}-${index}`} className="row-between"><span className="small">Semaine {usage.week} - Jour {usage.day}</span><span className="caption">{usage.section}</span></div>)}
      </section>
      {source ? <Link href={source} target="_blank" rel="noreferrer" className="button button-ghost">Ouvrir la source secondaire <Icon name="arrow-up-right-from-square" size={17} /></Link> : null}
    </div>
  );
}
