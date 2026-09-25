export const MANAGED_ENV_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_APP_URL",
  "KEMI_USER_ID",
] as const;

const STATUS_MAP: Record<string, string> = {
  NEXT_PUBLIC_SUPABASE_URL: "API_URL",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "ANON_KEY",
  SUPABASE_SERVICE_ROLE_KEY: "SERVICE_ROLE_KEY",
};

export function parseEnv(contents: string): Map<string, string> {
  const values = new Map<string, string>();
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator <= 0) continue;
    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values.set(key, value);
  }
  return values;
}

export function renderEnvFile(existing: string, statusEnv: string, extras: Record<string, string> = {}): string {
  const current = parseEnv(existing);
  const status = parseEnv(statusEnv);
  const next = new Map(current);
  for (const key of MANAGED_ENV_KEYS) {
    if (key === "NEXT_PUBLIC_APP_URL") {
      if (!next.get(key)) next.set(key, "http://localhost:3000");
      continue;
    }
    if (key === "KEMI_USER_ID") {
      if (extras.KEMI_USER_ID) next.set(key, extras.KEMI_USER_ID);
      continue;
    }
    const source = STATUS_MAP[key];
    const value = source ? status.get(source) : undefined;
    if (value) next.set(key, value);
  }
  for (const [key, value] of Object.entries(extras)) {
    if (value) next.set(key, value);
  }

  const seen = new Set<string>();
  const lines = existing.split(/\r?\n/).map((line) => {
    const separator = line.indexOf("=");
    if (separator <= 0) return line;
    const key = line.slice(0, separator).trim();
    if (!next.has(key)) return line;
    seen.add(key);
    return `${key}=${next.get(key)}`;
  });
  for (const [key, value] of next) {
    if (seen.has(key)) continue;
    if (lines.length && lines[lines.length - 1] !== "") lines.push("");
    lines.push(`${key}=${value}`);
    seen.add(key);
  }
  return `${lines.filter((line, index) => line !== "" || index < lines.length - 1).join("\n").replace(/\n{3,}/g, "\n\n")}\n`;
}

export function isLocalSupabaseUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" && (parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost");
  } catch {
    return false;
  }
}

export function redactSecrets(text: string): string {
  return text
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "[redacted]")
    .replace(/sb_secret_[A-Za-z0-9_-]+/g, "[redacted]")
    .replace(/(SERVICE_ROLE_KEY|SECRET_KEY|ANON_KEY|PUBLISHABLE_KEY|SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SECRET_KEY)=("[^"]+"|\S+)/g, "$1=[redacted]");
}
