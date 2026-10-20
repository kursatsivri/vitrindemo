import Link from "next/link";
import { Music, Pencil } from "lucide-react";
import { Cover } from "@/app/components/cover";
import { EmptyState } from "@/app/components/notice";
import { PlayButton, type PlayerTrack, TrackQueue } from "@/app/components/player";
import { GENRES } from "@/lib/music";
import { formatDuration } from "@/lib/tracks";

export type TrackRowData = {
  id: string;
  title: string;
  genre: string;
  audio_path: string;
  cover_path: string | null;
  duration_sec: number | null;
  status: string;
};

export function toPlayerTrack(track: TrackRowData, artist: { name: string; username: string }): PlayerTrack {
  return {
    id: track.id,
    title: track.title,
    audioPath: track.audio_path,
    coverPath: track.cover_path,
    artistName: artist.name,
    artistUsername: artist.username,
  };
}

export const genreLabel = (value: string) => GENRES.find((g) => g.value === value)?.label ?? value;

const STATUS_LABELS: Record<string, string> = { hidden: "Gizlendi", removed: "Kaldırıldı" };

// Parça satırı (liste görünümü): profil ve kaydedilenlerde. Sıra numarası hover'da oynat'a döner.
// Listeyi <TrackQueue> ile sarmak, oynatıcının sıradakine geçmesini sağlar.
export function TrackRow({
  track,
  artist,
  index,
  showArtist = false,
  isOwner = false,
  featured = false,
  aside,
}: {
  track: TrackRowData;
  artist: { name: string; username: string };
  index: number;
  showArtist?: boolean;
  isOwner?: boolean;
  featured?: boolean;
  aside?: React.ReactNode;
}) {
  return (
    <li
      className={`group flex h-[68px] items-center gap-3 rounded-xl px-2 transition duration-150 hover:bg-surface sm:h-[72px] sm:gap-4 sm:px-4 ${featured ? "bg-surface" : ""}`}
    >
      <PlayButton track={toPlayerTrack(track, artist)} number={String(index + 1).padStart(2, "0")} />
      <Cover path={track.cover_path} title={track.title} className="w-12 rounded-lg sm:w-[52px]" />
      <div className="min-w-0 flex-1">
        <Link href={`/p/${track.id}`} className="block truncate text-[15px] font-medium hover:underline">
          {track.title}
        </Link>
        <p className="truncate text-[13px] text-text-muted">
          {featured && <span className="text-text">Öne çıkan · </span>}
          {showArtist && (
            <>
              <Link href={`/${artist.username}`} className="hover:text-text hover:underline">
                {artist.name}
              </Link>
              {" · "}
            </>
          )}
          {genreLabel(track.genre)}
        </p>
      </div>
      {STATUS_LABELS[track.status] && (
        <span className="rounded-full bg-danger/10 px-2.5 py-0.5 text-xs font-medium text-danger">{STATUS_LABELS[track.status]}</span>
      )}
      {aside}
      {track.duration_sec ? (
        <span className="text-[13px] text-text-muted tabular-nums">{formatDuration(track.duration_sec)}</span>
      ) : null}
      {isOwner && (
        <Link href={`/parca/${track.id}/duzenle`} aria-label={`${track.title} düzenle`} className="icon-btn size-9 border-transparent bg-transparent text-text-muted hover:text-text">
          <Pencil aria-hidden className="size-4" strokeWidth={1.75} />
        </Link>
      )}
    </li>
  );
}

export type TrackListRow = { track: TrackRowData; artist: { name: string; username: string } };

const emptyList = (empty: React.ReactNode) => (
  <EmptyState icon={Music} title="Burada henüz parça yok">
    {empty}
  </EmptyState>
);

