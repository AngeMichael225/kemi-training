import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { seedKemiProgram, type SeedCounts } from "./seed-supabase";
import { isLocalSupabaseUrl, parseEnv, redactSecrets, renderEnvFile } from "./sync-supabase-env";

const LOCAL_EMAIL = "kemi.local@example.test";
const EXPECTED: SeedCounts = { weeks: 4, days: 12, items: 140, exercises: 33, media: 27, tests: 3 };
const ENV_PATH = path.join(process.cwd(), ".env.local");

function run(command: string, args: string[], timeout?: number): string {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    shell: process.platform === "win32",
    timeout,
  });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  if (result.error || result.status !== 0) {
    throw new Error(redactSecrets(output).trim() || `${command} ${args.join(" ")} failed`);
  }
  return result.stdout ?? "";
}

function dockerIsReady(): boolean {
  const result = spawnSync("docker", ["info", "--format", "{{.ServerVersion}}"], {
    encoding: "utf8",
    shell: process.platform === "win32",
    timeout: 20_000,
  });
  return result.status === 0 && Boolean(result.stdout?.trim());
}

function writeEnv(statusEnv: string, extras: Record<string, string> = {}): void {
  const existing = existsSync(ENV_PATH) ? readFileSync(ENV_PATH, "utf8") : "";
  const next = renderEnvFile(existing, statusEnv, extras);
  if (next === existing) return;
  if (existing) copyFileSync(ENV_PATH, `${ENV_PATH}.bak`);
  writeFileSync(ENV_PATH, next);
}

async function ensureLocalAthlete(url: string, serviceRoleKey: string): Promise<string> {
  if (!isLocalSupabaseUrl(url)) {
    throw new Error("Refusing to bootstrap: Supabase URL is not a local http://127.0.0.1 or http://localhost address.");
  }
  const supabase = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const created = await supabase.auth.admin.createUser({
    email: LOCAL_EMAIL,
    email_confirm: true,
    user_metadata: { display_name: "KEMI Local" },
  });
  if (created.data.user?.id) return created.data.user.id;

  for (let page = 1; page <= 5; page += 1) {
    const listed = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    const existing = listed.data.users.find((user) => user.email?.toLowerCase() === LOCAL_EMAIL);
    if (existing) return existing.id;
    if (listed.data.users.length < 200) break;
  }
  throw new Error("Could not create or find the local fixture user.");
}

async function assertCounts(url: string, serviceRoleKey: string, athleteId: string, counts: SeedCounts): Promise<void> {
  for (const [key, expected] of Object.entries(EXPECTED) as [keyof SeedCounts, number][]) {
    if (counts[key] !== expected) {
      throw new Error(`Seed file count for ${key} is ${counts[key]}, expected ${expected}.`);
    }
  }
  const supabase = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const program = await supabase.from("training_programs").select("id").eq("athlete_id", athleteId).limit(1).maybeSingle();
  if (program.error || !program.data) throw new Error("Seeded program was not found for the local athlete.");
  const weeks = await supabase.from("program_weeks").select("id", { count: "exact", head: true }).eq("program_id", program.data.id);
  const weekRows = await supabase.from("program_weeks").select("id").eq("program_id", program.data.id);
  const weekIds = (weekRows.data ?? []).map((week) => week.id);
  const days = await supabase.from("workout_days").select("id").in("program_week_id", weekIds);
  const dayIds = (days.data ?? []).map((day) => day.id);
  const sections = await supabase.from("workout_sections").select("id").in("workout_day_id", dayIds);
  const sectionIds = (sections.data ?? []).map((section) => section.id);
  const items = await supabase.from("workout_items").select("id", { count: "exact", head: true }).in("workout_section_id", sectionIds);
  const exercises = await supabase.from("exercises").select("id", { count: "exact", head: true }).is("owner_id", null);
  const media = await supabase.from("exercise_media").select("id", { count: "exact", head: true }).is("owner_id", null);
  const tests = await supabase.from("strength_test_templates").select("id", { count: "exact", head: true }).eq("program_id", program.data.id);
  const actual = {
    weeks: weeks.count ?? 0,
    days: dayIds.length,
    items: items.count ?? 0,
    exercises: exercises.count ?? 0,
    media: media.count ?? 0,
    tests: tests.count ?? 0,
  };
  for (const [key, expected] of Object.entries(EXPECTED) as [keyof SeedCounts, number][]) {
    if (actual[key] !== expected) throw new Error(`Database count for ${key} is ${actual[key]}, expected ${expected}.`);
  }
}

async function main(): Promise<void> {
  if (!dockerIsReady()) {
    console.error("Docker is not running. Start Docker Desktop and wait until `docker info` succeeds, then run pnpm supabase:bootstrap again.");
    process.exitCode = 1;
    return;
  }
  run("pnpm", ["exec", "supabase", "start"], 1_200_000);
  const statusEnv = run("pnpm", ["exec", "supabase", "status", "-o", "env"]);
  writeEnv(statusEnv);
  const env = parseEnv(readFileSync(ENV_PATH, "utf8"));
  const url = env.get("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceRoleKey) throw new Error("Local Supabase URL or service role key is missing from the status output.");
  const athleteId = await ensureLocalAthlete(url, serviceRoleKey);
  writeEnv(statusEnv, { KEMI_USER_ID: athleteId });
  const counts = await seedKemiProgram({ url, serviceRoleKey, athleteId });
  await assertCounts(url, serviceRoleKey, athleteId, counts);
  run("pnpm", ["exec", "tsx", "scripts/generate-db-types.ts"]);
  console.log("Local Supabase bootstrap completed. Fixture user, KEMI seed, and database types are ready.");
}

const entry = process.argv[1] ?? "";
if (entry.includes("bootstrap-local-supabase")) {
  main().catch((error: unknown) => {
    console.error(redactSecrets(error instanceof Error ? error.message : "Bootstrap failed."));
    process.exitCode = 1;
  });
}
