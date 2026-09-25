"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Icon } from "@/components/icons/Icon";

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export function InstallPWA() {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const standalone = useSyncExternalStore(() => () => undefined, isStandalone, () => false) || installed;

  useEffect(() => {
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
    if (choice.outcome === "accepted") setInstalled(true);
    setPrompt(null);
  }

  if (standalone) return <div className="pill pill-accent"><Icon name="mobile" size={13} /> Installée comme app</div>;
  if (prompt) return <button type="button" className="button button-primary" onClick={() => void install()}><Icon name="download" size={18} /> Installer KEMI Training</button>;
  return (
    <div className="coach-tip">
      <strong><Icon name="share" size={13} style={{ marginRight: 5 }} /> Installation iPhone</strong>
      Dans Safari, utilise Partager puis Ajouter à l’écran d’accueil. Le mode standalone respecte les safe areas iOS.
    </div>
  );
}
