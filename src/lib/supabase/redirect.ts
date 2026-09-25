const FALLBACK = "/today";

export function safeInternalPath(requested: string | null | undefined, fallback = FALLBACK): string {
  if (!requested) return fallback;
  if (/[\u0000-\u001F\u007F\\]/.test(requested)) return fallback;
  if (!requested.startsWith("/")) return fallback;
  if (requested.startsWith("//")) return fallback;
  return requested;
}
