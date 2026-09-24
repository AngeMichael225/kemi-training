"use client";

import { useEffect, useState } from "react";
import { Download, Share2, Smartphone } from "lucide-react";

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

export function InstallPWA() {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [standalone, setStandalone] = useState(false);

  useEffect(() => {
    setStandalone(window.matchMedia("(display-mode: standalone)").matches || (window.navigator as Navigator & { standalone?: boolean }).standalone === true);
    const handler = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function install() {
    if (!prompt) return;
    await prompt.prompt();
    const choice = await prompt.userChoice;
    if (choice.outcome === "accepted") setStandalone(true);
    setPrompt(null);
  }

  if (standalone) return <div className="pill pill-accent"><Smartphone size={13} /> Installée comme app</div>;
  if (prompt) return <button type="button" className="button button-primary" onClick={() => void install()}><Download size={18} /> Installer KEMI Training</button>;
  return (
    <div className="coach-tip">
      <strong><Share2 size={13} style={{ display: "inline", marginRight: 5 }} /> Installation iPhone</strong>
      Dans Safari, utilise Partager puis Ajouter à l'écran d'accueil. Le mode standalone respecte les safe areas iOS.
    </div>
  );
}
