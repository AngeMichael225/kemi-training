"use client";

import { useRef, useState } from "react";
import { ImagePlus, UploadCloud } from "lucide-react";
import { saveCustomMedia } from "@/lib/offline-db";
import { hasSupabaseBrowserEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/client";

const ACCEPT = "image/jpeg,image/png,image/webp,image/gif,video/mp4";
const MAX_BYTES = 24 * 1024 * 1024;

export function MediaUpload({ exerciseId, onSaved }: { exerciseId: string; onSaved?: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string>("");
  const [busy, setBusy] = useState(false);

  async function handleFile(file?: File) {
    if (!file) return;
    if (file.size > MAX_BYTES) {
      setStatus("Fichier trop volumineux (24 Mo max dans cette V1).");
      return;
    }
    setBusy(true);
    setStatus("Enregistrement...");
    await saveCustomMedia(exerciseId, file, file.name, file.type);

    if (hasSupabaseBrowserEnv()) {
      try {
        const supabase = createClient();
        const { data: auth } = await supabase.auth.getUser();
        const user = auth.user;
        if (user) {
          const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-");
          const storagePath = `${user.id}/${exerciseId}/${crypto.randomUUID()}-${safeName}`;
          const upload = await supabase.storage.from("exercise-media").upload(storagePath, file, { contentType: file.type, upsert: false });
          if (!upload.error) {
            await supabase.from("exercise_media").insert({
              exercise_id: exerciseId,
              owner_id: user.id,
              media_type: file.type.startsWith("video/") ? "video" : file.type === "image/gif" ? "animated_image" : "image",
              storage_path: storagePath,
              original_source_url: null,
              alt_text: "Démonstration personnelle",
              attribution: "Uploaded by athlete",
              is_primary: true,
              sort_order: 0,
              status: "owned",
            });
          }
        }
      } catch {
        // The local IndexedDB copy remains valid even when cloud upload is unavailable.
      }
    }

    setStatus(hasSupabaseBrowserEnv() ? "Média enregistré. Synchronisation cloud tentee." : "Média enregistré sur cet appareil.");
    setBusy(false);
    onSaved?.();
  }

  return (
    <div className="stack">
      <input ref={inputRef} type="file" accept={ACCEPT} hidden onChange={(event) => void handleFile(event.target.files?.[0])} />
      <button type="button" className="button button-secondary" onClick={() => inputRef.current?.click()} disabled={busy}>
        {busy ? <UploadCloud size={18} /> : <ImagePlus size={18} />}
        {busy ? "Enregistrement..." : "Ajouter mon media"}
      </button>
      {status ? <p className="caption" role="status" style={{ margin: 0 }}>{status}</p> : null}
    </div>
  );
}
