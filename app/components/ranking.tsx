import { Trophy } from "lucide-react";
import { TrackQueue } from "@/app/components/player";
import { genreLabel, toPlayerTrack, TrackRow, type TrackListRow, withArtist } from "@/app/components/track-row";
import { cityName, GENRES, labelOf } from "@/lib/music";
import type { createClient } from "@/lib/supabase/server";
import { periodStart } from "@/lib/tracks";

type Db = Awaited<ReturnType<typeof createClient>>;
export type RankedRow = TrackListRow & { rank: number; score: number };

const ARCHIVE_SIZE = 12;

// /siralama filtreleri (?donem=ay&tur=…&sehir=…&baslangic=…): sayfa ve hikâye görseli aynı listeyi gösterir.
// Arşiv: son 12 dönem; ranking() arşivlenmişse dondurulmuş listeyi, değilse canlıyı döndürür.
export function rankingFilters(q: Record<string, string | string[] | undefined>, now: Date) {
  const period: "week" | "month" = q.donem === "ay" ? "month" : "week";
  const genre = GENRES.some((g) => g.value === q.tur) ? (q.tur as string) : null;
  const city = cityName(Number(q.sehir)) ? Number(q.sehir) : null;
  const starts = Array.from({ length: ARCHIVE_SIZE }, (_, i) => periodStart(period, now, i));
  const start = starts.includes(q.baslangic as string) ? (q.baslangic as string) : starts[0];
  const title = [
    period === "week" ? "Haftalık" : "Aylık",
    genre ? labelOf(GENRES, genre) : "genel",
    "liste",
    city ? `· ${cityName(city)}` : "",
  ].join(" ");
  return { period, genre, city, starts, start, title };
}

export function periodLabel(period: "week" | "month", start: string, i: number) {
  if (i === 0) return period === "week" ? "Bu hafta" : "Bu ay";
  const d = new Date(`${start}T00:00:00Z`);
  return period === "week"
    ? `${d.toLocaleDateString("tr-TR", { day: "numeric", month: "long", timeZone: "UTC" })} haftası`
    : d.toLocaleDateString("tr-TR", { month: "long", year: "numeric", timeZone: "UTC" });
}

// ranking()/rising_live satırlarına parça + sanatçı bilgisini ekler, sırayı korur.
export async function withTracks(supabase: Db, rows: { rank: number; track_id: string; score: number }[]): Promise<RankedRow[]> {
  if (rows.length === 0) return [];
  const { data, error } = await supabase
    .from("tracks")
    .select("id, title, genre, cover_path, duration_sec, audio_path, status, profiles!artist_id(username, display_name)")
    .in("id", rows.map((r) => r.track_id));
  if (error) throw new Error(`Sıralama yüklenemedi: ${error.message}`);
  const byId = new Map(withArtist(data ?? []).map((r) => [r.track.id, r]));
  return rows.flatMap((r) => {
    const row = byId.get(r.track_id);
    return row ? [{ ...row, rank: r.rank, score: r.score }] : [];
  });
}

// Sıra numarası + oy sayısıyla parça listesi (oynatıcı sırası dahil).
export function RankingList({ rows }: { rows: RankedRow[] }) {
  return (
    <TrackQueue tracks={rows.map((r) => toPlayerTrack(r.track, r.artist))}>
      <ol className="-mx-2 flex flex-col sm:-mx-4">
        {rows.map((r) => (
          <TrackRow
            key={r.track.id}
            track={r.track}
            artist={r.artist}
            index={r.rank - 1}
            showArtist
            aside={<span className="text-[13px] font-medium whitespace-nowrap tabular-nums">{r.score} oy</span>}
          />
        ))}
      </ol>
    </TrackQueue>
  );
}

// En iyi derece rozeti: arşivlenmiş dönemlerdeki en iyi tür sırası.
export function BestRank({ best }: { best: { rank_genre: number; genre: string; period: string } | null }) {
  if (!best) return null;
  return (
    <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-accent-soft px-3 text-xs font-medium text-accent">
      <Trophy aria-hidden className="size-3.5" strokeWidth={2} />
      En iyi: {genreLabel(best.genre)} {best.period === "week" ? "haftalık" : "aylık"} #{best.rank_genre}
    </span>
  );
}
