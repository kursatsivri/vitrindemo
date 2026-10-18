import Link from "next/link";
import { Suspense } from "react";
import { TrackList, withArtist } from "@/app/components/track-row";
import { GENRES } from "@/lib/music";
import { createClient } from "@/lib/supabase/server";

const FEED_LIMIT = 50;
const pill =
  "shrink-0 whitespace-nowrap rounded-full border border-border bg-surface-2 px-4 py-1.5 font-medium transition-colors aria-[current=page]:border-foreground aria-[current=page]:bg-foreground aria-[current=page]:text-background";

async function Feed({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  const { tur, akis } = await searchParams;
  const genre = GENRES.some((g) => g.value === tur) ? (tur as string) : null;
  const following = akis === "takip";

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const viewerId = claims?.claims.sub;

  // "Takip ettiklerin": takip edilen sanatçıların parçaları
  let artistIds: string[] | null = null;
  if (following && viewerId) {
    const { data } = await supabase.from("follows").select("followee_id").eq("follower_id", viewerId);
    artistIds = (data ?? []).map((f) => f.followee_id);
  }

  // ponytail: son 50 parça; akış büyüyünce "daha fazla" (sayfalama) ekle.
  let query = supabase
    .from("tracks")
    .select("id, title, genre, cover_path, duration_sec, audio_path, status, profiles!artist_id(username, display_name)")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(FEED_LIMIT);
  if (genre) query = query.eq("genre", genre);
  if (artistIds) query = query.in("artist_id", artistIds);
  const { data: tracks, error } = following && !viewerId ? { data: [], error: null } : await query;
  // Hata "parça yok" gibi görünmesin
  if (error) throw new Error(`Akış yüklenemedi: ${error.message}`);

  const href = (g: string | null) => {
    const q = new URLSearchParams();
    if (following) q.set("akis", "takip");
    if (g) q.set("tur", g);
    return q.size ? `/?${q}` : "/";
  };

  return (
    <>
      <nav className="flex gap-6 border-b border-border text-sm" aria-label="Akış">
        {[
          { label: "Yeni", href: genre ? `/?tur=${genre}` : "/", active: !following },
          { label: "Takip ettiklerin", href: genre ? `/?akis=takip&tur=${genre}` : "/?akis=takip", active: following },
        ].map((t) => (
          <Link
            key={t.label}
            href={t.href}
            aria-current={t.active ? "page" : undefined}
            className="-mb-px border-b-2 border-transparent pb-2.5 font-semibold text-muted transition-colors hover:text-foreground aria-[current=page]:border-accent aria-[current=page]:text-foreground"
          >
            {t.label}
          </Link>
        ))}
      </nav>
      <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 text-sm [scrollbar-width:none]" aria-label="Tür filtresi">
        {[{ value: null, label: "Hepsi" }, ...GENRES].map((f) => (
          <Link key={f.label} href={href(f.value)} aria-current={genre === f.value ? "page" : undefined} className={pill}>
            {f.label}
          </Link>
        ))}
      </nav>
      <TrackList
        rows={withArtist(tracks ?? [])}
        empty={
          following ? (
            viewerId ? (
              artistIds?.length ? `Takip ettiğin sanatçıların henüz ${genre ? "bu türde " : ""}parçası yok.` : "Henüz kimseyi takip etmiyorsun. Beğendiğin sanatçıların profilinden takip et."
            ) : (
              <>Takip akışını görmek için <Link href="/giris" className="link">giriş yap</Link>.</>
            )
          ) : (
            "Henüz parça yok. İlk yükleyen sen ol."
          )
        }
      />
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
        <p className="text-muted">Keşfedilmeyi bekleyen bağımsız müzisyenler. En yeniler en üstte.</p>
      </header>
      <Suspense fallback={<p className="text-muted">Yükleniyor…</p>}>
        <Feed searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
