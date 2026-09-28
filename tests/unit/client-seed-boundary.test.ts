import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("client training seed boundary", () => {
  it("does not import the full seed module from interactive clients", () => {
    const progress = readFileSync("src/components/ProgressClient.tsx", "utf8");
    const session = readFileSync("src/components/SessionRunner.tsx", "utf8");
    expect(progress).not.toContain("training-data");
    expect(session).not.toContain("training-data");
    expect(session).toContain('from "@/lib/workout-sequence"');
    expect(readFileSync("src/app/(app)/progress/page.tsx", "utf8")).toContain("exerciseNames");
  });
});
