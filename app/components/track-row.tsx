import Link from "next/link";
import { Cover } from "@/app/components/cover";
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

const STATUS_LABELS: Record<string, string> = { hidden: "Gizlendi", removed: "Kaldırıldı" };

// Parça satırı: profil ve akış listelerinde ortak. Sahibine düzenle linki gösterir.
// Listeyi <TrackQueue> ile sarmak, oynatıcının sıradakine geçmesini sağlar.
export function TrackRow({
  track,
  artist,
  showArtist = false,
  isOwner = false,
  featured = false,
}: {
  track: TrackRowData;
  artist: { name: string; username: string };
  showArtist?: boolean;
  isOwner?: boolean;
  featured?: boolean;
}) {
  const genre = GENRES.find((g) => g.value === track.genre)?.label ?? track.genre;
  return (
    <li className="flex items-center gap-3 py-3">
      <PlayButton track={toPlayerTrack(track, artist)} />
      <Cover path={track.cover_path} title={track.title} className="w-14" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">
          {featured && <span className="mr-2 text-xs font-semibold uppercase tracking-wider text-accent">Öne çıkan</span>}
          <Link href={`/p/${track.id}`} className="hover:underline">
            {track.title}
          </Link>
        </p>
        <p className="truncate text-sm text-muted">
          {showArtist && (
            <>
              <Link href={`/${artist.username}`} className="hover:text-foreground hover:underline">
                {artist.name}
              </Link>
              {" · "}
            </>
          )}
          {genre}
          {track.duration_sec ? ` · ${formatDuration(track.duration_sec)}` : ""}
        </p>
      </div>
      {STATUS_LABELS[track.status] && (
        <span className="rounded-full bg-red-950/60 px-2 py-0.5 text-xs text-red-200">{STATUS_LABELS[track.status]}</span>
      )}
      {isOwner && (
        <Link href={`/parca/${track.id}/duzenle`} className="text-sm text-muted hover:text-foreground">
          Düzenle
        </Link>
      )}
    </li>
  );
}

export type TrackListRow = { track: TrackRowData; artist: { name: string; username: string } };

// Sanatçı adıyla parça listesi + oynatıcı sırası (akış, kaydedilenler).
export function TrackList({ rows, empty }: { rows: TrackListRow[]; empty: React.ReactNode }) {
  if (rows.length === 0) return <div className="py-8 text-muted">{empty}</div>;
  return (
    <TrackQueue tracks={rows.map((r) => toPlayerTrack(r.track, r.artist))}>
      <ul className="divide-y divide-border">
        {rows.map((r) => (
          <TrackRow key={r.track.id} track={r.track} artist={r.artist} showArtist />
        ))}
      </ul>
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
