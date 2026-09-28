"use client";

import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/icons/Icon";
import { useEffect, useRef, useState } from "react";
import type { ExerciseMediaSeed } from "@/lib/training-model";
import {
  EXERCISE_MEDIA_CHANGED_EVENT,
  LOCAL_ATHLETE_SCOPE,
  fetchOwnedCloudMedia,
  getExerciseMediaLocal,
  resolveExerciseMediaSource,
  resolveMediaOwnerScope,
} from "@/lib/exercise-media-store";

interface OwnedMedia {
  url: string;
  mimeType: string;
  source: "local" | "cloud";
}

export function ExerciseMedia({
  exerciseId,
  media,
  alt,
  priority = false,
  revision = 0,
}: {
  exerciseId: string;
  media: ExerciseMediaSeed[];
  alt: string;
  priority?: boolean;
  revision?: number;
}) {
  const [owned, setOwned] = useState<OwnedMedia | null>(null);
  const [playing, setPlaying] = useState(true);
  const [reloadToken, setReloadToken] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    function onChanged(event: Event) {
      const detail = (event as CustomEvent<{ exerciseId?: string }>).detail;
      if (detail?.exerciseId && detail.exerciseId !== exerciseId) return;
      setReloadToken((value) => value + 1);
    }
    window.addEventListener(EXERCISE_MEDIA_CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(EXERCISE_MEDIA_CHANGED_EVENT, onChanged);
  }, [exerciseId]);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    void (async () => {
      try {
        const ownerScope = await resolveMediaOwnerScope();
        if (cancelled) return;

        const local = await getExerciseMediaLocal(ownerScope, exerciseId);
        if (cancelled) return;
        if (local) {
          objectUrl = URL.createObjectURL(local.blob);
          setOwned({ url: objectUrl, mimeType: local.mimeType, source: "local" });
          return;
        }

        if (ownerScope !== LOCAL_ATHLETE_SCOPE) {
          const cloud = await fetchOwnedCloudMedia(exerciseId, ownerScope);
          if (cancelled) return;
          if (cloud) {
            setOwned({ url: cloud.url, mimeType: cloud.mimeType, source: "cloud" });
            return;
          }
        }

        if (!cancelled) setOwned(null);
      } catch {
        if (!cancelled) setOwned(null);
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [exerciseId, revision, reloadToken]);

  async function toggleVideo() {
    const element = videoRef.current;
    if (!element) return;
    if (element.paused) await element.play();
    else element.pause();
    setPlaying(!element.paused);
  }

  const resolved = resolveExerciseMediaSource({
    local: owned?.source === "local" ? owned : null,
    cloud: owned?.source === "cloud" ? owned : null,
    seed: media,
  });

  if (resolved.kind === "personal_local" || resolved.kind === "personal_cloud") {
    const label = resolved.kind === "personal_local" ? "Média personnel" : "Média synchronisé";
    const source = resolved.kind === "personal_local" ? "local" : "cloud";
    if (resolved.mimeType.startsWith("video/")) {
      return (
        <div className="media-frame" data-testid="exercise-media-frame" data-media-source={source}>
          <video ref={videoRef} src={resolved.url} playsInline muted loop autoPlay preload="metadata" aria-label={alt} />
          <div className="media-overlay">
            <span className="pill pill-accent">{label}</span>
            <button type="button" className="icon-button" onClick={() => void toggleVideo()} aria-label={playing ? "Mettre en pause" : "Lire"}>
              {playing ? <Icon name="pause" size={18} /> : <Icon name="play" size={18} />}
            </button>
          </div>
        </div>
      );
    }
    return (
      <div className="media-frame" data-testid="exercise-media-frame" data-media-source={source}>
        <img src={resolved.url} alt={alt} />
        <div className="media-overlay">
          <span className="pill pill-accent">{label}</span>
        </div>
      </div>
    );
  }

  if (resolved.kind === "coach_direct") {
    const direct = resolved.media;
    if (direct.media_type === "video" && direct.external_url) {
      return (
        <div className="media-frame" data-testid="exercise-media-frame" data-media-source="coach">
          <video ref={videoRef} src={direct.external_url} playsInline muted loop autoPlay preload="metadata" aria-label={alt} />
          <div className="media-overlay">
            <span className="pill">Source coach</span>
            <button type="button" className="icon-button" onClick={() => void toggleVideo()} aria-label={playing ? "Mettre en pause" : "Lire"}>
              {playing ? <Icon name="pause" size={18} /> : <Icon name="play" size={18} />}
            </button>
          </div>
        </div>
      );
    }
    if (direct.media_type === "animated_image" && direct.external_url) {
      return (
        <div className="media-frame" data-testid="exercise-media-frame" data-media-source="coach">
          <img src={direct.external_url} alt={alt} loading={priority ? "eager" : "lazy"} />
          <div className="media-overlay">
            <span className="pill">Démo animée</span>
          </div>
        </div>
      );
    }
    if (direct.external_url) {
      return (
        <div className="media-frame" data-testid="exercise-media-frame" data-media-source="coach">
          <Image src={direct.external_url} alt={alt} fill sizes="(max-width: 760px) 100vw, 720px" priority={priority} style={{ objectFit: "cover" }} />
          <div className="media-overlay">
            <span className="pill">Démonstration</span>
          </div>
        </div>
      );
    }
  }

  const reference = resolved.kind === "source_reference" ? resolved.media : null;
  return (
    <div
      className="media-frame"
      data-testid="exercise-media-frame"
      data-media-source={reference ? "reference" : "empty"}
      style={{ display: "grid", placeItems: "center", padding: 22 }}
    >
      <div className="stack" style={{ justifyItems: "center", textAlign: "center", maxWidth: 300 }}>
        <span className="workout-index workout-index-accent">
          <Icon name="dumbbell-fitness" size={23} />
        </span>
        <div>
          <strong>Média personnel recommande</strong>
          <p className="caption" style={{ margin: "6px 0 0" }}>
            Le fichier source fournit une page de reference, pas un média direct reutilisable.
          </p>
        </div>
        {reference?.external_url ? (
          <Link href={reference.external_url} target="_blank" rel="noreferrer" className="button button-ghost" style={{ minHeight: 44 }}>
            Référence source <Icon name="arrow-up-right-from-square" size={15} />
          </Link>
        ) : null}
      </div>
    </div>
  );
}
