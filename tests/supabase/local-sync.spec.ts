import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import seed from "../../seed/kemi-training-program.json";
import { sendMagicLink } from "./mailpit";

const EMAIL = "kemi.local@example.test";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required. Run pnpm supabase:bootstrap first.`);
  return value;
}

async function signIn(page: Page) {
  const link = await sendMagicLink(page, EMAIL);
  await page.goto(link);
  await expect(page).toHaveURL(/\/today/);
}

test.describe("Supabase Local Sync", () => {
  test("persists an owned snapshot and rejects another athlete", async ({ page, playwright }) => {
    const url = requiredEnv("NEXT_PUBLIC_SUPABASE_URL");
    const serviceKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const day = seed.program.weeks[0]?.days[0];
    const item = day?.sections[0]?.items[0];
    if (!day || !item) throw new Error("Seed workout day is missing.");

    const intruder = await admin.auth.admin.createUser({
      email: "kemi.other@example.test",
      email_confirm: true,
    });
    const listed = intruder.data.user
      ? intruder.data.user
      : (await admin.auth.admin.listUsers({ page: 1, perPage: 200 })).data.users.find((user) => user.email === "kemi.other@example.test");
    if (!listed) throw new Error("Could not create the second local user.");

    const otherProgramId = "20000000-0000-4000-8000-000000000011";
    const otherWeekId = "20000000-0000-4000-8000-000000000021";
    const otherDayId = "20000000-0000-4000-8000-000000000031";
    const otherSectionId = "20000000-0000-4000-8000-000000000041";
    const otherItemId = "20000000-0000-4000-8000-000000000051";
    await admin.from("training_programs").upsert({ id: otherProgramId, athlete_id: listed.id, name: "Other program" });
    await admin.from("program_weeks").upsert({ id: otherWeekId, program_id: otherProgramId, week_number: 1 });
    await admin.from("workout_days").upsert({ id: otherDayId, program_week_id: otherWeekId, day_number: 1, title: "Other day" });
    await admin.from("workout_sections").upsert({ id: otherSectionId, workout_day_id: otherDayId, section_type: "strength", title: "Other" });
    await admin.from("workout_items").upsert({ id: otherItemId, workout_section_id: otherSectionId, exercise_id: item.exercise_id });

    await signIn(page);
    const sessionId = "20000000-0000-4000-8000-000000000072";
    const setId = "20000000-0000-4000-8000-000000000081";
    const snapshot = {
      type: "session_snapshot",
      payload: {
        id: sessionId,
        workoutDayId: day.id,
        startedAt: "2026-09-24T12:00:00.000Z",
        completedAt: null,
        status: "active",
        notes: "local sync",
        updatedAt: "2026-09-24T12:00:00.000Z",
        setLogs: [{
          id: setId,
          workoutItemId: item.id,
          setNumber: 1,
          targetReps: 8,
          actualReps: 8,
          targetWeight: 20,
          targetWeightUnit: "kg",
          actualWeight: 20,
          weightUnit: "kg",
          durationSec: null,
          rpe: null,
          completedAt: "2026-09-24T12:05:00.000Z",
        }],
      },
    };
    const saved = await page.request.post("/api/sync", { data: snapshot });
    expect(saved.status()).toBe(200);

    const stored = await admin.from("workout_sessions").select("id, workout_day_id").eq("id", sessionId).maybeSingle();
    expect(stored.data?.workout_day_id).toBe(day.id);
    const sets = await admin.from("session_sets").select("id").eq("id", setId).maybeSingle();
    expect(sets.data?.id).toBe(setId);

    const blocked = await page.request.post("/api/sync", {
      data: {
        ...snapshot,
        payload: { ...snapshot.payload, id: "20000000-0000-4000-8000-000000000073", workoutDayId: otherDayId, setLogs: [] },
      },
    });
    expect(blocked.status()).toBe(403);
    const absent = await admin.from("workout_sessions").select("id").eq("id", "20000000-0000-4000-8000-000000000073").maybeSingle();
    expect(absent.data).toBeNull();

    const blockedItem = await page.request.post("/api/sync", {
      data: {
        ...snapshot,
        payload: {
          ...snapshot.payload,
          id: sessionId,
          setLogs: [{ ...snapshot.payload.setLogs[0], id: "20000000-0000-4000-8000-000000000082", workoutItemId: otherItemId }],
        },
      },
    });
    expect(blockedItem.status()).toBe(403);

    const anonymous = await playwright.request.newContext({ baseURL: "http://localhost:3000" });
    const denied = await anonymous.post("/api/sync", { data: snapshot });
    expect(denied.status()).toBe(401);
    await anonymous.dispose();
  });
});
