"use client";

import { useState } from "react";
import { ExerciseMedia } from "@/components/ExerciseMedia";
import { MediaUpload } from "@/components/MediaUpload";
import type { ExerciseMediaSeed } from "@/lib/training-model";

export function ExerciseMediaManager({
  exerciseId,
  media,
  alt,
}: {
  exerciseId: string;
  media: ExerciseMediaSeed[];
  alt: string;
}) {
  const [revision, setRevision] = useState(0);

  return (
    <>
      <ExerciseMedia exerciseId={exerciseId} media={media} alt={alt} priority revision={revision} />
      <section className="card card-pad stack">
        <h2 className="h2">Mon media</h2>
        <p className="small muted" style={{ margin: 0 }}>
          Ajoute ta propre photo, GIF, WebP ou MP4. Elle devient prioritaire sur cet appareil et, si Supabase est
          configure, est envoyee dans Storage.
        </p>
        <MediaUpload exerciseId={exerciseId} onSaved={() => setRevision((value) => value + 1)} />
      </section>
    </>
  );
}
