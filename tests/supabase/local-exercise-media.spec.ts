import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import seed from "../../seed/kemi-training-program.json";

const EMAIL_B = "kemi.media-other@example.test";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required. Run pnpm supabase:bootstrap first.`);
  return value;
}

test.describe("Supabase exercise-media isolation", () => {
  test("private bucket refuses public URLs; User B cannot list/download/update/delete User A media", async () => {
    const url = requiredEnv("NEXT_PUBLIC_SUPABASE_URL");
    const anonKey = requiredEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
    const serviceKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

    const exercise = seed.exercises[0];
    if (!exercise) throw new Error("Seed exercise missing.");

    const created = await admin.auth.admin.createUser({
      email: EMAIL_B,
      email_confirm: true,
    });
    const userB =
      created.data.user ??
      (await admin.auth.admin.listUsers({ page: 1, perPage: 200 })).data.users.find((user) => user.email === EMAIL_B);
    if (!userB) throw new Error("Could not create secondary media user.");

    const userA = (await admin.auth.admin.listUsers({ page: 1, perPage: 200 })).data.users.find(
      (user) => user.email === "kemi.local@example.test",
    );
    if (!userA) throw new Error("Local athlete user A missing. Run pnpm supabase:bootstrap.");

    const pathA = `${userA.id}/${exercise.id}/wave04-isolation.jpg`;
    const bytes = Buffer.from(
      "/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBxAQEBAQEBAVFRUVFRUVFRUVFRUWFxUVFRUYHSggGBolGxUVITEhJSkrLi4uFx8zODMtNygtLisBCgoKDg0OGxAQGy0lHyUtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLf/AABEIAAEAAQMBIgACEQEDEQH/xAAbAAACAwEBAQAAAAAAAAAAAAADBAECBQYAB//EAD0QAAIBAgQDBgQFAwUAAAAAAAECAwQRAAUSITFBBhNRYXGBIpEUMqGxwdHwQlLh8RUjcoKS/8QAGQEAAwEBAQAAAAAAAAAAAAAAAAECAwQF/8QAJBEAAgICAgMAAwEAAAAAAAAAAAECEQMhEjFBBFEiMkJhkf/aAAwDAQACEQMRAD8A9o0UUVABRRRQAUUUUAFFFFABRRRQB//Z",
      "base64",
    );

    await admin.storage.from("exercise-media").remove([pathA]).catch(() => undefined);
    const uploaded = await admin.storage.from("exercise-media").upload(pathA, bytes, {
      contentType: "image/jpeg",
      upsert: true,
    });
    expect(uploaded.error).toBeNull();

    await admin.from("exercise_media").delete().eq("storage_path", pathA);
    const mediaInsert = await admin.from("exercise_media").insert({
      exercise_id: exercise.id,
      owner_id: userA.id,
      media_type: "image",
      storage_path: pathA,
      alt_text: "isolation",
      is_primary: true,
      sort_order: 0,
      status: "owned",
    });
    expect(mediaInsert.error).toBeNull();

    const bucket = await admin.storage.getBucket("exercise-media");
    expect(bucket.data?.public).toBe(false);

    const publicUrl = admin.storage.from("exercise-media").getPublicUrl(pathA).data.publicUrl;
    const publicFetch = await fetch(publicUrl);
    expect(publicFetch.ok).toBe(false);

    const signedA = await admin.storage.from("exercise-media").createSignedUrl(pathA, 60);
    expect(signedA.data?.signedUrl).toBeTruthy();
    expect(signedA.data!.signedUrl).not.toMatch(/\/object\/public\//);
    const signedFetch = await fetch(signedA.data!.signedUrl);
    expect(signedFetch.ok).toBe(true);

    const linkB = await admin.auth.admin.generateLink({ type: "magiclink", email: EMAIL_B });
    const hashed = linkB.data.properties?.hashed_token;
    expect(hashed).toBeTruthy();
    const verifiedB = await createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    }).auth.verifyOtp({
      type: "magiclink",
      token_hash: hashed!,
    });
    expect(verifiedB.data.session).toBeTruthy();

    const clientB = createClient(url, anonKey, {
      global: {
        headers: { Authorization: `Bearer ${verifiedB.data.session!.access_token}` },
      },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const listB = await clientB.storage.from("exercise-media").list(userA.id);
    expect((listB.data ?? []).length).toBe(0);

    const downloadB = await clientB.storage.from("exercise-media").download(pathA);
    expect(downloadB.data).toBeNull();
    expect(downloadB.error).toBeTruthy();

    const updateB = await clientB.storage.from("exercise-media").upload(pathA, bytes, {
      contentType: "image/jpeg",
      upsert: true,
    });
    expect(updateB.error).toBeTruthy();

    await clientB.storage.from("exercise-media").remove([pathA]);
    const stillThere = await admin.storage.from("exercise-media").download(pathA);
    expect(stillThere.data).toBeTruthy();

    const metaB = await clientB.from("exercise_media").select("id").eq("storage_path", pathA);
    expect(metaB.data ?? []).toHaveLength(0);

    const stealPrefix = await clientB.storage
      .from("exercise-media")
      .upload(`${userA.id}/stolen.jpg`, bytes, { contentType: "image/jpeg", upsert: false });
    expect(stealPrefix.error).toBeTruthy();

    await admin.storage.from("exercise-media").remove([pathA]).catch(() => undefined);
    await admin.from("exercise_media").delete().eq("storage_path", pathA);
  });
});
