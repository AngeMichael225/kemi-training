import type { Metadata } from "next";
import { Dumbbell } from "lucide-react";
import { LoginForm } from "@/components/LoginForm";

export const metadata: Metadata = { title: "Connexion" };

export default function LoginPage() {
  const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  return (
    <main className="app-main" style={{ minHeight: "100dvh", display: "grid", alignItems: "center", paddingTop: "max(24px,var(--safe-top))", paddingBottom: "max(24px,var(--safe-bottom))" }}>
      <section className="card card-pad card-elevated stack" style={{ width: "min(100%,520px)", margin: "0 auto", padding: 24 }}>
        <div className="workout-index workout-index-accent" style={{ width: 58, height: 58, borderRadius: 20 }}><Dumbbell size={26} /></div>
        <div><span className="eyebrow">KEMI Training</span><h1 className="display" style={{ fontSize: "clamp(2.8rem,12vw,5rem)", marginTop: 10 }}>Ton programme. Dans ta main.</h1><p className="muted">Connexion simple, experience mobile d’abord, et mode local si le backend n’est pas encore configure.</p></div>
        <LoginForm configured={configured} />
      </section>
    </main>
  );
}
