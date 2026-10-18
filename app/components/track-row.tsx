import Link from "next/link";
import { Cover } from "@/app/components/cover";
import { PlayButton } from "@/app/components/player";
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

const STATUS_LABELS: Record<string, string> = { hidden: "Gizlendi", removed: "Kaldırıldı" };

// Parça satırı: profil ve akış listelerinde ortak. Sahibine düzenle linki gösterir.
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
      <PlayButton
        track={{
          id: track.id,
          title: track.title,
          audioPath: track.audio_path,
          coverPath: track.cover_path,
          artistName: artist.name,
          artistUsername: artist.username,
        }}
      />
      <Cover path={track.cover_path} title={track.title} className="w-14" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">
          {featured && <span className="mr-2 text-xs font-semibold uppercase tracking-wider text-accent">Öne çıkan</span>}
          {track.title}
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
