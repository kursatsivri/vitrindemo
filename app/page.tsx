import Link from "next/link";
import { Suspense } from "react";
import { Cover } from "@/app/components/cover";
import { GenreFilter } from "@/app/components/genre-pills";
import { RankingList, withTracks } from "@/app/components/ranking";
import { PlayButton, TrackQueue } from "@/app/components/player";
import { genreLabel, GridSkeleton, toPlayerTrack, TrackGrid, type TrackListRow, withArtist } from "@/app/components/track-row";
import { GENRES } from "@/lib/music";
import { createClient } from "@/lib/supabase/server";
import { formatDuration, periodStart } from "@/lib/tracks";

const FEED_LIMIT = 50;

// Öne çıkan: akışın en yeni parçası; büyük kapak, arkasında hafif turuncu glow.
function Featured({ row, queue }: { row: TrackListRow; queue: TrackListRow[] }) {
  const { track, artist } = row;
  return (
    <TrackQueue tracks={queue.map((r) => toPlayerTrack(r.track, r.artist))}>
      <section className="flex flex-col gap-5 md:flex-row md:items-center md:gap-14">
        <p className="text-xs font-medium tracking-[0.08em] text-text-muted uppercase md:hidden">Öne çıkan · son yüklenen</p>
        <Link href={`/p/${track.id}`} className="w-full shrink-0 rounded-xl shadow-[0_40px_120px_-30px] shadow-accent/35 md:w-[min(420px,40%)]">
          <Cover path={track.cover_path} title={track.title} className="w-full" />
        </Link>
        <div className="flex items-end justify-between gap-4 md:flex-1 md:flex-col md:items-start md:gap-5">
          <div className="flex min-w-0 flex-col gap-1.5 md:gap-5">
            <p className="hidden text-xs font-medium tracking-[0.1em] text-text-muted uppercase md:block">Öne çıkan · son yüklenen</p>
            <h2 className="font-display text-[34px] leading-[1.02] font-extrabold tracking-[-0.035em] md:text-[clamp(44px,6vw,80px)] md:leading-[0.95] md:tracking-[-0.045em]">
              <Link href={`/p/${track.id}`}>{track.title}</Link>
            </h2>
            <p className="text-sm text-text-muted md:text-[15px]">
              <Link href={`/${artist.username}`} className="font-medium text-text hover:underline">
                {artist.name}
              </Link>
              {" · "}
              {genreLabel(track.genre)}
              {track.duration_sec ? ` · ${formatDuration(track.duration_sec)}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-3 md:mt-2">
            <PlayButton track={toPlayerTrack(track, artist)} size="lg" />
            <Link href={`/p/${track.id}`} className="btn-secondary hidden h-14 px-6 text-[15px] md:inline-flex">
              Parçaya git
            </Link>
          </div>
        </div>
      </section>
    </TrackQueue>
  );
}

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

  const rows = withArtist(tracks ?? []);
  // Öne çıkan sadece filtresiz "Yeni" akışında; ızgara onun dışındakileri gösterir.
  const featured = !following && !genre ? rows[0] : undefined;

  return (
    <>
      {featured && <Featured row={featured} queue={rows} />}
      <section className="flex flex-col gap-5 md:gap-7">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between md:border-b md:border-border">
          <h2 className="font-display text-2xl font-bold tracking-[-0.03em] md:mb-4 md:text-4xl md:tracking-[-0.035em]">
            {following ? "Takip ettiklerin" : "Yeni Yüklenenler"}
          </h2>
          <nav className="flex gap-6 border-b border-border md:gap-7 md:border-0" aria-label="Akış">
            {[
              { label: "Yeni", href: genre ? `/?tur=${genre}` : "/", active: !following },
              { label: "Takip ettiklerin", href: genre ? `/?akis=takip&tur=${genre}` : "/?akis=takip", active: following },
            ].map((t) => (
              <Link
                key={t.label}
                href={t.href}
                aria-current={t.active ? "page" : undefined}
                className="-mb-px border-b-2 border-transparent pb-3 text-[15px] font-medium text-text-muted transition duration-150 hover:text-text aria-[current=page]:border-accent aria-[current=page]:text-text md:pb-4"
              >
                {t.label}
              </Link>
            ))}
          </nav>
        </div>
        <GenreFilter active={genre} href={href} />
        <TrackGrid
          rows={featured ? rows.slice(1) : rows}
          empty={
            following ? (
              viewerId ? (
                artistIds?.length ? (
                  `Takip ettiğin sanatçıların henüz ${genre ? "bu türde " : ""}parçası yok.`
                ) : (
                  "Henüz kimseyi takip etmiyorsun. Beğendiğin sanatçıların profilinden takip et."
                )
              ) : (
                <>
                  Takip akışını görmek için <Link href="/giris" className="link">giriş yap</Link>.
                </>
              )
            ) : featured ? (
              "Şimdilik bu kadar. Yeni parçalar geldikçe burada."
            ) : (
              `Henüz ${genre ? "bu türde " : ""}parça yok. İlk yükleyen sen ol.`
            )
          }
        />
      </section>
    </>
  );
}

// Sana özel: girişli kullanıcıya öneri akışından 10 parça (tercih, beğeni benzerliği, takip, yükselenler).
async function ForYou() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims.sub) return null;
  const { data } = await supabase.rpc("discover_feed", { p_limit: 10 });
  const rows = await withTracks(supabase, (data ?? []).map((r, i) => ({ rank: i + 1, track_id: r.track_id, score: 0 })));
  if (rows.length === 0) return null;
  return (
    <section className="flex flex-col gap-5">
      <div className="flex items-end justify-between gap-4">
        <h2 className="font-display text-2xl font-bold tracking-[-0.03em] md:text-4xl md:tracking-[-0.035em]">Sana özel</h2>
        <Link href="/kesfet" className="link text-sm">
          Keşfet modunda dinle
        </Link>
      </div>
      <TrackGrid rows={rows} empty={null} />
    </section>
  );
}

// Bu haftanın zirvesi: haftalık genel listenin ilk 5'i; oy yoksa hiç görünmez.
async function WeeklyTop() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("ranking", { p_period: "week", p_start: periodStart("week") }).limit(5);
  const rows = await withTracks(supabase, data ?? []);
  if (rows.length === 0) return null;
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-end justify-between gap-4">
        <h2 className="font-display text-2xl font-bold tracking-[-0.03em] md:text-4xl md:tracking-[-0.035em]">Bu haftanın zirvesi</h2>
        <Link href="/siralama" className="link text-sm">
          Tüm sıralama
        </Link>
      </div>
      <RankingList rows={rows} />
    </section>
  );
}

function FeedSkeleton() {
  return (
    <>
      <div aria-hidden className="flex flex-col gap-5 md:flex-row md:items-center md:gap-14">
        <div className="skeleton aspect-square w-full rounded-xl md:w-[min(420px,40%)]" />
        <div className="flex flex-1 flex-col gap-4">
          <div className="skeleton h-9 w-3/4 md:h-16" />
          <div className="skeleton h-3.5 w-1/2" />
        </div>
      </div>
      <GridSkeleton />
    </>
  );
}

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-8 px-4 py-6 md:gap-16 md:px-10 md:py-14">
      <h1 className="sr-only">Vitrin — yeni sesler</h1>
      <Suspense>
        <WeeklyTop />
      </Suspense>
      <Suspense>
        <ForYou />
      </Suspense>
      <Suspense fallback={<FeedSkeleton />}>
        <Feed searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
