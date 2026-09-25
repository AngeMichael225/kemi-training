import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { uiconPaths } from "@/components/icons/uicon-paths";
import { motionLoops, motionMoments } from "@/components/motion/moments";

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return full.endsWith(".ts") || full.endsWith(".tsx") ? [full] : [];
  });
}

describe("visual system", () => {
  it("keeps a single rounded regular icon family", () => {
    const names = Object.keys(uiconPaths);
    expect(names).toContain("home");
    expect(names).toContain("dumbbell-fitness");
    expect(names).toContain("calendar");
    expect(names).not.toContain("dumbbell");
    for (const pathData of Object.values(uiconPaths)) {
      expect(pathData.length).toBeGreaterThan(20);
    }
    const files = readdirSync(path.join(process.cwd(), "public/icons/uicons"));
    expect(files.sort()).toEqual(names.map((name) => `fi-rr-${name}.svg`).sort());
  });

  it("does not import lucide", () => {
    const offenders = sourceFiles(path.join(process.cwd(), "src")).filter((file) =>
      readFileSync(file, "utf8").includes("lucide-react"),
    );
    expect(offenders).toEqual([]);
  });

  it("limits motion to four local moments and loops only syncing", () => {
    expect(Object.keys(motionMoments).sort()).toEqual([
      "empty-progress",
      "rest-complete",
      "syncing",
      "workout-complete",
    ]);
    expect(motionLoops.syncing).toBe(true);
    expect(motionLoops["workout-complete"]).toBe(false);
    expect(motionLoops["rest-complete"]).toBe(false);
    expect(motionLoops["empty-progress"]).toBe(false);
  });
});
