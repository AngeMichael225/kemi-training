import { describe, expect, it } from "vitest";
import { isAllowedSeedHost, resolveSeedAdminKey } from "../../scripts/seed-supabase";

describe("production seed credentials", () => {
  it("prefers the secret key and falls back to the service role key", () => {
    expect(resolveSeedAdminKey({ SUPABASE_SECRET_KEY: " sb_secret_new ", SUPABASE_SERVICE_ROLE_KEY: "legacy" })).toBe("sb_secret_new");
    expect(resolveSeedAdminKey({ SUPABASE_SERVICE_ROLE_KEY: "legacy" })).toBe("legacy");
    expect(resolveSeedAdminKey({})).toBeUndefined();
  });

  it("allows only the local API or the linked project host", () => {
    expect(isAllowedSeedHost("http://127.0.0.1:54321", null)).toBe(true);
    expect(isAllowedSeedHost("https://pripmaupaqorphvmkprl.supabase.co", "pripmaupaqorphvmkprl")).toBe(true);
    expect(isAllowedSeedHost("https://example.supabase.co", "pripmaupaqorphvmkprl")).toBe(false);
    expect(isAllowedSeedHost("https://pripmaupaqorphvmkprl.supabase.co", null)).toBe(false);
  });
});
