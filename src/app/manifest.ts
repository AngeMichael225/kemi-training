import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "KEMI Training",
    short_name: "KEMI",
    description: "Programme d'entraînement local-first pour KEMI.",
    start_url: "/today",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#090a0b",
    theme_color: "#090a0b",
    lang: "fr-CA",
    icons: [
      { src: "/icons/kemi-icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/kemi-icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/kemi-maskable.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
