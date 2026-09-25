import { describe, expect, it } from "vitest";
import { safeInternalPath } from "@/lib/supabase/redirect";

describe("auth confirm redirects", () => {
  it("rejects an absolute external next URL", () => {
    expect(safeInternalPath("https://evil.example")).toBe("/today");
  });

  it("rejects a protocol-relative next URL", () => {
    expect(safeInternalPath("//evil.example")).toBe("/today");
  });

  it("rejects a slash-backslash next URL", () => {
    expect(safeInternalPath("/\\evil.example")).toBe("/today");
  });

  it("rejects a next URL that hides a host behind a tab or newline", () => {
    expect(safeInternalPath("/\t/evil.example")).toBe("/today");
    expect(safeInternalPath("/\n/evil.example")).toBe("/today");
    expect(safeInternalPath("/\r/evil.example")).toBe("/today");
  });

  it("keeps an internal path", () => {
    expect(safeInternalPath("/plan")).toBe("/plan");
  });
});
