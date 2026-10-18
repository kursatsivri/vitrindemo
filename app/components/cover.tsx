import { Music } from "lucide-react";
import { storageUrl } from "@/lib/tracks";

// Parça kapağı; kapak yoksa varsayılan kapak (SPEC §3.2). Köşe varsayılan 12px; küçük kapaklarda className ile değişir.
export function Cover({ path, title, className = "" }: { path: string | null; title: string; className?: string }) {
  if (!path) {
    return (
      <div aria-hidden className={`flex aspect-square shrink-0 items-center justify-center rounded-xl bg-surface-2 text-text-muted ${className}`}>
        <Music className="size-[34%]" strokeWidth={1.5} />
      </div>
    );
  }
  // Supabase Storage'dan gelen görsel; next/image optimizasyonuna gerek yok.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={storageUrl("covers", path)} alt={title} className={`aspect-square shrink-0 rounded-xl object-cover ${className}`} />;
}