// Sanatçı adıyla parça listesi + oynatıcı sırası (kaydedilenler).
export function TrackList({ rows, empty }: { rows: TrackListRow[]; empty: React.ReactNode }) {
  if (rows.length === 0) return emptyList(empty);
  return (
    <TrackQueue tracks={rows.map((r) => toPlayerTrack(r.track, r.artist))}>
      <ol className="-mx-2 flex flex-col sm:-mx-4">
        {rows.map((r, i) => (
          <TrackRow key={r.track.id} track={r.track} artist={r.artist} index={i} showArtist />
        ))}
      </ol>
    </TrackQueue>
  );
}

// Kart: kapak + başlık + sanatçı. Hover'da kart yükselir, kapak kararır, ortada oynat belirir.
// Tüm kart parça sayfasına gider (başlık linkinin ::after'ı); oynat butonu onun üstünde.
export function TrackCard({ track, artist }: TrackListRow) {
  return (
    <div className="group relative flex flex-col gap-2.5 transition duration-200 motion-safe:hover:-translate-y-1 md:gap-3">
      <div className="relative">
        <Cover path={track.cover_path} title={track.title} className="w-full" />
        <div aria-hidden className="pointer-events-none absolute inset-0 rounded-xl bg-bg/50 opacity-0 transition duration-200 group-hover:opacity-100" />
        <div className="absolute inset-0 flex items-center justify-center">
          <PlayButton
            track={toPlayerTrack(track, artist)}
            size="md"
            className="relative z-10 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100 md:size-14"
          />
        </div>
      </div>
      <div className="min-w-0">
        <Link
          href={`/p/${track.id}`}
          className="block truncate text-[15px] font-medium after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:rounded-2xl focus-visible:after:outline-2 focus-visible:after:outline-offset-4 focus-visible:after:outline-accent"
        >
          {track.title}
        </Link>
        <p className="truncate text-[13px] text-text-muted">
          {artist.name} · {genreLabel(track.genre)}
        </p>
      </div>
    </div>
  );
}

// Kart ızgarası + oynatıcı sırası (ana sayfa akışı).
export function TrackGrid({ rows, empty }: { rows: TrackListRow[]; empty: React.ReactNode }) {
  if (rows.length === 0) return emptyList(empty);
  return (
    <TrackQueue tracks={rows.map((r) => toPlayerTrack(r.track, r.artist))}>
      <div className="grid grid-cols-2 gap-x-3.5 gap-y-6 sm:grid-cols-[repeat(auto-fill,minmax(190px,1fr))] sm:gap-x-6 sm:gap-y-9">
        {rows.map((r) => (
          <TrackCard key={r.track.id} {...r} />
        ))}
      </div>
    </TrackQueue>
  );
}

// Sorgudan gelen gömülü sanatçıyı listeye uygun hale getirir.
export function withArtist<T extends TrackRowData & { profiles: { username: string; display_name: string | null } | null }>(
  tracks: T[],
): TrackListRow[] {
  return tracks.flatMap((t) =>
    t.profiles ? [{ track: t, artist: { name: t.profiles.display_name || t.profiles.username, username: t.profiles.username } }] : [],
  );
}

// Yükleme durumları: kart ızgarası ve liste iskeletleri.
export function GridSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div aria-hidden className="grid grid-cols-2 gap-x-3.5 gap-y-6 sm:grid-cols-[repeat(auto-fill,minmax(190px,1fr))] sm:gap-x-6 sm:gap-y-9">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex flex-col gap-2.5">
          <div className="skeleton aspect-square rounded-xl" />
          <div className="skeleton h-3 w-4/5" />
          <div className="skeleton h-2.5 w-1/2 opacity-70" />
        </div>
      ))}
    </div>
  );
}

export function ListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div aria-hidden className="flex flex-col gap-5 py-2">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex items-center gap-4">
          <div className="skeleton size-12 rounded-lg" />
          <div className="flex flex-1 flex-col gap-2">
            <div className="skeleton h-3 w-2/5" />
            <div className="skeleton h-2.5 w-1/4 opacity-70" />
          </div>
        </div>
      ))}
    </div>
  );
}
