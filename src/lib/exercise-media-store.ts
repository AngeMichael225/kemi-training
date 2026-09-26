"use client";

import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { ExerciseMediaSeed } from "@/lib/training-model";
import { hasSupabaseBrowserEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/client";

/** Stable owner scope for local/review mode (no authenticated Supabase user). */
export const LOCAL_ATHLETE_SCOPE = "local-athlete";

export const EXERCISE_MEDIA_DB_NAME = "kemi-exercise-media-v1";
export const EXERCISE_MEDIA_STORE = "personalMedia";
export const EXERCISE_MEDIA_CHANGED_EVENT = "kemi:exercise-media-changed";

export const MAX_MEDIA_BYTES = 24 * 1024 * 1024;
export const MAX_EXERCISE_MEDIA_BYTES = MAX_MEDIA_BYTES;

export const ALLOWED_MEDIA_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
] as const;

export const ALLOWED_EXERCISE_MEDIA_MIME = ALLOWED_MEDIA_MIME_TYPES;

export type AllowedMediaMimeType = (typeof ALLOWED_MEDIA_MIME_TYPES)[number];

export type MediaErrorCode =
  | "unsupported_mime"
  | "file_too_large"
  | "local_quota"
  | "unauthenticated_cloud"
  | "storage_quota"
  | "cloud_network"
  | "metadata_insert"
  | "cloud_sync_failed";

/** Durable IndexedDB row — never store Blob (jsdom/IDB corrupt binary fields). */
interface StoredPersonalMediaRecord {
  key: string;
  ownerScope: string;
  exerciseId: string;
  byteValues: number[];
  fileName: string;
  mimeType: string;
  updatedAt: string;
}

/** Caller-facing record with a rebuilt Blob. */
export interface PersonalMediaRecord extends StoredPersonalMediaRecord {
  blob: Blob;
  /** Alias of byteValues for older callers. */
  bytes: number[];
}

export type OwnedExerciseMedia = PersonalMediaRecord;

interface ExerciseMediaDB extends DBSchema {
  personalMedia: {
    key: string;
    value: StoredPersonalMediaRecord;
    indexes: { "by-owner": string; "by-exercise": string };
  };
}

export type UploadExerciseMediaResult =
  | { ok: true; localSaved: true; cloudSynced: boolean; message: string }
  | { ok: false; localSaved: boolean; cloudSynced: false; code: MediaErrorCode; message: string };

let database: Promise<IDBPDatabase<ExerciseMediaDB>> | null = null;

export function mediaRecordKey(ownerScope: string, exerciseId: string): string {
  return `${ownerScope}:${exerciseId}`;
}

export const mediaRecordId = mediaRecordKey;

export function isAllowedMediaMimeType(mimeType: string): mimeType is AllowedMediaMimeType {
  return (ALLOWED_MEDIA_MIME_TYPES as readonly string[]).includes(mimeType);
}

export function validateMediaFile(
  file: Pick<File, "type" | "size">,
): Extract<MediaErrorCode, "unsupported_mime" | "file_too_large"> | null {
  if (!isAllowedMediaMimeType(file.type)) return "unsupported_mime";
  if (file.size > MAX_MEDIA_BYTES) return "file_too_large";
  return null;
}

export function mediaTypeFromMime(mimeType: string): "video" | "animated_image" | "image" {
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType === "image/gif") return "animated_image";
  return "image";
}

export function mimeFromMediaType(mediaType: string): string {
  if (mediaType === "video") return "video/mp4";
  if (mediaType === "animated_image") return "image/gif";
  return "image/webp";
}

export const mimeTypeFromMediaType = mimeFromMediaType;

export function isQuotaExceededError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { name?: string; message?: string; code?: number };
  if (candidate.name === "QuotaExceededError" || candidate.name === "NS_ERROR_DOM_QUOTA_REACHED") {
    return true;
  }
  if (candidate.code === 22 || candidate.code === 1014) return true;
  return typeof candidate.message === "string" && /quota/i.test(candidate.message);
}

