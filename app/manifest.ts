import type { MetadataRoute } from "next";

// Ana ekrana eklenebilir uygulama; service worker yok (çevrimdışı çalışma gerekmiyor).
// Renkler app/globals.css token'ları (--bg); manifest CSS değişkeni okuyamaz.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Vitrin",
    short_name: "Vitrin",
    description: "Bağımsız rap ve beat keşif platformu",
    start_url: "/",
    display: "standalone",
    background_color: "#0b0b0c",
    theme_color: "#0b0b0c",
    lang: "tr",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
