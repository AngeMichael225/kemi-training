import { NextResponse } from "next/server";

/** Unauthenticated /api/sync must always be JSON 401 — never a login redirect. */
export function unauthenticatedSyncResponse() {
  return NextResponse.json(
    { ok: false },
    { status: 401, headers: { "Content-Type": "application/json" } },
  );
}