export function classifyCloudError(
  error: { message?: string; statusCode?: string | number; status?: number } | string | null | undefined,
  phase: "upload" | "network" | "metadata" = "upload",
): MediaErrorCode {
  if (phase === "metadata") return "metadata_insert";
  if (phase === "network") return "cloud_network";

  const message = typeof error === "string" ? error.toLowerCase() : (error?.message ?? "").toLowerCase();
  const status = typeof error === "string" ? NaN : Number(error?.statusCode ?? error?.status ?? NaN);

  if (status === 413 || /payload|too large|entity too large|maximum allowed size|file size|size limit/.test(message)) {
    return "storage_quota";
  }
  if (status === 429 || /quota|storage.*limit|exceeded.*limit|insufficient storage/.test(message)) {
    return "storage_quota";
  }
  if (status === 0 || status >= 500 || /failed to fetch|network|timeout|offline|econn|enotfound|fetch failed/.test(message)) {
    return "cloud_network";
  }
  if (/mime|content.?type|not allowed|unsupported/.test(message)) {
    return "unsupported_mime";
  }
  return "cloud_sync_failed";
}

export const classifyStorageUploadError = classifyCloudError;

export function messageForMediaError(code: MediaErrorCode, options: { localSaved?: boolean } = {}): string {
  const localSaved = Boolean(options.localSaved);
  switch (code) {
    case "unsupported_mime":
      return "Format non pris en charge. Utilise JPEG, PNG, WebP, GIF ou MP4.";
    case "file_too_large":
      return "Fichier trop volumineux (24 Mo max).";
    case "local_quota":
      return "Espace local insuffisant. Libère de la place sur cet appareil, puis réessaie.";
    case "unauthenticated_cloud":
      return localSaved
        ? "Média enregistré sur cet appareil. Connecte-toi pour synchroniser vers le cloud."
        : "Connexion requise pour synchroniser le média vers le cloud.";
    case "storage_quota":
      return localSaved
        ? "Média enregistré sur cet appareil. Le cloud a refusé le fichier (quota ou taille)."
        : "Le cloud a refusé le fichier (quota ou taille).";
    case "cloud_network":
      return localSaved
        ? "Média enregistré sur cet appareil. La synchronisation cloud a échoué (réseau)."
        : "La synchronisation cloud a échoué (réseau).";
    case "metadata_insert":
      return localSaved
        ? "Média enregistré sur cet appareil. La fiche cloud n'a pas pu être créée ; l'objet Storage orphelin a été nettoyé si possible."
        : "La fiche cloud n'a pas pu être créée.";
    case "cloud_sync_failed":
      return localSaved
        ? "Média enregistré sur cet appareil. La synchronisation cloud a échoué."
        : "La synchronisation cloud a échoué.";
  }
}

export const exerciseMediaErrorMessage = messageForMediaError;
export const mediaUploadErrorMessage = messageForMediaError;

export function notifyExerciseMediaChanged(exerciseId: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EXERCISE_MEDIA_CHANGED_EVENT, { detail: { exerciseId } }));
}

function db(): Promise<IDBPDatabase<ExerciseMediaDB>> {
  if (!database) {
    database = openDB<ExerciseMediaDB>(EXERCISE_MEDIA_DB_NAME, 1, {
      upgrade(databaseInstance) {
        const store = databaseInstance.createObjectStore(EXERCISE_MEDIA_STORE, { keyPath: "key" });
        store.createIndex("by-owner", "ownerScope");
        store.createIndex("by-exercise", "exerciseId");
      },
    });
  }
  return database;
}

export async function resolveMediaOwnerScope(): Promise<string> {
  if (hasSupabaseBrowserEnv()) {
    try {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      if (data.user?.id) return data.user.id;
    } catch {
      // Fall through to the stable local athlete scope.
    }
  }
  return LOCAL_ATHLETE_SCOPE;
}

