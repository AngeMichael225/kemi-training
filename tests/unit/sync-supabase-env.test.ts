import { describe, expect, it } from "vitest";
import { isLocalSupabaseUrl, parseEnv, redactSecrets, renderEnvFile } from "../../scripts/sync-supabase-env";

const status = `
API_URL="http://127.0.0.1:54321"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.anon.sig"
SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.service.sig"
PUBLISHABLE_KEY="sb_publishable_local"
SECRET_KEY="sb_secret_local"
`;

describe("local supabase env sync", () => {
  it("maps anon and service role keys and preserves unmanaged values", () => {
    const existing = "CUSTOM_FLAG=keep\nNEXT_PUBLIC_APP_URL=http://localhost:3000\n";
    const rendered = renderEnvFile(existing, status, { KEMI_USER_ID: "11111111-1111-4111-8111-111111111111" });
    const values = parseEnv(rendered);
    expect(values.get("CUSTOM_FLAG")).toBe("keep");
    expect(values.get("NEXT_PUBLIC_SUPABASE_URL")).toBe("http://127.0.0.1:54321");
    expect(values.get("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY")).toBe("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.anon.sig");
    expect(values.get("SUPABASE_SERVICE_ROLE_KEY")).toBe("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.service.sig");
    expect(values.get("KEMI_USER_ID")).toBe("11111111-1111-4111-8111-111111111111");
    expect(values.get("NEXT_PUBLIC_APP_URL")).toBe("http://localhost:3000");
    expect(rendered).not.toContain("sb_secret_local");
  });

  it("is idempotent", () => {
    const once = renderEnvFile("", status);
    expect(renderEnvFile(once, status)).toBe(once);
  });

  it("accepts only local Supabase URLs", () => {
    expect(isLocalSupabaseUrl("http://127.0.0.1:54321")).toBe(true);
    expect(isLocalSupabaseUrl("http://localhost:54321")).toBe(true);
    expect(isLocalSupabaseUrl("https://example.supabase.co")).toBe(false);
  });

  it("redacts JWTs and secret keys", () => {
    expect(redactSecrets("token eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.aaa.bbb")).toContain("[redacted]");
    expect(redactSecrets("SUPABASE_SECRET_KEY=sb_secret_example")).toBe("SUPABASE_SECRET_KEY=[redacted]");
    expect(redactSecrets("prefix sb_secret_example suffix")).not.toContain("sb_secret_example");
  });
});
