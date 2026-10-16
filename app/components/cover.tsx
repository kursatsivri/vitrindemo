import { storageUrl } from "@/lib/tracks";

// Parça kapağı; kapak yoksa varsayılan kapak (SPEC §3.2).
export function Cover({ path, title, className = "" }: { path: string | null; title: string; className?: string }) {
  if (!path) {
    return (
      <div
        aria-hidden
        className={`flex aspect-square shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-accent/40 to-surface-2 text-2xl text-foreground/60 ${className}`}
      >
        ♪
      </div>
    );
  }
  // Supabase Storage'dan gelen görsel; next/image optimizasyonuna gerek yok.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={storageUrl("covers", path)} alt={title} className={`aspect-square shrink-0 rounded-lg object-cover ${className}`} />;
}
