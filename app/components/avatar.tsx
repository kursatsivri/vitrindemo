import { storageUrl } from "@/lib/tracks";

export function Avatar({ path, name, size = 96 }: { path: string | null; name: string; size?: number }) {
  const url = path ? storageUrl("avatars", path) : null;
  const style = { width: size, height: size };

  if (!url) {
    return (
      <div
        style={{ ...style, fontSize: size * 0.4 }}
        className="flex shrink-0 items-center justify-center rounded-full bg-surface-2 font-display font-semibold uppercase text-muted"
      >
        {name.charAt(0)}
      </div>
    );
  }
  // Supabase Storage'dan gelen küçük görsel; next/image optimizasyonuna gerek yok.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={name} style={style} className="shrink-0 rounded-full object-cover" />;
}
