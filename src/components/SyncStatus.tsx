"use client";

import { useCallback, useEffect, useState } from "react";
import { Cloud, CloudOff, LoaderCircle } from "lucide-react";
import { hasSupabaseBrowserEnv } from "@/lib/env";
import { syncPendingMutations, type SyncState } from "@/lib/sync";

const labels: Record<SyncState, string> = {
  synced: "Synchronisé",
  offline: "Hors ligne",
  syncing: "Synchronisation",
  pending: "En attente",
  error: "À resynchroniser",
};

export function SyncStatus({ compact = false }: { compact?: boolean }) {
  const [state, setState] = useState<SyncState>("synced");

  const runSync = useCallback(async () => {
    if (!hasSupabaseBrowserEnv()) {
      setState("synced");
      return;
    }
    if (!navigator.onLine) {
      setState("offline");
      return;
    }
    setState("syncing");
    setState(await syncPendingMutations());
  }, []);

  useEffect(() => {
    const online = () => void runSync();
    const offline = () => setState("offline");
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    const kickoff = window.setTimeout(() => void runSync(), 0);
    return () => {
      window.clearTimeout(kickoff);
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
    };
  }, [runSync]);

  const Icon = state === "offline" ? CloudOff : state === "syncing" ? LoaderCircle : Cloud;
  return (
    <button type="button" className="sync-indicator" onClick={() => void runSync()} aria-label={`Etat de synchronisation: ${labels[state]}`}>
      <span className="pill" style={{ minHeight: compact ? 30 : 34, background: "rgba(17,19,21,.88)" }}>
        <Icon size={13} className={state === "syncing" ? "animate-spin" : undefined} aria-hidden="true" />
        {!compact ? labels[state] : state === "offline" ? "Offline" : state === "syncing" ? "Sync" : "OK"}
      </span>
    </button>
  );
}
