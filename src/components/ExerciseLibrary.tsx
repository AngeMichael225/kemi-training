"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Dumbbell, Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";

export interface ExerciseLibraryItem {
  id: string;
  slug: string;
  name: string;
  sections: string[];
  imageUrl: string | null;
  hasMedia: boolean;
}

export function ExerciseLibrary({ items }: { items: ExerciseLibraryItem[] }) {
  const [query, setQuery] = useState("");
  const [section, setSection] = useState("all");
  const sections = useMemo(() => [...new Set(items.flatMap((item) => item.sections))].sort(), [items]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items.filter((item) => {
      const matchesQuery = !needle || item.name.toLowerCase().includes(needle);
      const matchesSection = section === "all" || item.sections.includes(section);
      return matchesQuery && matchesSection;
    });
  }, [items, query, section]);

  return (
    <div className="page-stack">
      <header className="page-heading"><span className="eyebrow">Bibliothèque</span><h1 className="h1">Tous les mouvements, au même endroit.</h1><p className="muted" style={{ margin: 0 }}>Démos directes quand le classeur en fournit une, lien source secondaire sinon.</p></header>
      <label className="label">Rechercher
        <div style={{ position: "relative" }}><Search size={18} style={{ position: "absolute", left: 14, top: 16, color: "var(--text-secondary)" }} /><input className="input" style={{ paddingLeft: 42 }} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Squat, row, plank..." /></div>
      </label>
      <div className="row wrap" aria-label="Filtre de section">
        <button type="button" className={`pill ${section === "all" ? "pill-accent" : ""}`} onClick={() => setSection("all")}><SlidersHorizontal size={13} /> Tous</button>
        {sections.map((value) => <button type="button" key={value} className={`pill ${section === value ? "pill-accent" : ""}`} onClick={() => setSection(value)}>{value}</button>)}
      </div>
      <div className="exercise-grid">
        {filtered.map((item) => (
          <Link key={item.id} href={`/exercise/${item.slug}`} className="exercise-tile">
            <div className="exercise-thumb">
              {item.imageUrl ? <Image src={item.imageUrl} width={148} height={148} alt="" sizes="74px" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Dumbbell size={24} className="muted" />}
            </div>
            <div style={{ minWidth: 0 }}><strong>{item.name}</strong><div className="caption" style={{ marginTop: 4 }}>{item.sections[0] ?? "Programme"}{item.hasMedia ? " - demo disponible" : " - référence externe"}</div></div>
            <ChevronRight size={17} className="muted" />
          </Link>
        ))}
      </div>
      {!filtered.length ? <div className="empty-state">Aucun exercice ne correspond a cette recherche.</div> : null}
    </div>
  );
}
