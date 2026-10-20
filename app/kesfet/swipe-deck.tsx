"use client";

import Link from "next/link";
import { Bookmark, Compass, Heart, MapPin, Play, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Cover } from "@/app/components/cover";
import { EmptyState } from "@/app/components/notice";
import { usePlayer } from "@/app/components/player";
import { genreLabel, toPlayerTrack } from "@/app/components/track-row";
import { VoteButton } from "@/app/components/vote-button";
import { CARD_SELECT, type DeckCard, type DiscoverFilters, feedArgs, swipeDecision, toCards } from "@/lib/discover";
import { cityName, labelOf, MOODS, TAGS } from "@/lib/music";
import { createClient } from "@/lib/supabase/client";

const BATCH = 20;
const REFILL_AT = 5;

// Keşfet destesi: sağa kaydır = beğen, sola = geç (ok tuşları ve butonlar da aynı işi yapar).
// Parça "en iyi an"dan çalar. Kurallar DB'de; girişsizde kaydırmalar sadece bu sayfada kalır.
export function SwipeDeck({
  initial,
  filters,
  viewerId,
}: {
  initial: DeckCard[];
  filters: DiscoverFilters;
  viewerId: string | null;
}) {
  const router = useRouter();
  const player = usePlayer();
  const [cards, setCards] = useState(initial);
  const [index, setIndex] = useState(0);
  const [dx, setDx] = useState(0);
  const [started, setStarted] = useState(false);
  const [ended, setEnded] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const seen = useRef(new Set(initial.map((c) => c.id)));
  const loading = useRef(false);
  const drag = useRef<{ x: number; width: number } | null>(null);
  const card = cards[index];

  function playCard(c: DeckCard) {
    player?.play({ ...toPlayerTrack(c, c.artist), startSec: c.hook_sec });
  }

  async function loadMore() {
    if (loading.current || ended) return;
    loading.current = true;
    setLoadingMore(true);
    const db = createClient();
    const { data } = await db.rpc("discover_feed", feedArgs(filters, BATCH));
    const ids = (data ?? []).map((r) => r.track_id).filter((id) => !seen.current.has(id));
    if (ids.length === 0) {
      setEnded(true);
    } else {
      const { data: rows } = await db.from("tracks").select(CARD_SELECT).in("id", ids);
      const fresh = toCards(ids, rows ?? []);
      fresh.forEach((c) => seen.current.add(c.id));
      setCards((cs) => [...cs, ...fresh]);
    }
    loading.current = false;
    setLoadingMore(false);
  }

  function decide(action: "like" | "skip") {
    if (!card) return;
    const next = cards[index + 1];
    setIndex((i) => i + 1);
    setDx(0);
    // Kullanıcı hareketiyle çağrıldığı için tarayıcı otomatik oynatmaya izin verir.
    if (next && started) playCard(next);
    else if (!next && player?.current?.id === card.id && player.playing) player.play(player.current);
    if (viewerId) {
      const db = createClient();
      const opts = { onConflict: "user_id,track_id", ignoreDuplicates: true };
      void db.from("swipes").upsert({ user_id: viewerId, track_id: card.id, action }, opts).then(() => {});
      if (action === "like") void db.from("likes").upsert({ user_id: viewerId, track_id: card.id }, opts).then(() => {});
    }
    if (cards.length - (index + 1) <= REFILL_AT) void loadMore();
  }

  async function save() {
    if (!card) return;
    if (!viewerId) return router.push("/giris");
    if (saved.has(card.id)) return;
    setSaved((s) => new Set(s).add(card.id));
    const { error } = await createClient()
      .from("saves")
      .upsert({ user_id: viewerId, track_id: card.id }, { onConflict: "user_id,track_id", ignoreDuplicates: true });
    if (error) setSaved((s) => { const n = new Set(s); n.delete(card.id); return n; });
  }

  // Ok tuşları (form alanındayken değil)
  const decideRef = useRef(decide);
  useEffect(() => {
    decideRef.current = decide;
  });
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLElement && e.target.closest("input, select, textarea")) return;
      if (e.key === "ArrowRight") decideRef.current("like");
      if (e.key === "ArrowLeft") decideRef.current("skip");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!card) {
    return (
      <EmptyState
        icon={Compass}
        title="Şimdilik bu kadar"
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Link href="/kesfet" className="btn-secondary">Filtreleri temizle</Link>
            <Link href="/sehir" className="btn-ghost">
              <MapPin aria-hidden className="size-4" strokeWidth={1.75} />
              Yakınındaki yetenekler
            </Link>
          </div>
        }
      >
        {loadingMore ? "Yeni parçalar yükleniyor…" : "Bu filtrelere uyan yeni parça kalmadı. Filtreleri değiştir ya da sonra tekrar gel."}
      </EmptyState>
    );
  }

  const isCurrent = player?.current?.id === card.id;
  const tags = [...card.tags.map((t) => labelOf(TAGS, t)), ...card.moods.map((m) => labelOf(MOODS, m))];
  const city = cityName(card.artist.city);

  return (
    <div className="flex flex-col gap-5">
      <div
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest("a, button")) return;
          drag.current = { x: e.clientX, width: e.currentTarget.offsetWidth };
          e.currentTarget.setPointerCapture(e.pointerId);
          setDragging(true);
        }}
        onPointerMove={(e) => drag.current && setDx(e.clientX - drag.current.x)}
        onPointerUp={() => {
          if (!drag.current) return;
          const d = swipeDecision(dx, drag.current.width);
          drag.current = null;
          setDragging(false);
          if (d) decide(d);
          else setDx(0);
        }}
        onPointerCancel={() => {
          drag.current = null;
          setDragging(false);
          setDx(0);
        }}
        style={{ transform: `translateX(${dx}px) rotate(${dx / 24}deg)` }}
        className={`card relative touch-pan-y overflow-hidden p-3 select-none ${dragging ? "" : "transition-transform duration-200"}`}
        aria-roledescription="Kaydırılabilir kart"
        aria-label={`${card.title}, ${card.artist.name}`}
      >
        <div className="relative">
          <Cover path={card.cover_path} title={card.title} className="pointer-events-none w-full" />
          {!started && (
            <button
              type="button"
              onClick={() => {
                setStarted(true);
                playCard(card);
              }}
              className="absolute inset-0 flex items-center justify-center rounded-xl bg-bg/45"
              aria-label="Dinlemeye başla"
            >
              <span className="flex size-20 items-center justify-center rounded-full bg-accent text-bg shadow-2xl">
                <Play aria-hidden className="ml-1 size-9" fill="currentColor" strokeWidth={0} />
              </span>
            </button>
          )}
          <span
            aria-hidden
            style={{ opacity: Math.min(1, Math.max(0, dx / 100)) }}
            className="absolute top-4 left-4 rounded-lg border-2 border-accent px-3 py-1 font-display text-xl font-extrabold text-accent"
          >
            BEĞEN
          </span>
          <span
            aria-hidden
            style={{ opacity: Math.min(1, Math.max(0, -dx / 100)) }}
            className="absolute top-4 right-4 rounded-lg border-2 border-text-muted px-3 py-1 font-display text-xl font-extrabold text-text-muted"
          >
            GEÇ
          </span>
        </div>
        <div className="flex flex-col gap-2 px-1 pt-4 pb-1">
          <h2 className="font-display text-[28px] leading-tight font-extrabold tracking-[-0.03em]">
            <Link href={`/p/${card.id}`} className="hover:underline">{card.title}</Link>
          </h2>
          <p className="text-sm text-text-muted">
            <Link href={`/${card.artist.username}`} className="font-medium text-text hover:underline">{card.artist.name}</Link>
            {" · "}
            {genreLabel(card.genre)}
            {city ? ` · ${city}` : ""}
          </p>
          {tags.length > 0 && (
            <ul className="flex flex-wrap gap-1.5">
              {tags.map((t) => (
                <li key={t} className="rounded-full bg-surface-2 px-2.5 py-1 text-xs text-text-muted">{t}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="flex items-center justify-center gap-5">
        <button type="button" onClick={() => decide("skip")} aria-label="Geç" className="icon-btn size-16">
          <X aria-hidden className="size-7" strokeWidth={1.75} />
        </button>
        <button type="button" onClick={save} aria-label="Kaydet" aria-pressed={saved.has(card.id)} className="icon-btn size-12">
          <Bookmark aria-hidden className="size-5" strokeWidth={1.75} fill={saved.has(card.id) ? "currentColor" : "none"} />
        </button>
        <button type="button" onClick={() => decide("like")} aria-label="Beğen" className="icon-btn size-16 border-accent/45 text-accent">
          <Heart aria-hidden className="size-7" strokeWidth={1.75} />
        </button>
      </div>

      {isCurrent && <VoteButton key={card.id} trackId={card.id} viewerId={viewerId} isOwner={false} listened={false} voted={false} />}
      {!viewerId && (
        <p className="text-center text-xs text-text-muted">
          <Link href="/giris" className="link">Giriş yaparsan</Link> beğenilerin kaydedilir ve geçtiğin parçalar tekrar gelmez.
        </p>
      )}
      <p className="hidden text-center text-xs text-text-muted md:block">İpucu: ← geç, → beğen</p>
    </div>
  );
}
