"use client";

import Link from "next/link";
import { Pause, Play, SkipBack, SkipForward, Volume2, VolumeX } from "lucide-react";
import { createContext, useContext, useRef, useState } from "react";
import { Cover } from "@/app/components/cover";
import { createClient } from "@/lib/supabase/client";
import { formatDuration, storageUrl } from "@/lib/tracks";

export type PlayerTrack = {
  id: string;
  title: string;
  audioPath: string;
  coverPath: string | null;
  artistName: string;
  artistUsername: string;
};

type Player = {
  current: PlayerTrack | null;
  playing: boolean;
  time: number;
  duration: number;
  play: (t: PlayerTrack, queue?: PlayerTrack[]) => void;
  seekTo: (sec: number) => void;
};
const PlayerContext = createContext<Player | null>(null);

export function usePlayer() {
  return useContext(PlayerContext);
}

// Bir listedeki (akış, profil…) parçalar: oradan çalınan parça bitince sıradakine geçilir.
const QueueContext = createContext<PlayerTrack[] | null>(null);

export function TrackQueue({ tracks, children }: { tracks: PlayerTrack[]; children: React.ReactNode }) {
  return <QueueContext.Provider value={tracks}>{children}</QueueContext.Provider>;
}

// Dinleme kaydı (SPEC §4.3): parça başlayınca start_play, gerçekten dinlenen süre 30 sn'yi
// geçince count_play. 30 sn kuralını sunucu da kendi saatiyle kontrol eder; istek gecikmesi
// payı için 35. saniyede sorar, olmazsa 15 sn sonra tekrar dener (en fazla 3 kez; parça bugün
// zaten sayıldıysa sunucu her seferinde "hayır" der).
const FIRST_CHECK_SEC = 35;
const RETRY_SEC = 15;
const MAX_CHECKS = 3;

function newListen(trackId: string) {
  return { trackId, loggedIn: false, playing: false, started: false, done: false, checks: 0, sec: 0, last: 0, nextCheck: FIRST_CHECK_SEC };
}

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [current, setCurrent] = useState<PlayerTrack | null>(null);
  const [queue, setQueue] = useState<PlayerTrack[]>([]);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  // Dinleme durumu parçaya bağlı tutulur (state değil ref: olay sırasında hep güncel).
  const listen = useRef(newListen(""));

  const index = current ? queue.findIndex((t) => t.id === current.id) : -1;
  const nextTrack = index >= 0 ? queue[index + 1] : undefined;
  const prevTrack = index > 0 ? queue[index - 1] : undefined;

  function startIfReady() {
    const l = listen.current;
    if (l.loggedIn && l.playing && !l.started) {
      l.started = true;
      createClient().rpc("start_play", { p_track: l.trackId }).then(() => {});
    }
  }

  function load(t: PlayerTrack) {
    const a = audio.current;
    if (!a) return;
    const l = newListen(t.id);
    listen.current = l;
    setCurrent(t);
    setTime(0);
    setDuration(0);
    a.src = storageUrl("tracks", t.audioPath);
    // Yükleme sırasında duraklatılırsa play() reddedilir; zararsız.
    a.play().catch(() => {});
    // Girişsiz dinleme sayılmaz (SPEC kararı); oturum yerel, hızlı okunur.
    createClient().auth.getSession().then(({ data }) => {
      l.loggedIn = !!data.session;
      startIfReady();
    });
  }

  function play(t: PlayerTrack, list?: PlayerTrack[]) {
    const a = audio.current;
    if (!a) return;
    if (current?.id === t.id) {
      if (a.paused) a.play().catch(() => {});
      else a.pause();
      return;
    }
    setQueue(list ?? [t]);
    load(t);
  }

  function prev() {
    // Şarkının başındaysan önceki parçaya, değilsen başa dön (alışılmış davranış).
    if (audio.current && audio.current.currentTime > 3) audio.current.currentTime = 0;
    else if (prevTrack) load(prevTrack);
  }

  function seekTo(sec: number) {
    if (audio.current) audio.current.currentTime = sec;
  }

  function onPlaying() {
    setPlaying(true);
    listen.current.playing = true;
    startIfReady();
  }

  function onTimeUpdate() {
    const a = audio.current;
    if (!a || !current) return;
    setTime(a.currentTime);
    const l = listen.current;
    // Sadece gerçekten çalınan süreyi say; ileri sarma (büyük sıçrama) sayılmaz.
    const delta = a.currentTime - l.last;
    if (!a.paused && delta > 0 && delta < 2) l.sec += delta;
    l.last = a.currentTime;

    if (l.started && !l.done && l.sec >= l.nextCheck) {
      l.done = true;
      l.checks += 1;
      createClient()
        .rpc("count_play", { p_track: l.trackId })
        .then(({ data }) => {
          if (!data && l.checks < MAX_CHECKS) {
            l.done = false;
            l.nextCheck = l.sec + RETRY_SEC;
          }
        });
    }
  }

  function changeVolume(e: React.ChangeEvent<HTMLInputElement>) {
    const v = Number(e.target.value);
    setVolume(v);
    if (audio.current) audio.current.volume = v;
  }

  const stepButton =
    "flex size-10 items-center justify-center rounded-full text-text-muted transition duration-150 hover:text-text disabled:opacity-30";
  const fmt = (sec: number) => formatDuration(Math.floor(sec)) || "0:00";

  return (
    <PlayerContext.Provider value={{ current, playing, time, duration, play, seekTo }}>
      {children}
      <audio
        ref={audio}
        onPlaying={onPlaying}
        onPause={() => {
          setPlaying(false);
          listen.current.playing = false;
        }}
        onEnded={() => {
          setPlaying(false);
          listen.current.playing = false;
          if (nextTrack) load(nextTrack);
        }}
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
      />
      {current && (
        <>
          {/* Sabit oynatıcı içeriği örtmesin */}
          <div className="h-[72px] md:h-[88px]" aria-hidden />
          <div
            role="region"
            aria-label="Oynatıcı"
            className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/80 backdrop-blur-xl"
          >
            {/* Mobilde ilerleme üstte ince şerit */}
            <div className="h-0.5 bg-border md:hidden">
              <div className="h-full bg-accent" style={{ width: duration ? `${(time / duration) * 100}%` : 0 }} />
            </div>
            <div className="mx-auto flex h-[70px] w-full max-w-[1200px] items-center gap-3 pr-3 pl-4 md:h-[88px] md:gap-8 md:px-10">
              <div className="flex min-w-0 flex-1 items-center gap-3 md:gap-3.5">
                <Link href={`/p/${current.id}`} className="shrink-0">
                  <Cover path={current.coverPath} title={current.title} className="w-11 rounded-lg md:w-14" />
                </Link>
                <div className="min-w-0">
                  <Link href={`/p/${current.id}`} className="block truncate text-sm font-medium hover:underline md:text-[15px]">
                    {current.title}
                  </Link>
                  <Link href={`/${current.artistUsername}`} className="block truncate text-xs text-text-muted hover:underline md:text-[13px]">
                    {current.artistName}
                  </Link>
                </div>
              </div>

              <div className="flex shrink-0 flex-col items-center gap-2 md:flex-[2] md:basis-0">
                <div className="flex items-center gap-1 md:gap-4">
                  <button type="button" onClick={prev} aria-label="Önceki" className={`${stepButton} hidden md:flex`}>
                    <SkipBack aria-hidden className="size-5" strokeWidth={1.75} />
                  </button>
                  <PlayButton track={current} size="md" />
                  <button
                    type="button"
                    onClick={() => nextTrack && load(nextTrack)}
                    disabled={!nextTrack}
                    aria-label="Sonraki"
                    className={`${stepButton} text-text md:text-text`}
                  >
                    <SkipForward aria-hidden className="size-5" strokeWidth={1.75} />
                  </button>
                </div>
                <div className="hidden w-full items-center gap-3 text-xs text-text-muted tabular-nums md:flex">
                  <span className="w-9 text-right">{fmt(time)}</span>
                  <input
                    type="range"
                    min={0}
                    max={duration || 0}
                    step={1}
                    value={time}
                    onChange={(e) => seekTo(Number(e.target.value))}
                    aria-label="İlerleme"
                    className="h-1 flex-1 cursor-pointer accent-accent"
                  />
                  <span className="w-9">{fmt(duration)}</span>
                </div>
              </div>

              <div className="hidden flex-1 items-center justify-end gap-2.5 text-text-muted lg:flex">
                {volume === 0 ? (
                  <VolumeX aria-hidden className="size-5" strokeWidth={1.75} />
                ) : (
                  <Volume2 aria-hidden className="size-5" strokeWidth={1.75} />
                )}
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={volume}
                  onChange={changeVolume}
                  aria-label="Ses"
                  className="h-1 w-28 cursor-pointer accent-text"
                />
              </div>
            </div>
          </div>
        </>
      )}
    </PlayerContext.Provider>
  );
}

