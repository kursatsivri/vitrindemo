"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Avatar } from "@/app/components/avatar";
import { Notice } from "@/app/components/notice";
import { ReportButton } from "@/app/components/report-button";
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
        <h2 className="font-display text-2xl font-bold tracking-[-0.03em]">
          Yorumlar <span className="text-base font-normal text-text-muted">{comments.length}</span>
        </h2>
        {isOwner && (
          <button type="button" onClick={toggleEnabled} className="text-sm text-text-muted hover:text-text">
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
              className="input h-auto resize-none py-3"
            />
            <div className="flex items-center justify-between gap-3">
              <label className={`flex items-center gap-2 text-xs ${isCurrent ? "text-text-muted" : "text-text-muted"}`}>
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
          <p className="text-sm text-text-muted">
            Yorum yapmak için <Link href="/giris" className="link">giriş yap</Link>.
          </p>
        )
      ) : (
        <p className="text-sm text-text-muted">Sanatçı bu parçada yorumları kapattı.</p>
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
                  <Link href={`/${c.author.username}`} className="font-medium hover:underline">
                    {c.author.display_name || c.author.username}
                  </Link>
                  {c.authorId === ownerId && <span className="ml-1.5 text-xs font-medium text-accent">Sanatçı</span>}
                  <span className="ml-2 text-xs text-text-muted">{c.ago}</span>
                </p>
                <p className="mt-0.5 whitespace-pre-line break-words text-sm text-text/90">
                  {c.atSec !== null && (
                    <button
                      type="button"
                      onClick={() => jump(c.atSec!)}
                      className="mr-1.5 rounded bg-accent-soft px-1.5 py-0.5 text-xs font-medium text-accent tabular-nums hover:brightness-125"
                    >
                      {formatDuration(c.atSec) || "0:00"}
                    </button>
                  )}
                  {c.body}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1 self-start">
                {(viewerId === c.authorId || isOwner) && (
                  <button type="button" onClick={() => remove(c.id)} className="text-xs text-text-muted hover:text-danger">
                    Sil
                  </button>
                )}
                {viewerId && viewerId !== c.authorId && <ReportButton targetType="comment" targetId={c.id} viewerId={viewerId} compact />}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
