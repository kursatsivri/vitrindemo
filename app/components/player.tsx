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

type Player = { current: PlayerTrack | null; playing: boolean; play: (t: PlayerTrack) => void };
const PlayerContext = createContext<Player | null>(null);

// Dinleme kaydı (SPEC §3.3): parça başlayınca start_play, gerçekten dinlenen süre 30 sn'yi
// geçince count_play. 30 sn kuralını sunucu da kendi saatiyle kontrol eder; istek gecikmesi
// payı için 35. saniyede sorar, olmazsa 15 sn sonra tekrar dener.
const FIRST_CHECK_SEC = 35;
const RETRY_SEC = 15;

function newListen(trackId: string) {
  return { trackId, loggedIn: false, playing: false, started: false, counted: false, sec: 0, last: 0, nextCheck: FIRST_CHECK_SEC };
}

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [current, setCurrent] = useState<PlayerTrack | null>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  // Dinleme durumu parçaya bağlı tutulur (state değil ref: olay sırasında hep güncel).
  const listen = useRef(newListen(""));

  function startIfReady() {
    const l = listen.current;
    if (l.loggedIn && l.playing && !l.started) {
      l.started = true;
      createClient().rpc("start_play", { p_track: l.trackId }).then(() => {});
    }
  }

  function play(t: PlayerTrack) {
    const a = audio.current;
    if (!a) return;
    if (current?.id === t.id) {
      if (a.paused) a.play();
      else a.pause();
      return;
    }
    const l = newListen(t.id);
    listen.current = l;
    setCurrent(t);
    setTime(0);
    setDuration(0);
    a.src = storageUrl("tracks", t.audioPath);
    a.play();
    // Girişsiz dinleme sayılmaz (SPEC kararı); oturum yerel, hızlı okunur.
    createClient().auth.getSession().then(({ data }) => {
      l.loggedIn = !!data.session;
      startIfReady();
    });
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

    if (l.started && !l.counted && l.sec >= l.nextCheck) {
      l.counted = true;
      createClient()
        .rpc("count_play", { p_track: l.trackId })
        .then(({ data }) => {
          if (!data) {
            l.counted = false;
            l.nextCheck = l.sec + RETRY_SEC;
          }
        });
    }
  }

  function seek(e: React.ChangeEvent<HTMLInputElement>) {
    if (audio.current) audio.current.currentTime = Number(e.target.value);
  }

  function changeVolume(e: React.ChangeEvent<HTMLInputElement>) {
    const v = Number(e.target.value);
    setVolume(v);
    if (audio.current) audio.current.volume = v;
  }

  return (
    <PlayerContext.Provider value={{ current, playing, play }}>
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
              <Cover path={current.coverPath} title={current.title} className="w-12" />
              <div className="min-w-0 flex-1 sm:flex-none sm:w-48">
                <p className="truncate text-sm font-semibold">{current.title}</p>
                <Link href={`/${current.artistUsername}`} className="block truncate text-xs text-muted hover:underline">
                  {current.artistName}
                </Link>
              </div>
              <PlayButton track={current} large />
              <div className="hidden flex-1 items-center gap-2 text-xs text-subtle tabular-nums sm:flex">
                <span>{formatDuration(Math.floor(time)) || "0:00"}</span>
                <input
                  type="range"
                  min={0}
                  max={duration || 0}
                  step={1}
                  value={time}
                  onChange={seek}
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
  if (!player) return null;
  const active = player.current?.id === track.id && player.playing;
  return (
    <button
      type="button"
      onClick={() => player.play(track)}
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