const PLAY_SIZES = { sm: "size-10", md: "size-11", lg: "size-14 md:size-[60px]" };

export function PlayButton({
  track,
  size = "sm",
  number,
  className = "",
}: {
  track: PlayerTrack;
  size?: keyof typeof PLAY_SIZES;
  number?: string;
  className?: string;
}) {
  const player = useContext(PlayerContext);
  const queue = useContext(QueueContext);
  if (!player) return null;
  const active = player.current?.id === track.id && player.playing;
  const Icon = active ? Pause : Play;
  const label = active ? `${track.title} duraklat` : `${track.title} oynat`;
  // Liste satırı: sıra numarası görünür, satır hover/odakta veya çalarken ikona döner.
  if (number) {
    return (
      <button
        type="button"
        onClick={() => player.play(track, queue ?? undefined)}
        aria-label={label}
        className="group/play flex size-8 shrink-0 items-center justify-center rounded-full font-display text-[15px] font-bold text-accent tabular-nums"
      >
        <span className={active ? "hidden" : "group-hover:hidden group-focus-within:hidden"}>{number}</span>
        <span
          className={`size-8 items-center justify-center rounded-full bg-accent text-bg ${active ? "flex" : "hidden group-hover:flex group-focus-within:flex"}`}
        >
          <Icon aria-hidden className="size-3.5" fill="currentColor" strokeWidth={active ? 0 : 2} strokeLinejoin="round" />
        </span>
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={() => player.play(track, queue ?? undefined)}
      aria-label={label}
      className={`flex shrink-0 items-center justify-center rounded-full bg-accent text-bg transition duration-150 hover:brightness-110 ${PLAY_SIZES[size]} ${className}`}
    >
      <Icon aria-hidden className={size === "lg" ? "size-6" : "size-[18px]"} fill="currentColor" strokeWidth={active ? 0 : 2} strokeLinejoin="round" />
    </button>
  );
}
