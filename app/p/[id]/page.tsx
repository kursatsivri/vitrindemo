import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache, Suspense } from "react";
import { Comments } from "@/app/components/comments";
import { Cover } from "@/app/components/cover";
import { LikeSaveButtons } from "@/app/components/interactions";
import { PlayButton } from "@/app/components/player";
import { RatingPanel } from "@/app/components/rating-panel";
import { ShareButton } from "@/app/components/share-button";
import { toPlayerTrack } from "@/app/components/track-row";
import { Waveform } from "@/app/components/waveform";
import { GENRES, labelOf, MOODS, ratingCriteria, TAGS, TRACK_LINKS } from "@/lib/music";
import { createClient } from "@/lib/supabase/server";
import { timeAgo } from "@/lib/time";
import { formatDuration, storageUrl } from "@/lib/tracks";

// generateMetadata ve sayfa aynı isteği paylaşır.
const getTrack = cache(async (id: string) => {
  const supabase = await createClient();
  const [{ data: track }, { data: claims }] = await Promise.all([
    supabase
      .from("tracks")
      .select(
        "id, artist_id, title, genre, tags, moods, description, audio_path, cover_path, duration_sec, waveform, links, seeking_vocal, status, comments_enabled, created_at, profiles!artist_id(username, display_name), track_features(profiles(username, display_name))",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase.auth.getClaims(),
  ]);
  return track && track.profiles
    ? { supabase, track, artist: track.profiles, viewerId: (claims?.claims.sub as string | undefined) ?? null }
    : null;
});

// Not: `next dev`te bot (WhatsApp vb.) isteğinde "did not produce a static shell" invariant
// uyarısı loglanır; yanıt doğrudur ve production build'de (next start) çıkmaz — Next.js hatası.
export async function generateMetadata({ params }: PageProps<"/p/[id]">): Promise<Metadata> {
  const found = await getTrack((await params).id);
  if (!found) return { title: "Parça bulunamadı — Vitrin" };
  const { track, artist } = found;
  const name = artist.display_name || artist.username;
  const title = `${track.title} — ${name}`;
  const description = `${labelOf(GENRES, track.genre)} · Vitrin'de dinle ve oy ver`;
  const images = track.cover_path ? [{ url: storageUrl("covers", track.cover_path), alt: track.title }] : [];
  return {
    title: `${title} | Vitrin`,
    description,
    openGraph: { title, description, images, type: "music.song" },
    twitter: { card: images.length ? "summary_large_image" : "summary", title, description },
  };
}

async function TrackPage({ params }: { params: PageProps<"/p/[id]">["params"] }) {
  const found = await getTrack((await params).id);
  if (!found) notFound();
  const { supabase, track, artist, viewerId } = found;
  const isOwner = viewerId === track.artist_id;

  // ponytail: son 100 yorum; çok yorumlu parçalarda "daha fazla" ekle.
  const [{ count: likeCount }, comments, summary, mine] = await Promise.all([
    supabase.from("likes").select("*", { count: "exact", head: true }).eq("track_id", track.id),
    supabase
      .from("comments")
      .select("id, body, at_sec, created_at, author_id, profiles!author_id(username, display_name, avatar_path)")
      .eq("track_id", track.id)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.rpc("rating_summary", { p_track: track.id }).single(),
    viewerId
      ? Promise.all([
          supabase.from("likes").select("track_id").eq("track_id", track.id).eq("user_id", viewerId).maybeSingle(),
          supabase.from("saves").select("track_id").eq("track_id", track.id).maybeSingle(),
          supabase.from("ratings").select("s1, s2, s3, s4").eq("track_id", track.id).maybeSingle(),
          supabase.from("plays").select("day").eq("track_id", track.id).not("counted_at", "is", null).limit(1),
        ])
      : null,
  ]);
  // RLS: saves/ratings/plays sadece kendi satırlarını döndürür.
  const [liked, saved, myRating, listened] = mine ?? [null, null, null, null];

  const name = artist.display_name || artist.username;
  const playerTrack = toPlayerTrack(track, { name, username: artist.username });
  const feats = track.track_features.flatMap((f) => (f.profiles ? [f.profiles] : []));
  const links = (track.links ?? {}) as Record<string, string>;
  const chips = [
    ...track.tags.map((t) => labelOf(TAGS, t)),
    ...track.moods.map((m) => labelOf(MOODS, m)),
  ];

  return (
    <article className="flex flex-col gap-8">
      <header className="flex flex-col items-center gap-6 text-center sm:flex-row sm:items-end sm:text-left">
        <Cover path={track.cover_path} title={track.title} className="w-56 rounded-2xl shadow-2xl shadow-accent/10" />
        <div className="flex min-w-0 flex-col items-center gap-2 sm:items-start">
          <span className="text-xs font-semibold uppercase tracking-widest text-accent">
            {labelOf(GENRES, track.genre)}
            {track.duration_sec ? ` · ${formatDuration(track.duration_sec)}` : ""}
          </span>
          <h1 className="font-display text-4xl font-bold tracking-tight break-words sm:text-5xl">{track.title}</h1>
          <p className="text-muted">
            <Link href={`/${artist.username}`} className="font-semibold text-foreground hover:underline">
              {name}
            </Link>
            {feats.length > 0 && (
              <>
                {" feat. "}
                {feats.map((f, i) => (
                  <span key={f.username}>
                    {i > 0 && ", "}
                    <Link href={`/${f.username}`} className="hover:text-foreground hover:underline">
                      {f.display_name || f.username}
                    </Link>
                  </span>
                ))}
              </>
            )}
          </p>
          {track.status !== "active" && (
            <span className="rounded-full bg-red-950/60 px-2 py-0.5 text-xs text-red-200">Bu parça gizlendi; sadece sen görüyorsun.</span>
          )}
        </div>
      </header>

      <div className="flex items-center gap-4">
        <PlayButton track={playerTrack} large />
        <Waveform track={playerTrack} peaks={track.waveform} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <ShareButton title={`${track.title} — ${name}`} />
        <LikeSaveButtons
          trackId={track.id}
          viewerId={viewerId}
          liked={!!liked?.data}
          saved={!!saved?.data}
          likeCount={likeCount ?? 0}
        />
        {isOwner && (
          <Link href={`/parca/${track.id}/duzenle`} className="btn-secondary">
            Düzenle
          </Link>
        )}
        {track.seeking_vocal && (
          <span className="rounded-full border border-accent/50 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
            Rapçi / vokal arıyor
          </span>
        )}
      </div>

      {chips.length > 0 && (
        <ul className="flex flex-wrap gap-2 text-sm">
          {chips.map((c) => (
            <li key={c} className="rounded-full bg-surface-2 px-3 py-1 text-muted">{c}</li>
          ))}
        </ul>
      )}

      {track.description && <p className="whitespace-pre-line text-foreground/90">{track.description}</p>}

      {TRACK_LINKS.some((l) => links[l.key]) && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-muted">Diğer platformlarda</h2>
          <ul className="flex flex-wrap gap-2 text-sm">
            {TRACK_LINKS.filter((l) => links[l.key]).map((l) => (
              <li key={l.key}>
                <a
                  href={links[l.key]}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="block rounded-full border border-border px-3 py-1 text-muted transition-colors hover:border-subtle hover:text-foreground"
                >
                  {l.label} ↗
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <RatingPanel
        trackId={track.id}
        viewerId={viewerId}
        criteria={ratingCriteria(track.genre)}
        isOwner={isOwner}
        canRate={(listened?.data ?? []).length > 0}
        mine={myRating?.data ? [myRating.data.s1, myRating.data.s2, myRating.data.s3, myRating.data.s4] : null}
        summary={{
          n: summary.data?.n ?? 0,
          avgs: [summary.data?.a1 ?? null, summary.data?.a2 ?? null, summary.data?.a3 ?? null, summary.data?.a4 ?? null],
        }}
      />

      <Comments
        track={playerTrack}
        viewerId={viewerId}
        ownerId={track.artist_id}
        enabled={track.comments_enabled}
        comments={(comments.data ?? []).flatMap((c) =>
          c.profiles
            ? [{ id: c.id, body: c.body, atSec: c.at_sec, ago: timeAgo(c.created_at), authorId: c.author_id, author: c.profiles }]
            : [],
        )}
      />
    </article>
  );
}

export default function Page({ params }: PageProps<"/p/[id]">) {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <Suspense fallback={<p className="text-muted">Yükleniyor…</p>}>
        <TrackPage params={params} />
      </Suspense>
    </main>
  );
}
