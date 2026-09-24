import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { PreferencesPanel } from "@/components/PreferencesPanel";

export const metadata: Metadata = { title: "Réglages" };

export default function SettingsPage() {
  return (
    <div className="page-stack">
      <header className="page-heading"><Link href="/profile" className="row small muted" style={{ width: "fit-content" }}><ArrowLeft size={16} /> Profil</Link><span className="eyebrow">Réglages</span><h1 className="h1">Simple et utile.</h1></header>
      <PreferencesPanel />
      <div className="coach-tip"><strong><ShieldCheck size={13} style={{ display: "inline", marginRight: 5 }} /> Confidentialite</strong>Les donnees de séance sont d'abord conservees localement. Avec Supabase configure, la synchronisation est protegee par Auth et RLS.</div>
    </div>
  );
}