export const resolveMediaOwnerId = resolveMediaOwnerScope;

async function readBlobBytes(blob: Blob): Promise<Uint8Array> {
  const isBrokenObjectString = (bytes: Uint8Array) => {
    const decoded = new TextDecoder().decode(bytes);
    return decoded === "[object Blob]" || decoded === "[object File]";
  };

  // Prefer FileReader — most reliable across jsdom + real browsers for Blob/File binary.
  if (typeof FileReader !== "undefined") {
    try {
      const buffer = await new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as ArrayBuffer) ?? new ArrayBuffer(0));
        reader.onerror = () => reject(reader.error ?? new Error("Failed to read media bytes"));
        reader.readAsArrayBuffer(blob);
      });
      if (buffer.byteLength > 0) {
        const bytes = new Uint8Array(buffer);
        if (!isBrokenObjectString(bytes)) return bytes;
      }
    } catch {
      // Fall through to Response / arrayBuffer.
    }
  }

  if (typeof Response !== "undefined") {
    try {
      const buffer = await new Response(blob).arrayBuffer();
      if (buffer.byteLength > 0) {
        const bytes = new Uint8Array(buffer);
        if (!isBrokenObjectString(bytes)) return bytes;
      }
    } catch {
      // Fall through.
    }
  }

  if (typeof blob.arrayBuffer === "function") {
    const buffer = await blob.arrayBuffer();
    if (buffer.byteLength > 0) {
      const bytes = new Uint8Array(buffer);
      if (!isBrokenObjectString(bytes)) return bytes;
    }
  }

  throw new Error("Unable to read media bytes from Blob.");
}

function coerceByteValues(raw: unknown): number[] {
  if (Array.isArray(raw)) return raw.map((value) => Number(value) & 0xff);
  if (raw instanceof Uint8Array) return Array.from(raw);
  if (raw instanceof ArrayBuffer) return Array.from(new Uint8Array(raw));
  if (ArrayBuffer.isView(raw)) {
    return Array.from(new Uint8Array(raw.buffer, raw.byteOffset, raw.byteLength));
  }
  return [];
}

function toPersonalMediaRecord(stored: StoredPersonalMediaRecord): PersonalMediaRecord {
  const byteValues = coerceByteValues(stored.byteValues);
  const mimeType = stored.mimeType || "application/octet-stream";
  const bytes = Uint8Array.from(byteValues);
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return {
    ...stored,
    mimeType,
    byteValues,
    bytes: byteValues,
    blob: new Blob([copy.buffer.slice(copy.byteOffset, copy.byteOffset + copy.byteLength) as ArrayBuffer], {
      type: mimeType,
    }),
  };
}

export async function savePersonalMedia(
  ownerScope: string,
  exerciseId: string,
  blob: Blob,
  fileName: string,
  mimeType: string,
): Promise<PersonalMediaRecord> {
  if (!ownerScope.trim()) throw new Error("Exercise media owner scope is required.");
  const byteValues = Array.from(await readBlobBytes(blob));
  const stored: StoredPersonalMediaRecord = {
    key: mediaRecordKey(ownerScope, exerciseId),
    ownerScope,
    exerciseId,
    byteValues,
    fileName,
    mimeType,
    updatedAt: new Date().toISOString(),
  };
  try {
    await (await db()).put(EXERCISE_MEDIA_STORE, stored);
  } catch (error) {
    if (isQuotaExceededError(error)) {
      throw Object.assign(new Error(messageForMediaError("local_quota")), {
        name: "QuotaExceededError",
        mediaErrorCode: "local_quota" as const,
        cause: error,
      });
    }
    throw error;
  }
  notifyExerciseMediaChanged(exerciseId);
  return toPersonalMediaRecord(stored);
}

export const saveExerciseMediaLocal = savePersonalMedia;
export const saveOwnedExerciseMedia = savePersonalMedia;

