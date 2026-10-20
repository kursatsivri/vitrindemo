"use client";

import { Ban, Bookmark, Heart, Send, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Aç/kapa etkileşim: anında görünür değişir, sunucu reddederse geri alınır. Girişsizse giriş sayfasına.
function useToggle(initial: boolean, viewerId: string | null, add: () => PromiseLike<{ error: unknown }>, remove: () => PromiseLike<{ error: unknown }>) {
  const router = useRouter();
  const [on, setOn] = useState(initial);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (!viewerId) return router.push("/giris");
    if (busy) return;
    const next = !on;
    setOn(next);
    setBusy(true);
    const { error } = await (next ? add() : remove());
    setBusy(false);
    if (error) setOn(!next);
  }
  return { on, toggle };
}

const iconButton =
  "btn border border-border bg-surface text-text hover:border-text-muted/50 aria-pressed:border-accent/45 aria-pressed:bg-accent-soft aria-pressed:text-accent";

export function LikeSaveButtons({
  trackId,
  viewerId,
  liked,
  saved,
  likeCount,
}: {
  trackId: string;
  viewerId: string | null;
  liked: boolean;
  saved: boolean;
  likeCount: number;
}) {
  const db = createClient();
  const like = useToggle(
    liked,
    viewerId,
    () => db.from("likes").insert({ user_id: viewerId!, track_id: trackId }),
    () => db.from("likes").delete().eq("user_id", viewerId!).eq("track_id", trackId),
  );
  const save = useToggle(
    saved,
    viewerId,
    () => db.from("saves").insert({ user_id: viewerId!, track_id: trackId }),
    () => db.from("saves").delete().eq("user_id", viewerId!).eq("track_id", trackId),
  );
  const count = likeCount + Number(like.on) - Number(liked);

  return (
    <>
      <button type="button" onClick={like.toggle} aria-pressed={like.on} aria-label={like.on ? "Beğeniyi geri al" : "Beğen"} className={iconButton}>
        <Heart aria-hidden className="size-[18px]" fill={like.on ? "currentColor" : "none"} strokeWidth={1.75} />
        <span className="tabular-nums">{count}</span>
      </button>
      <button type="button" onClick={save.toggle} aria-pressed={save.on} className={iconButton}>
        <Bookmark aria-hidden className="size-[18px]" fill={save.on ? "currentColor" : "none"} strokeWidth={1.75} />
        {save.on ? "Kaydedildi" : "Kaydet"}
      </button>
    </>
  );
}

export function FollowButton({
  profileId,
  viewerId,
  following,
  followerCount,
}: {
  profileId: string;
  viewerId: string | null;
  following: boolean;
  followerCount: number;
}) {
  const db = createClient();
  const follow = useToggle(
    following,
    viewerId,
    () => db.from("follows").insert({ follower_id: viewerId!, followee_id: profileId }),
    () => db.from("follows").delete().eq("follower_id", viewerId!).eq("followee_id", profileId),
  );
  const count = followerCount + Number(follow.on) - Number(following);

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={follow.toggle}
        aria-pressed={follow.on}
        className={`${follow.on ? "btn-secondary" : "btn-primary"} h-12 px-7 text-[15px]`}
      >
        {follow.on ? "Takip ediliyor" : "Takip et"}
      </button>
      <span className="text-sm text-text-muted">
        <span className="font-medium text-text tabular-nums">{count}</span> takipçi
      </span>
    </div>
  );
}

// ── Keşifçi butonları (sadece onaylı keşifçiye gösterilir; kurallar DB'de) ──
export function FavoriteButton({ artistId, viewerId, favorited }: { artistId: string; viewerId: string | null; favorited: boolean }) {
  const db = createClient();
  const fav = useToggle(
    favorited,
    viewerId,
    () => db.from("scout_favorites").upsert({ scout_id: viewerId!, artist_id: artistId }, { onConflict: "scout_id,artist_id", ignoreDuplicates: true }),
    () => db.from("scout_favorites").delete().eq("scout_id", viewerId!).eq("artist_id", artistId),
  );
  return (
    <button type="button" onClick={fav.toggle} aria-pressed={fav.on} className={iconButton}>
      <Star aria-hidden className="size-[18px]" fill={fav.on ? "currentColor" : "none"} strokeWidth={1.75} />
      {fav.on ? "Favorilerde" : "Favorile"}
    </button>
  );
}

const INTEREST_LABELS: Record<string, string> = { pending: "İlgi gönderildi", accepted: "Eşleştiniz", declined: "İlgi reddedildi" };

// İlgi gönderilince geri alınamaz; reddedilen tekrar gönderilemez.
export function InterestButton({ artistId, status, open }: { artistId: string; status: string | null; open: boolean }) {
  const [state, setState] = useState(status);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function send() {
    setBusy(true);
    setError(null);
    const { error } = await createClient().rpc("send_interest", { p_artist: artistId });
    setBusy(false);
    if (error) setError(error.code === "P0001" ? error.message : "Gönderilemedi. Lütfen tekrar dene.");
    else setState("pending");
  }

  if (state) {
    return (
      <span className={`${iconButton} pointer-events-none ${state === "accepted" ? "border-accent/45 text-accent" : "text-text-muted"}`}>
        <Send aria-hidden className="size-[18px]" strokeWidth={1.75} />
        {INTEREST_LABELS[state]}
      </span>
    );
  }
  if (!open) return <span className="text-xs text-text-muted">Şu an ilgi almıyor</span>;
  return (
    <span className="flex flex-col items-center gap-1">
      <button type="button" onClick={send} disabled={busy} className="btn-primary">
        <Send aria-hidden className="size-[18px]" strokeWidth={1.75} />
        {busy ? "Gönderiliyor…" : "İlgi gönder"}
      </button>
      {error && <span role="alert" className="text-xs text-danger">{error}</span>}
    </span>
  );
}

// Engelle: engellenen sana yorum yapamaz, seni takip edemez, ilgi/başvuru gönderemez, bildirim üretmez.
export function BlockButton({ profileId, viewerId, blocked }: { profileId: string; viewerId: string | null; blocked: boolean }) {
  const db = createClient();
  const router = useRouter();
  const block = useToggle(
    blocked,
    viewerId,
    async () => {
      const r = await db.from("blocks").insert({ blocker_id: viewerId!, blocked_id: profileId });
      router.refresh();
      return r;
    },
    async () => {
      const r = await db.from("blocks").delete().eq("blocker_id", viewerId!).eq("blocked_id", profileId);
      router.refresh();
      return r;
    },
  );
  return (
    <button
      type="button"
      onClick={() => (block.on || confirm("Engellensin mi? Seni takip edemez, parçalarına yorum yapamaz.")) && block.toggle()}
      className="btn-ghost text-text-muted"
    >
      <Ban aria-hidden className="size-4" strokeWidth={1.75} />
      {block.on ? "Engeli kaldır" : "Engelle"}
    </button>
  );
}
