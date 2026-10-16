import Link from "next/link";
import { Suspense } from "react";
import { TrackRow } from "@/app/components/track-row";
import { GENRES } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

const FEED_LIMIT = 50;

async function Feed({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  const { tur } = await searchParams;
  const genre = GENRES.some((g) => g.value === tur) ? (tur as string) : null;

  const supabase = await createClient();
  // ponytail: son 50 parça; akış büyüyünce "daha fazla" (sayfalama) ekle.
  let query = supabase
    .from("tracks")
    .select("id, title, genre, cover_path, duration_sec, audio_path, status, profiles!artist_id(username, display_name)")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(FEED_LIMIT);
  if (genre) query = query.eq("genre", genre);
  const { data: tracks, error } = await query;
  // Hata "parça yok" gibi görünmesin
  if (error) throw new Error(`Akış yüklenemedi: ${error.message}`);

  const filters = [{ value: null, label: "Hepsi" }, ...GENRES];
  return (
    <>
      <nav className="flex gap-2 text-sm" aria-label="Tür filtresi">
        {filters.map((f) => (
          <Link
            key={f.label}
            href={f.value ? `/?tur=${f.value}` : "/"}
            aria-current={genre === f.value ? "page" : undefined}
            className="rounded-full border border-border bg-surface-2 px-4 py-1.5 font-medium transition-colors aria-[current=page]:border-foreground aria-[current=page]:bg-foreground aria-[current=page]:text-background"
          >
            {f.label}
          </Link>
        ))}
      </nav>
      {tracks && tracks.length > 0 ? (
        <ul className="divide-y divide-border">
          {tracks.map((t) =>
            t.profiles ? (
              <TrackRow
                key={t.id}
                track={t}
                artist={{ name: t.profiles.display_name || t.profiles.username, username: t.profiles.username }}
                showArtist
              />
            ) : null,
          )}
        </ul>
      ) : (
        <p className="py-8 text-muted">Henüz parça yok. İlk yükleyen sen ol.</p>
      )}
    </>
  );
}

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-5xl font-bold tracking-tight sm:text-6xl">
          Yeni sesler<span className="text-accent">.</span>
        </h1>
        <p className="text-muted">Bağımsız rap ve beat&apos;ler. En yeniler en üstte.</p>
      </header>
      <section className="flex flex-col gap-4">
        <h2 className="font-display text-xl font-semibold">Yeni yüklenenler</h2>
        <Suspense fallback={<p className="text-muted">Yükleniyor…</p>}>
          <Feed searchParams={searchParams} />
        </Suspense>
      </section>
    </main>
  );
}