export function personalMediaText(record: PersonalMediaRecord | undefined): string {
  if (!record) return "";
  return new TextDecoder().decode(new Uint8Array(coerceByteValues(record.byteValues ?? record.bytes)));
}

export async function getPersonalMedia(
  ownerScope: string,
  exerciseId: string,
): Promise<PersonalMediaRecord | undefined> {
  if (!ownerScope.trim()) return undefined;
  const record = await (await db()).get(EXERCISE_MEDIA_STORE, mediaRecordKey(ownerScope, exerciseId));
  if (!record || record.ownerScope !== ownerScope) return undefined;
  return toPersonalMediaRecord(record);
}

export const getExerciseMediaLocal = getPersonalMedia;
export const getOwnedExerciseMedia = getPersonalMedia;

export async function listPersonalMediaForOwner(ownerScope: string): Promise<PersonalMediaRecord[]> {
  const rows = await (await db()).getAllFromIndex(EXERCISE_MEDIA_STORE, "by-owner", ownerScope);
  return rows.map(toPersonalMediaRecord);
}

export const listExerciseMediaForOwner = listPersonalMediaForOwner;
export const listOwnedExerciseMedia = listPersonalMediaForOwner;

export async function deletePersonalMedia(ownerScope: string, exerciseId: string): Promise<void> {
  await (await db()).delete(EXERCISE_MEDIA_STORE, mediaRecordKey(ownerScope, exerciseId));
  notifyExerciseMediaChanged(exerciseId);
}

/** Signed-URL cloud lookup only. Never uses getPublicUrl. */
export async function fetchOwnedCloudMedia(
  exerciseId: string,
  ownerId: string,
): Promise<{ url: string; mimeType: string; storagePath: string } | null> {
  if (!hasSupabaseBrowserEnv()) return null;
  try {
    const supabase = createClient();
    const { data: mediaRow, error } = await supabase
      .from("exercise_media")
      .select("storage_path,media_type")
      .eq("exercise_id", exerciseId)
      .eq("owner_id", ownerId)
      .eq("is_primary", true)
      .not("storage_path", "is", null)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !mediaRow?.storage_path) return null;

    const signed = await supabase.storage.from("exercise-media").createSignedUrl(mediaRow.storage_path, 3600);
    if (!signed.data?.signedUrl) return null;
    return {
      url: signed.data.signedUrl,
      mimeType: mimeFromMediaType(mediaRow.media_type),
      storagePath: mediaRow.storage_path,
    };
  } catch {
    return null;
  }
}

async function syncPersonalMediaToCloud(
  userId: string,
  exerciseId: string,
  file: File,
): Promise<{ ok: true } | { ok: false; code: MediaErrorCode }> {
  const supabase = createClient();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-") || "media";
  const storagePath = `${userId}/${exerciseId}/${crypto.randomUUID()}-${safeName}`;

  let upload;
  try {
    upload = await supabase.storage.from("exercise-media").upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    });
  } catch (error) {
    return {
      ok: false,
      code: classifyCloudError(error instanceof Error ? error.message : String(error), "network"),
    };
  }

  if (upload.error) {
    return { ok: false, code: classifyCloudError(upload.error, "upload") };
  }

  const insert = await supabase.from("exercise_media").insert({
    exercise_id: exerciseId,
    owner_id: userId,
    media_type: mediaTypeFromMime(file.type),
    storage_path: storagePath,
    original_source_url: null,
    alt_text: "Démonstration personnelle",
    attribution: "Uploaded by athlete",
    is_primary: true,
    sort_order: 0,
    status: "owned",
  });

  if (insert.error) {
    try {
      await supabase.storage.from("exercise-media").remove([storagePath]);
    } catch {
      // Best-effort orphan cleanup.
    }
    return { ok: false, code: "metadata_insert" };
  }

  return { ok: true };
}

