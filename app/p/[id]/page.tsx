import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, Pencil } from "lucide-react";
import { cache, Suspense } from "react";
import { Comments } from "@/app/components/comments";
import { Cover } from "@/app/components/cover";
import { LikeSaveButtons } from "@/app/components/interactions";
import { PlayButton } from "@/app/components/player";
import { BestRank } from "@/app/components/ranking";
import { RatingPanel } from "@/app/components/rating-panel";
import { ShareButton } from "@/app/components/share-button";
import { ReportButton } from "@/app/components/report-button";
import { toPlayerTrack } from "@/app/components/track-row";
import { VoteButton } from "@/app/components/vote-button";
import { Waveform } from "@/app/components/waveform";
import { GENRES, labelOf, MOODS, ratingCriteria, TAGS, TRACK_LINKS } from "@/lib/music";
import { createClient } from "@/lib/supabase/server";
import { timeAgo } from "@/lib/time";
import { formatDuration, periodStart, storageUrl } from "@/lib/tracks";

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
  const [{ count: likeCount }, comments, summary, totals, best, mine] = await Promise.all([
    supabase.from("likes").select("*", { count: "exact", head: true }).eq("track_id", track.id),
    supabase
      .from("comments")
      .select("id, body, at_sec, created_at, author_id, profiles!author_id(username, display_name, avatar_path)")
      .eq("track_id", track.id)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.rpc("rating_summary", { p_track: track.id }).single(),
    supabase.from("track_vote_totals").select("votes").eq("track_id", track.id).maybeSingle(),
    supabase
      .from("ranking_snapshots")
      .select("rank_genre, genre, period")
      .eq("track_id", track.id)
      .order("rank_genre")
      .limit(1)
      .maybeSingle(),
    viewerId
      ? Promise.all([
          supabase.from("likes").select("track_id").eq("track_id", track.id).eq("user_id", viewerId).maybeSingle(),
          supabase.from("saves").select("track_id").eq("track_id", track.id).maybeSingle(),
          supabase.from("ratings").select("s1, s2, s3, s4").eq("track_id", track.id).maybeSingle(),
          supabase.from("plays").select("day").eq("track_id", track.id).not("counted_at", "is", null).limit(1),
          supabase.from("votes").select("track_id").eq("track_id", track.id).eq("week_start", periodStart("week")).maybeSingle(),
          supabase.from("blocks").select("blocked_id"),
        ])
      : null,
  ]);
  // RLS: saves/ratings/plays/votes sadece kendi satırlarını döndürür.
  const [liked, saved, myRating, listened, myVote, myBlocks] = mine ?? [null, null, null, null, null, null];
  // Engellediğin kişilerin yorumları sana görünmez
  const blocked = new Set((myBlocks?.data ?? []).map((b) => b.blocked_id));

  const name = artist.display_name || artist.username;
  const playerTrack = toPlayerTrack(track, { name, username: artist.username });
  const feats = track.track_features.flatMap((f) => (f.profiles ? [f.profiles] : []));
  const links = (track.links ?? {}) as Record<string, string>;
  const chips = [
    ...track.tags.map((t) => labelOf(TAGS, t)),
    ...track.moods.map((m) => labelOf(MOODS, m)),
  ];

  return (
    <article className="flex flex-col gap-10">
      <header className="flex flex-col items-center gap-6 text-center sm:flex-row sm:items-end sm:gap-10 sm:text-left">
        <Cover path={track.cover_path} title={track.title} className="w-full max-w-72 shadow-[0_40px_120px_-30px] shadow-accent/35 sm:w-64" />
        <div className="flex min-w-0 flex-col items-center gap-2 sm:items-start">
          <span className="text-[13px] text-text-muted">
            {labelOf(GENRES, track.genre)}
            {track.duration_sec ? ` · ${formatDuration(track.duration_sec)}` : ""}
          </span>
          <h1 className="max-w-full font-display text-[40px] leading-none font-extrabold tracking-[-0.04em] break-words sm:text-6xl sm:tracking-[-0.045em]">
            {track.title}
          </h1>
          <p className="text-text-muted">
            <Link href={`/${artist.username}`} className="font-medium text-text hover:underline">
              {name}
            </Link>
            {feats.length > 0 && (
              <>
                {" feat. "}
                {feats.map((f, i) => (
                  <span key={f.username}>
                    {i > 0 && ", "}
                    <Link href={`/${f.username}`} className="hover:text-text hover:underline">
                      {f.display_name || f.username}
                    </Link>
                  </span>
                ))}
              </>
            )}
          </p>
          <BestRank best={best.data} />
          {track.status !== "active" && (
            <span className="rounded-full bg-danger/10 px-3 py-1 text-xs font-medium text-danger">Bu parça gizlendi; sadece sen görüyorsun.</span>
          )}
        </div>
      </header>

      <div className="flex items-center gap-4">
        <PlayButton track={playerTrack} size="lg" />
        <Waveform track={playerTrack} peaks={track.waveform} />
      </div>

      <VoteButton
        trackId={track.id}
        viewerId={viewerId}
        isOwner={isOwner}
        listened={(listened?.data ?? []).length > 0}
        voted={!!myVote?.data}
        votes={totals.data?.votes ?? 0}
      />

      <div className="flex flex-wrap items-center gap-2">
        <ShareButton title={`${track.title} — ${name}`} />
        {!isOwner && viewerId && <ReportButton targetType="track" targetId={track.id} viewerId={viewerId} />}
        <LikeSaveButtons
          trackId={track.id}
          viewerId={viewerId}
          liked={!!liked?.data}
          saved={!!saved?.data}
          likeCount={likeCount ?? 0}
        />
        {isOwner && (
          <Link href={`/parca/${track.id}/duzenle`} className="btn-secondary">
            <Pencil aria-hidden className="size-4" strokeWidth={1.75} />
            Düzenle
          </Link>
        )}
        {track.seeking_vocal && (
          <span className="inline-flex h-7 items-center rounded-full bg-accent-soft px-3 text-xs font-medium text-accent">
            Rapçi / vokal arıyor
          </span>
        )}
      </div>

      {chips.length > 0 && (
        <ul className="flex flex-wrap gap-2 text-sm">
          {chips.map((c) => (
            <li key={c} className="inline-flex h-7 items-center rounded-full bg-surface-2 px-3 text-[13px] text-text-muted">{c}</li>
          ))}
        </ul>
      )}

      {track.description && <p className="whitespace-pre-line text-text/90">{track.description}</p>}

      {TRACK_LINKS.some((l) => links[l.key]) && (
        <section className="flex flex-col gap-2">
          <h2 className="label">Diğer platformlarda</h2>
          <ul className="flex flex-wrap gap-2 text-sm">
            {TRACK_LINKS.filter((l) => links[l.key]).map((l) => (
              <li key={l.key}>
                <a
                  href={links[l.key]}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="chip gap-2"
                >
                  {l.label}
                  <ExternalLink aria-hidden className="size-3.5" strokeWidth={1.75} />
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
          c.profiles && !blocked.has(c.author_id)
            ? [{ id: c.id, body: c.body, atSec: c.at_sec, ago: timeAgo(c.created_at), authorId: c.author_id, author: c.profiles }]
            : [],
        )}
      />
    </article>
  );
}

export default function Page({ params }: PageProps<"/p/[id]">) {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 md:py-14">
      <Suspense
        fallback={
          <div aria-hidden className="flex flex-col items-center gap-6 sm:flex-row sm:items-end sm:gap-10">
            <div className="skeleton aspect-square w-full max-w-72 rounded-xl sm:w-64" />
            <div className="flex flex-col items-center gap-3 sm:items-start">
              <div className="skeleton h-10 w-64 sm:h-14 sm:w-80" />
              <div className="skeleton h-3.5 w-40" />
            </div>
          </div>
        }
      >
        <TrackPage params={params} />
      </Suspense>
    </main>
  );
}
