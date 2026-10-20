import { CITIES } from "@/lib/music";
import { MAP_VIEWBOX, PROVINCE_PATHS } from "./provinces";

// 81 il haritası; her il kendi şehir sayfasına link. Sabit içerik (statik kabukta önceden render edilir).
// Renk: sanatçı sayısına göre <MapColors> ayrı bir <style> ile verir.
export function TurkeyMap() {
  return (
    <svg viewBox={MAP_VIEWBOX} role="img" aria-label="Türkiye il haritası" className="h-auto w-full">
      {CITIES.map((name, i) => (
        <a key={name} href={`/sehir/${i + 1}`} aria-label={name} data-il={i + 1} className="group outline-none">
          <title>{name}</title>
          {PROVINCE_PATHS[i + 1].map((d, j) => (
            <path
              key={j}
              d={d}
              className="fill-surface-2 stroke-bg stroke-[0.8] transition-colors duration-150 group-hover:fill-accent group-focus-visible:fill-accent"
            />
          ))}
        </a>
      ))}
    </svg>
  );
}

// Sanatçısı olan iller turuncunun tonlarıyla (çok sanatçı = daha koyu). Hover rengi bunu ezer.
export function MapColors({ counts }: { counts: Map<number, number> }) {
  const max = Math.max(1, ...counts.values());
  const rules = [...counts].map(([city, n]) => {
    const pct = Math.round(25 + (n / max) * 55);
    return `[data-il="${city}"]:not(:hover):not(:focus-visible) path{fill:color-mix(in srgb,var(--accent) ${pct}%,var(--surface-2))}`;
  });
  return <style>{rules.join("")}</style>;
}
