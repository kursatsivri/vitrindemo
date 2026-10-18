"use client";

import { Bookmark, Heart } from "lucide-react";
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
