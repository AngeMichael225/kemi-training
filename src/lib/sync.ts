"use client";

import { deletePendingMutation, getPendingMutations } from "@/lib/offline-db";

export type SyncState = "synced" | "offline" | "syncing" | "pending" | "error";

export async function syncPendingMutations(): Promise<SyncState> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return "offline";
  const pending = await getPendingMutations();
  if (!pending.length) return "synced";

  for (const mutation of pending) {
    try {
      const response = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mutation),
      });
      if (response.status === 401) return "pending";
      if (response.status === 503) return "synced";
      if (!response.ok) return "error";
      await deletePendingMutation(mutation.id);
    } catch {
      return navigator.onLine ? "error" : "offline";
    }
  }
  return "synced";
}
