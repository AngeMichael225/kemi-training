"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { uploadExerciseMedia } from "@/lib/exercise-media-store";

export function MediaUpload({ exerciseId, onSaved }: { exerciseId: string; onSaved?: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const onSavedRef = useRef(onSaved);
  onSavedRef.current = onSaved;

  async function handleFile(file?: File | null) {
    if (!file) return;
    setBusy(true);
    setStatus("Enregistrement...");
    try {
      const outcome = await uploadExerciseMedia(exerciseId, file);
      setStatus(outcome.message);
      if (outcome.localSaved) onSavedRef.current?.();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Impossible d'enregistrer le média sur cet appareil.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const handleFileRef = useRef(handleFile);
  handleFileRef.current = handleFile;

  // E2E hook — avoids accept= / hydration races with hidden file inputs under Chromium.
  useEffect(() => {
    const target = window as Window & { __kemiUploadExerciseMedia?: (file: File) => Promise<void> };
    target.__kemiUploadExerciseMedia = async (file: File) => {
      await handleFileRef.current(file);
    };
    return () => {
      delete target.__kemiUploadExerciseMedia;
    };
  }, [exerciseId]);

  return (
    <div className="stack">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,video/mp4"
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
      <p className="caption" role="status" data-testid="exercise-media-status" style={{ margin: 0 }} aria-live="polite">
        {status || "\u00a0"}
      </p>
    </div>
  );
}
