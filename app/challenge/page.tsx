import type { Metadata } from "next";
import Link from "next/link";
import { Download, Swords } from "lucide-react";
import { Suspense } from "react";
import { sectionTitle } from "@/app/components/artist-line";
import { EmptyState } from "@/app/components/notice";
import { RankingList, withTracks } from "@/app/components/ranking";
import { ListSkeleton, TrackList, withArtist } from "@/app/components/track-row";
import { trToday } from "@/lib/scouts";
import { createClient } from "@/lib/supabase/server";
import { periodStart, storageUrl } from "@/lib/tracks";

export const metadata: Metadata = { title: "Haftalık challenge | Vitrin" };

const TRACK = "id, title, genre, audio_path, cover_path, duration_sec, status, artist_id, profiles!artist_id(username, display_name)";

// Takvim (SPEC §4.17): pazartesi–cuma katılım, oylama pazar 23:59'a kadar; kazanan pazartesi gece yazılır.
async function Challenge() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const viewerId = claims?.claims.sub ?? null;
  const week = periodStart("week");
  const isoDay = new Date(`${trToday()}T00:00:00Z`).getUTCDay() || 7;
  const entryOpen = isoDay <= 5;

  const [{ data: current }, { data: past }, me] = await Promise.all([
    supabase.from("challenges").select(`id, beat:tracks!beat_track_id(${TRACK})`).eq("week_start", week).maybeSingle(),
    supabase
      .from("challenges")
      .select(`id, week_start, winner:tracks!winner_track_id(${TRACK}), beat:tracks!beat_track_id(title, profiles!artist_id(username, display_name))`)
      .lt("week_start", week)
      .not("winner_track_id", "is", null)
      .order("week_start", { ascending: false })
      .limit(10),
    viewerId ? supabase.from("profiles").select("role").eq("id", viewerId).single() : null,
  ]);
  const beat = current?.beat;
  const { data: standings } = current ? await supabase.rpc("challenge_standings", { p_challenge: current.id }) : { data: [] };
  const entries = await withTracks(supabase, standings ?? []);
  const entered = !!viewerId && (standings ?? []).some((s) => s.artist_id === viewerId);
  const canJoin = entryOpen && me?.data?.role === "artist" && beat?.artist_id !== viewerId && !entered;
  const winners = withArtist((past ?? []).flatMap((c) => (c.winner ? [c.winner] : [])));

  return (
    <>
      {current && beat ? (
        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <span className="w-fit rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent">
              {entryOpen ? "Katılım açık · cuma 23:59'a kadar" : "Oylama sürüyor · pazar 23:59'a kadar"}
            </span>
            <h2 className={sectionTitle}>Bu haftanın beat’i</h2>
            <p className="text-sm text-text-muted">
              Beat’i indir, üzerine yaz, vokalli parçanı yükle. Oylar normal kurallarla verilir; en çok oyu alan kazanır ve
              ana sayfada beatmaker’la birlikte öne çıkar. Katılım haftalık yükleme hakkına sayılmaz.
            </p>
          </div>
          <TrackList rows={withArtist([beat])} empty={null} />
          <div className="flex flex-wrap gap-2">
            <a href={`${storageUrl("tracks", beat.audio_path)}?download=${encodeURIComponent(beat.title)}.mp3`} className="btn-secondary">
              <Download aria-hidden className="size-4" strokeWidth={1.75} />
              Beat’i indir
            </a>
            {canJoin && <Link href={`/yukle?challenge=${current.id}`} className="btn-primary">Katıl</Link>}
            {entered && <span className="btn-ghost pointer-events-none">Katıldın</span>}
            {!viewerId && entryOpen && <Link href="/giris" className="btn-ghost">Katılmak için giriş yap</Link>}
          </div>
        </section>
      ) : (
        <EmptyState icon={Swords} title="Bu hafta challenge yok">Yeni challenge pazartesi açılır. Beatmaker’lar yükleme formunda beat’lerini aday gösterebilir.</EmptyState>
      )}

      {current && (
        <section className="flex flex-col gap-3">
          <h2 className={sectionTitle}>Katılımlar</h2>
          {entries.length > 0 ? (
            <>
              <p className="text-sm text-text-muted">Oy vermek için parçayı aç; 30 sn dinledikten sonra oy verebilirsin.</p>
              <RankingList rows={entries} />
            </>
          ) : (
            <p className="text-sm text-text-muted">Henüz katılım yok. İlk sen ol.</p>
          )}
        </section>
      )}

      {winners.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className={sectionTitle}>Geçmiş kazananlar</h2>
          <TrackList rows={winners} empty={null} />
        </section>
      )}
    </>
  );
}

export default function Page() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-7 md:py-14">
      <h1 className="font-display text-4xl leading-none font-extrabold tracking-[-0.04em] md:text-5xl">Haftalık challenge</h1>
      <Suspense fallback={<ListSkeleton />}>
        <Challenge />
      </Suspense>
    </main>
  );
}