export async function uploadExerciseMedia(exerciseId: string, file: File): Promise<UploadExerciseMediaResult> {
  const validation = validateMediaFile(file);
  if (validation) {
    return {
      ok: false,
      localSaved: false,
      cloudSynced: false,
      code: validation,
      message: messageForMediaError(validation),
    };
  }

  const ownerScope = await resolveMediaOwnerScope();

  try {
    await savePersonalMedia(ownerScope, exerciseId, file, file.name, file.type);
  } catch (error) {
    if (isQuotaExceededError(error) || (error as { mediaErrorCode?: string }).mediaErrorCode === "local_quota") {
      return {
        ok: false,
        localSaved: false,
        cloudSynced: false,
        code: "local_quota",
        message: messageForMediaError("local_quota"),
      };
    }
    return {
      ok: false,
      localSaved: false,
      cloudSynced: false,
      code: "cloud_sync_failed",
      message: "Impossible d'enregistrer le média sur cet appareil.",
    };
  }

  if (!hasSupabaseBrowserEnv()) {
    return {
      ok: true,
      localSaved: true,
      cloudSynced: false,
      message: "Média enregistré sur cet appareil.",
    };
  }

  if (ownerScope === LOCAL_ATHLETE_SCOPE) {
    return {
      ok: false,
      localSaved: true,
      cloudSynced: false,
      code: "unauthenticated_cloud",
      message: messageForMediaError("unauthenticated_cloud", { localSaved: true }),
    };
  }

  try {
    const cloud = await syncPersonalMediaToCloud(ownerScope, exerciseId, file);
    if (cloud.ok) {
      return {
        ok: true,
        localSaved: true,
        cloudSynced: true,
        message: "Média enregistré localement et synchronisé dans Storage.",
      };
    }
    return {
      ok: false,
      localSaved: true,
      cloudSynced: false,
      code: cloud.code,
      message: messageForMediaError(cloud.code, { localSaved: true }),
    };
  } catch (error) {
    const code = classifyCloudError(error instanceof Error ? error.message : String(error), "network");
    return {
      ok: false,
      localSaved: true,
      cloudSynced: false,
      code,
      message: messageForMediaError(code, { localSaved: true }),
    };
  }
}

export async function closeExerciseMediaStoreForTests(): Promise<void> {
  const pending = database;
  database = null;
  if (!pending) return;
  try {
    (await pending).close();
  } catch {
    // Discard a failed open.
  }
}

export async function resetExerciseMediaStoreForTests(): Promise<void> {
  await closeExerciseMediaStoreForTests();
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(EXERCISE_MEDIA_DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error("IndexedDB delete failed"));
    request.onblocked = () => resolve();
  });
}

export type ResolvedMediaSource =
  | { kind: "personal_local"; url: string; mimeType: string }
  | { kind: "personal_cloud"; url: string; mimeType: string }
  | { kind: "coach_direct"; media: ExerciseMediaSeed }
  | { kind: "source_reference"; media: ExerciseMediaSeed }
  | { kind: "empty" };

/**
 * Render priority:
 * 1) personal local media
 * 2) authenticated personal cloud media (signed URL)
 * 3) direct coach media from the workbook seed
 * 4) source/reference fallback
 */
export function resolveExerciseMediaSource(input: {
  local: { url: string; mimeType: string } | null;
  cloud: { url: string; mimeType: string } | null;
  seed: ExerciseMediaSeed[];
}): ResolvedMediaSource {
  if (input.local) {
    return { kind: "personal_local", url: input.local.url, mimeType: input.local.mimeType };
  }
  if (input.cloud) {
    return { kind: "personal_cloud", url: input.cloud.url, mimeType: input.cloud.mimeType };
  }
  const direct = input.seed.find((item) => item.media_type !== "external_reference" && item.external_url);
  if (direct?.external_url) {
    return { kind: "coach_direct", media: direct };
  }
  const reference = input.seed.find((item) => item.media_type === "external_reference" && item.external_url);
  if (reference?.external_url) {
    return { kind: "source_reference", media: reference };
  }
  return { kind: "empty" };
}
