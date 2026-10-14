export function avatarUrl(path: string | null) {
  return path
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${path}`
    : null;
}

export function Avatar({ path, name, size = 96 }: { path: string | null; name: string; size?: number }) {
  const url = avatarUrl(path);
  const style = { width: size, height: size };

  if (!url) {
    return (
      <div
        style={style}
        className="flex items-center justify-center rounded-full bg-neutral-800 text-2xl font-semibold uppercase text-neutral-300"
      >
        {name.charAt(0)}
      </div>
    );
  }
  // Supabase Storage'dan gelen küçük görsel; next/image optimizasyonuna gerek yok.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={name} style={style} className="rounded-full object-cover" />;
}
