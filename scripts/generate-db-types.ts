import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

function run(): void {
  const result = spawnSync("pnpm", ["exec", "supabase", "gen", "types", "typescript", "--local", "--schema", "public"], {
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  if (result.status !== 0) {
    const detail = `${result.stderr ?? ""}\n${result.stdout ?? ""}`.replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "[redacted]");
    throw new Error(detail.trim() || "supabase gen types failed");
  }
  const output = result.stdout ?? "";
  if (!output.includes("export type Database")) {
    throw new Error("supabase gen types did not return a Database type.");
  }
  const destination = path.join(process.cwd(), "src", "lib", "supabase", "database.types.ts");
  mkdirSync(path.dirname(destination), { recursive: true });
  const normalized = output.replace(/\r\n/g, "\n");
  writeFileSync(destination, normalized.endsWith("\n") ? normalized : `${normalized}\n`);
}

if (process.argv[1] && process.argv[1].includes("generate-db-types")) {
  try {
    run();
  } catch (error: unknown) {
    console.error(error instanceof Error ? error.message : "Type generation failed.");
    process.exitCode = 1;
  }
}
