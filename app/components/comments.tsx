"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Avatar } from "@/app/components/avatar";
import { Notice } from "@/app/components/notice";
import { usePlayer, type PlayerTrack } from "@/app/components/player";
import { createClient } from "@/lib/supabase/client";
import { formatDuration } from "@/lib/tracks";

export type CommentItem = {
  id: string;
  body: string;
  atSec: number | null;
  ago: string;
  authorId: string;
  author: { username: string; display_name: string | null; avatar_path: string | null };
};

const ERRORS: Record<string, string> = {
  profanity: "Bu yorum uygunsuz bir ifade içeriyor, gönderilemez.",
  rate_limit: "Çok hızlı yorum yapıyorsun. Biraz bekle.",
};

// Yorumlar (SPEC §4.5): herkese açık; yazan kendi yorumunu, parça sahibi hepsini siler; sahip kapatabilir.
// Kurallar DB'de (RLS + küfür/spam trigger'ı); burada sadece arayüz.
export function Comments({
  track,
  comments,
  viewerId,
  ownerId,
  enabled,
}: {
  track: PlayerTrack;
  comments: CommentItem[];
  viewerId: string | null;
  ownerId: string;
  enabled: boolean;
}) {
  const router = useRouter();
  const player = usePlayer();
  const db = createClient();
  const [body, setBody] = useState("");
  const [pinTime, setPinTime] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const isCurrent = player?.current?.id === track.id;
  const isOwner = viewerId === ownerId;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!viewerId) return router.push("/giris");
    setBusy(true);
    setError("");
    const { error } = await db.from("comments").insert({
      track_id: track.id,
      author_id: viewerId,
      body: body.trim(),
      at_sec: pinTime && isCurrent && player ? Math.floor(player.time) : null,
    });
    setBusy(false);
    if (error) return setError(ERRORS[error.hint ?? ""] ?? "Yorum gönderilemedi. Tekrar dene.");
    setBody("");
    setPinTime(false);
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("Yorum silinsin mi?")) return;
    await db.from("comments").delete().eq("id", id);
    router.refresh();
  }

  async function toggleEnabled() {
    await db.from("tracks").update({ comments_enabled: !enabled }).eq("id", track.id);
    router.refresh();
  }

  function jump(sec: number) {
    if (!player) return;
    if (isCurrent) player.seekTo(sec);
    else player.play(track);
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-display text-xl font-semibold">
          Yorumlar <span className="text-base font-normal text-muted">{comments.length}</span>
        </h2>
        {isOwner && (
          <button type="button" onClick={toggleEnabled} className="text-sm text-muted hover:text-foreground">
            {enabled ? "Yorumları kapat" : "Yorumları aç"}
          </button>
        )}
      </div>

      {enabled ? (
        viewerId ? (
          <form onSubmit={submit} className="flex flex-col gap-2">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={500}
              rows={2}
              required
              placeholder="Ne düşünüyorsun?"
              className="input"
            />
            <div className="flex items-center justify-between gap-3">
              <label className={`flex items-center gap-2 text-xs ${isCurrent ? "text-muted" : "text-subtle"}`}>
                <input
                  type="checkbox"
                  checked={pinTime && isCurrent}
                  disabled={!isCurrent}
                  onChange={(e) => setPinTime(e.target.checked)}
                  className="accent-accent"
                />
                {isCurrent ? `Şu anki saniyeye bağla (${formatDuration(Math.floor(player!.time)) || "0:00"})` : "Saniyeye bağlamak için parçayı çal"}
              </label>
              <button type="submit" disabled={busy || !body.trim()} className="btn-primary py-2">
                {busy ? "Gönderiliyor…" : "Gönder"}
              </button>
            </div>
            {error && <Notice tone="error">{error}</Notice>}
          </form>
        ) : (
          <p className="text-sm text-muted">
            Yorum yapmak için <Link href="/giris" className="link">giriş yap</Link>.
          </p>
        )
      ) : (
        <p className="text-sm text-muted">Sanatçı bu parçada yorumları kapattı.</p>
      )}

      {comments.length > 0 && (
        <ul className="flex flex-col divide-y divide-border">
          {comments.map((c) => (
            <li key={c.id} className="flex gap-3 py-3">
              <Link href={`/${c.author.username}`} className="shrink-0">
                <Avatar path={c.author.avatar_path} name={c.author.display_name || c.author.username} size={36} />
              </Link>
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  <Link href={`/${c.author.username}`} className="font-semibold hover:underline">
                    {c.author.display_name || c.author.username}
                  </Link>
                  {c.authorId === ownerId && <span className="ml-1.5 text-xs font-semibold text-accent">Sanatçı</span>}
                  <span className="ml-2 text-xs text-subtle">{c.ago}</span>
                </p>
                <p className="mt-0.5 whitespace-pre-line break-words text-sm text-foreground/90">
                  {c.atSec !== null && (
                    <button
                      type="button"
                      onClick={() => jump(c.atSec!)}
                      className="mr-1.5 rounded bg-accent/15 px-1.5 py-0.5 text-xs font-semibold text-accent tabular-nums hover:bg-accent/25"
                    >
                      {formatDuration(c.atSec) || "0:00"}
                    </button>
                  )}
                  {c.body}
                </p>
              </div>
              {(viewerId === c.authorId || isOwner) && (
                <button type="button" onClick={() => remove(c.id)} className="self-start text-xs text-subtle hover:text-red-300">
                  Sil
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
