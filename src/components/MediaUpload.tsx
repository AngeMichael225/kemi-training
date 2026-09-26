"use client";

import { useRef, useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { ALLOWED_MEDIA_MIME_TYPES, uploadExerciseMedia } from "@/lib/exercise-media-store";

const ACCEPT = ALLOWED_MEDIA_MIME_TYPES.join(",");

export function MediaUpload({ exerciseId, onSaved }: { exerciseId: string; onSaved?: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string>("");
  const [busy, setBusy] = useState(false);

  async function handleFile(file?: File) {
    if (!file) return;
    setBusy(true);
    setStatus("Enregistrement...");
    try {
      const outcome = await uploadExerciseMedia(exerciseId, file);
      setStatus(outcome.message);
      if (outcome.localSaved) onSaved?.();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Impossible d'enregistrer le média sur cet appareil.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="stack">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        hidden
        data-testid="exercise-media-input"
        onChange={(event) => void handleFile(event.target.files?.[0])}
      />
      <button
        type="button"
        className="button button-secondary"
        data-testid="exercise-media-upload"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
      >
        {busy ? <Icon name="cloud-upload" size={18} /> : <Icon name="picture" size={18} />}
        {busy ? "Enregistrement..." : "Ajouter mon media"}
      </button>
      {status ? (
        <p className="caption" role="status" data-testid="exercise-media-status" style={{ margin: 0 }}>
          {status}
        </p>
      ) : null}
    </div>
  );
}
