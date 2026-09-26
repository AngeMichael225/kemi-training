import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ExerciseMediaSeed } from "@/lib/training-model";

vi.mock("@/lib/env", () => ({
  hasSupabaseBrowserEnv: vi.fn(() => false),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(),
}));

import { hasSupabaseBrowserEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/client";
import {
  LOCAL_ATHLETE_SCOPE,
  MAX_MEDIA_BYTES,
  classifyCloudError,
  getPersonalMedia,
  isQuotaExceededError,
  listPersonalMediaForOwner,
  mediaRecordKey,
  messageForMediaError,
  mimeFromMediaType,
  personalMediaText,
  resetExerciseMediaStoreForTests,
  resolveExerciseMediaSource,
  savePersonalMedia,
  uploadExerciseMedia,
  validateMediaFile,
} from "@/lib/exercise-media-store";

const EXERCISE_A = "398cae0e-d0ad-5747-8e6c-f584636ec3e1";
const USER_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const USER_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const hasEnv = vi.mocked(hasSupabaseBrowserEnv);
const createClientMock = vi.mocked(createClient);

function pngFile(name = "demo.png", size = 64): File {
  return new File([new Uint8Array(size)], name, { type: "image/png" });
}

function seedMedia(overrides: Partial<ExerciseMediaSeed> = {}): ExerciseMediaSeed {
  return {
    id: "m1",
    exercise_id: EXERCISE_A,
    media_type: "image",
    storage_path: null,
    external_url: null,
    original_source_url: null,
    attribution: null,
    alt_text: null,
    sort_order: 0,
    is_primary: true,
    status: "seed",
    source_sheet: "seed",
    source_cell: "A1",
    ...overrides,
  };
}

describe("exercise media validation and errors", () => {
  it("rejects unsupported MIME and oversized files", () => {
    expect(validateMediaFile({ type: "text/plain", size: 10 })).toBe("unsupported_mime");
    expect(validateMediaFile({ type: "image/png", size: MAX_MEDIA_BYTES + 1 })).toBe("file_too_large");
    expect(validateMediaFile({ type: "image/webp", size: 1024 })).toBeNull();
  });

  it("classifies storage, network, and metadata failures", () => {
    expect(classifyCloudError({ message: "Payload too large", statusCode: "413" }, "upload")).toBe("storage_quota");
    expect(classifyCloudError({ message: "Failed to fetch" }, "network")).toBe("cloud_network");
    expect(classifyCloudError({ message: "duplicate" }, "metadata")).toBe("metadata_insert");
    expect(classifyCloudError({ message: "mime type not allowed" }, "upload")).toBe("unsupported_mime");
  });

  it("maps quota detection and UX copy", () => {
    expect(isQuotaExceededError({ name: "QuotaExceededError" })).toBe(true);
    expect(messageForMediaError("unsupported_mime")).toMatch(/JPEG|PNG|WebP|GIF|MP4/i);
    expect(messageForMediaError("file_too_large")).toMatch(/24 Mo/);
    expect(messageForMediaError("local_quota")).toMatch(/Espace local/i);
    expect(messageForMediaError("unauthenticated_cloud", { localSaved: true })).toMatch(/Connecte-toi/i);
    expect(messageForMediaError("storage_quota", { localSaved: true })).toMatch(/quota|taille/i);
    expect(messageForMediaError("cloud_network", { localSaved: true })).toMatch(/réseau/i);
    expect(messageForMediaError("metadata_insert", { localSaved: true })).toMatch(/fiche cloud/i);
  });
});

describe("exercise media owner-scoped persistence", () => {
  beforeEach(async () => {
    hasEnv.mockReturnValue(false);
    await resetExerciseMediaStoreForTests();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("keys records by owner scope and exercise id", () => {
    expect(mediaRecordKey(LOCAL_ATHLETE_SCOPE, EXERCISE_A)).toBe(`local-athlete:${EXERCISE_A}`);
    expect(mediaRecordKey(USER_A, EXERCISE_A)).not.toBe(mediaRecordKey(USER_B, EXERCISE_A));
  });

  it("persists personal media for the same owner after reload semantics", async () => {
    const blob = new Blob(["png-bytes"], { type: "image/png" });
    await savePersonalMedia(LOCAL_ATHLETE_SCOPE, EXERCISE_A, blob, "demo.png", "image/png");
    const stored = await getPersonalMedia(LOCAL_ATHLETE_SCOPE, EXERCISE_A);
    expect(stored?.mimeType).toBe("image/png");
    expect(stored?.ownerScope).toBe(LOCAL_ATHLETE_SCOPE);
    expect(personalMediaText(stored)).toBe("png-bytes");
  });

  it("isolates User A media from User B lookups", async () => {
    await savePersonalMedia(USER_A, EXERCISE_A, new Blob(["a"], { type: "image/jpeg" }), "a.jpg", "image/jpeg");
    await savePersonalMedia(USER_B, EXERCISE_A, new Blob(["b"], { type: "image/jpeg" }), "b.jpg", "image/jpeg");

    expect(personalMediaText(await getPersonalMedia(USER_A, EXERCISE_A))).toBe("a");
    expect(personalMediaText(await getPersonalMedia(USER_B, EXERCISE_A))).toBe("b");
    expect(await getPersonalMedia(USER_A, "missing")).toBeUndefined();

    const listedA = await listPersonalMediaForOwner(USER_A);
    expect(listedA).toHaveLength(1);
    expect(listedA[0]?.fileName).toBe("a.jpg");
  });

  it("uploads locally in review mode without cloud", async () => {
    hasEnv.mockReturnValue(false);
    const outcome = await uploadExerciseMedia(EXERCISE_A, pngFile());
    expect(outcome.ok).toBe(true);
    expect(outcome.localSaved).toBe(true);
    expect(outcome.cloudSynced).toBe(false);
    expect(outcome.message).toMatch(/enregistré sur cet appareil/i);
    expect(await getPersonalMedia(LOCAL_ATHLETE_SCOPE, EXERCISE_A)).toBeTruthy();
  });

  it("reports unauthenticated cloud when Supabase env exists without a session", async () => {
    hasEnv.mockReturnValue(true);
    createClientMock.mockReturnValue({
      auth: {
        getUser: async () => ({ data: { user: null }, error: null }),
      },
      storage: { from: () => ({ upload: vi.fn(), remove: vi.fn(), createSignedUrl: vi.fn() }) },
      from: vi.fn(),
    } as never);

    const outcome = await uploadExerciseMedia(EXERCISE_A, pngFile());
    expect(outcome.ok).toBe(false);
    expect(outcome.localSaved).toBe(true);
    if (!outcome.ok) expect(outcome.code).toBe("unauthenticated_cloud");
    expect(outcome.message).toMatch(/Connecte-toi/i);
  });

  it("cleans up Storage when metadata insert fails", async () => {
    hasEnv.mockReturnValue(true);
    const remove = vi.fn(async () => ({ data: null, error: null }));
    const upload = vi.fn(async () => ({ data: { path: "x" }, error: null }));
    createClientMock.mockReturnValue({
      auth: {
        getUser: async () => ({ data: { user: { id: USER_A } }, error: null }),
      },
      storage: {
        from: () => ({ upload, remove, createSignedUrl: vi.fn() }),
      },
      from: () => ({
        insert: async () => ({ error: { message: "insert failed" } }),
      }),
    } as never);

    const outcome = await uploadExerciseMedia(EXERCISE_A, pngFile());
    expect(outcome.localSaved).toBe(true);
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) expect(outcome.code).toBe("metadata_insert");
    expect(remove).toHaveBeenCalled();
  });

  it("classifies storage quota rejection after local save", async () => {
    hasEnv.mockReturnValue(true);
    createClientMock.mockReturnValue({
      auth: {
        getUser: async () => ({ data: { user: { id: USER_A } }, error: null }),
      },
      storage: {
        from: () => ({
          upload: async () => ({ data: null, error: { message: "Payload too large", statusCode: "413" } }),
          remove: vi.fn(),
          createSignedUrl: vi.fn(),
        }),
      },
      from: vi.fn(),
    } as never);

    const outcome = await uploadExerciseMedia(EXERCISE_A, pngFile());
    expect(outcome.localSaved).toBe(true);
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) expect(outcome.code).toBe("storage_quota");
  });
});

describe("exercise media priority and signed URL contract", () => {
  it("prefers local, then cloud, then coach direct, then reference", () => {
    const coach = seedMedia({ external_url: "https://coach.example/demo.webp" });
    const reference = seedMedia({
      id: "m2",
      media_type: "external_reference",
      external_url: "https://coach.example/ref",
    });

    expect(
      resolveExerciseMediaSource({
        local: { url: "blob:local", mimeType: "image/png" },
        cloud: { url: "https://signed/cloud", mimeType: "image/jpeg" },
        seed: [coach, reference],
      }).kind,
    ).toBe("personal_local");

    expect(
      resolveExerciseMediaSource({
        local: null,
        cloud: { url: "https://signed/cloud", mimeType: "image/jpeg" },
        seed: [coach, reference],
      }).kind,
    ).toBe("personal_cloud");

    expect(
      resolveExerciseMediaSource({
        local: null,
        cloud: null,
        seed: [coach, reference],
      }).kind,
    ).toBe("coach_direct");

    expect(
      resolveExerciseMediaSource({
        local: null,
        cloud: null,
        seed: [reference],
      }).kind,
    ).toBe("source_reference");
  });

  it("never invents coach media URLs", () => {
    expect(
      resolveExerciseMediaSource({
        local: null,
        cloud: null,
        seed: [seedMedia({ media_type: "image", external_url: null })],
      }).kind,
    ).toBe("empty");
  });

  it("maps media types for signed cloud rendering", () => {
    expect(mimeFromMediaType("video")).toBe("video/mp4");
    expect(mimeFromMediaType("animated_image")).toBe("image/gif");
  });
});
