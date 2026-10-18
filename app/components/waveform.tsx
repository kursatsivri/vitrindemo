"use client";

import { usePlayer, type PlayerTrack } from "@/app/components/player";

// Parça sayfasındaki ses dalgası: çalan parçaysa ilerlemeyi boyar, tıklanan yere sarar.
// Dalgası olmayan (eski) parçalarda düz çubuk gösterilir.
export function Waveform({ track, peaks }: { track: PlayerTrack; peaks: number[] | null }) {
  const player = usePlayer();
  const isCurrent = player?.current?.id === track.id;
  const progress = isCurrent && player.duration ? player.time / player.duration : 0;

  function onClick(e: React.MouseEvent<HTMLButtonElement>) {
    if (!player) return;
    if (!isCurrent) return player.play(track);
    const box = e.currentTarget.getBoundingClientRect();
    player.seekTo(((e.clientX - box.left) / box.width) * player.duration);
  }

  const bars = peaks && peaks.length ? peaks : null;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={isCurrent ? "Parçada konuma git" : `${track.title} oynat`}
      className="group flex h-20 w-full items-center gap-[2px]"
    >
      {bars ? (
        bars.map((h, i) => (
          <span
            key={i}
            className={`flex-1 rounded-full transition-colors ${i / bars.length < progress ? "bg-accent" : "bg-surface-2 group-hover:bg-border"}`}
            style={{ height: `${Math.max(6, h)}%` }}
          />
        ))
      ) : (
        <span className="relative h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
          <span className="absolute inset-y-0 left-0 bg-accent" style={{ width: `${progress * 100}%` }} />
        </span>
      )}
    </button>
  );
}
