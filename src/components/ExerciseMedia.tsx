"use client";

import Image from "next/image";
import Link from "next/link";
import { Dumbbell, ExternalLink, Pause, Play } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ExerciseMediaSeed } from "@/lib/training-model";
import { getCustomMedia } from "@/lib/offline-db";
import { hasSupabaseBrowserEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/client";

interface LocalMedia {
  url: string;
  mimeType: string;
}

export function ExerciseMedia({
  exerciseId,
  media,
  alt,
  priority = false,
}: {
  exerciseId: string;
  media: ExerciseMediaSeed[];
  alt: string;
  priority?: boolean;
}) {
  const [local, setLocal] = useState<LocalMedia | null>(null);
  const [cloud, setCloud] = useState<LocalMedia | null>(null);
  const [playing, setPlaying] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    void getCustomMedia(exerciseId).then(async (custom) => {
      if (cancelled) return;
      if (custom) {
        objectUrl = URL.createObjectURL(custom.blob);
        setLocal({ url: objectUrl, mimeType: custom.mimeType });
        return;
      }
      if (!hasSupabaseBrowserEnv()) return;
      try {
        const supabase = createClient();
        const { data: auth } = await supabase.auth.getUser();
        if (!auth.user || cancelled) return;
        const { data: mediaRow } = await supabase
          .from("exercise_media")
          .select("storage_path,media_type")
          .eq("exercise_id", exerciseId)
          .eq("owner_id", auth.user.id)
          .eq("is_primary", true)
          .not("storage_path", "is", null)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!mediaRow?.storage_path || cancelled) return;
        const signed = await supabase.storage.from("exercise-media").createSignedUrl(mediaRow.storage_path, 3600);
        if (!signed.data?.signedUrl || cancelled) return;
        const mimeType = mediaRow.media_type === "video" ? "video/mp4" : mediaRow.media_type === "animated_image" ? "image/gif" : "image/webp";
        setCloud({ url: signed.data.signedUrl, mimeType });
      } catch {
        // Seed media remains available when cloud media lookup fails.
      }
    });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [exerciseId]);

  const direct = useMemo(
    () => media.find((item) => item.media_type !== "external_reference" && item.external_url),
    [media],
  );
  const reference = media.find((item) => item.media_type === "external_reference" && item.external_url);

  async function toggleVideo() {
    const element = videoRef.current;
    if (!element) return;
    if (element.paused) await element.play();
    else element.pause();
    setPlaying(!element.paused);
  }

  const owned = local ?? cloud;

  if (owned?.mimeType.startsWith("video/")) {
    return (
      <div className="media-frame">
        <video ref={videoRef} src={owned.url} playsInline muted loop autoPlay preload="metadata" aria-label={alt} />
        <div className="media-overlay"><span className="pill pill-accent">{local ? "Média personnel" : "Média synchronisé"}</span><button type="button" className="icon-button" onClick={() => void toggleVideo()} aria-label={playing ? "Mettre en pause" : "Lire"}>{playing ? <Pause size={18} /> : <Play size={18} />}</button></div>
      </div>
    );
  }

  if (owned) {
    return <div className="media-frame"><img src={owned.url} alt={alt} /><div className="media-overlay"><span className="pill pill-accent">{local ? "Média personnel" : "Média synchronisé"}</span></div></div>;
  }

  if (direct?.external_url) {
    if (direct.media_type === "video") {
      return (
        <div className="media-frame">
          <video ref={videoRef} src={direct.external_url} playsInline muted loop autoPlay preload="metadata" aria-label={alt} />
          <div className="media-overlay"><span className="pill">Source coach</span><button type="button" className="icon-button" onClick={() => void toggleVideo()} aria-label={playing ? "Mettre en pause" : "Lire"}>{playing ? <Pause size={18} /> : <Play size={18} />}</button></div>
        </div>
      );
    }
    if (direct.media_type === "animated_image") {
      return (
        <div className="media-frame">
          <img src={direct.external_url} alt={alt} loading={priority ? "eager" : "lazy"} />
          <div className="media-overlay"><span className="pill">Démo animée</span></div>
        </div>
      );
    }
    return (
      <div className="media-frame">
        <Image src={direct.external_url} alt={alt} fill sizes="(max-width: 760px) 100vw, 720px" priority={priority} style={{ objectFit: "cover" }} />
        <div className="media-overlay"><span className="pill">Démonstration</span></div>
      </div>
    );
  }

  return (
    <div className="media-frame" style={{ display: "grid", placeItems: "center", padding: 22 }}>
      <div className="stack" style={{ justifyItems: "center", textAlign: "center", maxWidth: 300 }}>
        <span className="workout-index workout-index-accent"><Dumbbell size={23} /></span>
        <div><strong>Média personnel recommande</strong><p className="caption" style={{ margin: "6px 0 0" }}>Le fichier source fournit une page de reference, pas un média direct reutilisable.</p></div>
        {reference?.external_url ? <Link href={reference.external_url} target="_blank" rel="noreferrer" className="button button-ghost" style={{ minHeight: 44 }}>Référence source <ExternalLink size={15} /></Link> : null}
      </div>
    </div>
  );
}
