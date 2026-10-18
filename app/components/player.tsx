"use client";

import Link from "next/link";
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

  const stepButton = "hidden size-9 items-center justify-center rounded-full text-muted transition-colors hover:text-foreground disabled:opacity-30 sm:flex";

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
          <div className="h-24" aria-hidden />
          <div
            role="region"
            aria-label="Oynatıcı"
            className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur"
          >
            <div className="mx-auto flex h-20 w-full max-w-5xl items-center gap-3 px-4">
              <Link href={`/p/${current.id}`} className="shrink-0">
                <Cover path={current.coverPath} title={current.title} className="w-12" />
              </Link>
              <div className="min-w-0 flex-1 sm:w-48 sm:flex-none">
                <Link href={`/p/${current.id}`} className="block truncate text-sm font-semibold hover:underline">
                  {current.title}
                </Link>
                <Link href={`/${current.artistUsername}`} className="block truncate text-xs text-muted hover:underline">
                  {current.artistName}
                </Link>
              </div>
              <button type="button" onClick={prev} aria-label="Önceki" className={stepButton}>
                <svg viewBox="0 0 24 24" className="size-5 fill-current" aria-hidden><path d="M6 5h2v14H6zM20 5v14L9 12z" /></svg>
              </button>
              <PlayButton track={current} large />
              <button type="button" onClick={() => nextTrack && load(nextTrack)} disabled={!nextTrack} aria-label="Sonraki" className={stepButton}>
                <svg viewBox="0 0 24 24" className="size-5 fill-current" aria-hidden><path d="M16 5h2v14h-2zM4 5v14l11-7z" /></svg>
              </button>
              <div className="hidden flex-1 items-center gap-2 text-xs text-subtle tabular-nums sm:flex">
                <span>{formatDuration(Math.floor(time)) || "0:00"}</span>
                <input
                  type="range"
                  min={0}
                  max={duration || 0}
                  step={1}
                  value={time}
                  onChange={(e) => seekTo(Number(e.target.value))}
                  aria-label="İlerleme"
                  className="flex-1 accent-accent"
                />
                <span>{formatDuration(Math.floor(duration)) || "0:00"}</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={volume}
                onChange={changeVolume}
                aria-label="Ses"
                className="hidden w-24 accent-foreground md:block"
              />
            </div>
            {/* Mobilde ilerleme çubuğu en altta ince şerit */}
            <div className="h-1 bg-surface-2 sm:hidden">
              <div className="h-full bg-accent" style={{ width: duration ? `${(time / duration) * 100}%` : 0 }} />
            </div>
          </div>
        </>
      )}
    </PlayerContext.Provider>
  );
}

export function PlayButton({ track, large = false }: { track: PlayerTrack; large?: boolean }) {
  const player = useContext(PlayerContext);
  const queue = useContext(QueueContext);
  if (!player) return null;
  const active = player.current?.id === track.id && player.playing;
  return (
    <button
      type="button"
      onClick={() => player.play(track, queue ?? undefined)}
      aria-label={active ? `${track.title} duraklat` : `${track.title} oynat`}
      className={`flex shrink-0 items-center justify-center rounded-full transition-colors ${
        large ? "size-11 bg-foreground text-background hover:bg-white" : "size-10 bg-accent text-black hover:bg-accent-hover"
      }`}
    >
      <svg viewBox="0 0 24 24" className="size-5 fill-current" aria-hidden>
        {active ? <path d="M7 5h4v14H7zM13 5h4v14h-4z" /> : <path d="M8 5.5v13l11-6.5z" />}
      </svg>
    </button>
  );
}
