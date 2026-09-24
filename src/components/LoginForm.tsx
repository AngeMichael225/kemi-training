"use client";

import Link from "next/link";
import { ArrowRight, Mail, WifiOff } from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function LoginForm({ configured }: { configured: boolean }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function sendLink() {
    if (!email || busy || !configured) return;
    setBusy(true);
    setStatus("");
    try {
      const supabase = createClient();
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${baseUrl}/auth/confirm` },
      });
      setStatus(error ? error.message : "Lien de connexion envoye. Verifie ta boite courriel.");
    } catch {
      setStatus("Impossible d'envoyer le lien pour le moment.");
    } finally {
      setBusy(false);
    }
  }

  if (!configured) {
    return (
      <div className="stack">
        <div className="coach-tip"><strong><WifiOff size={13} style={{ display: "inline", marginRight: 5 }} /> Mode local</strong>Supabase n'est pas configure dans cet environnement. Toutes les fonctions workout restent disponibles localement pour la revue.</div>
        <Link href="/today" className="button button-primary">Continuer en mode local <ArrowRight size={18} /></Link>
      </div>
    );
  }

  return (
    <div className="stack">
      <label className="label">Adresse courriel
        <div style={{ position: "relative" }}><Mail size={18} style={{ position: "absolute", left: 14, top: 16, color: "var(--text-secondary)" }} /><input className="input" type="email" autoComplete="email" inputMode="email" value={email} onChange={(event) => setEmail(event.target.value)} style={{ paddingLeft: 42 }} placeholder="kemi@example.com" /></div>
      </label>
      <button type="button" className="button button-primary" onClick={() => void sendLink()} disabled={busy || !email}>{busy ? "Envoi..." : "Recevoir un lien magique"} <ArrowRight size={18} /></button>
      {status ? <p className="small muted" role="status" style={{ margin: 0 }}>{status}</p> : null}
    </div>
  );
}
