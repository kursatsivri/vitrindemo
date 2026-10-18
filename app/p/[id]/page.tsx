import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache, Suspense } from "react";
import { Cover } from "@/app/components/cover";
import { PlayButton } from "@/app/components/player";
import { ShareButton } from "@/app/components/share-button";
import { toPlayerTrack } from "@/app/components/track-row";
import { Waveform } from "@/app/components/waveform";
import { GENRES, labelOf, MOODS, TAGS, TRACK_LINKS } from "@/lib/music";
import { createClient } from "@/lib/supabase/server";
import { formatDuration, storageUrl } from "@/lib/tracks";

// generateMetadata ve sayfa aynı isteği paylaşır.
const getTrack = cache(async (id: string) => {
  const supabase = await createClient();
  const [{ data: track }, { data: claims }] = await Promise.all([
    supabase
      .from("tracks")
      .select(
        "id, artist_id, title, genre, tags, moods, description, audio_path, cover_path, duration_sec, waveform, links, seeking_vocal, status, created_at, profiles!artist_id(username, display_name), track_features(profiles(username, display_name))",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase.auth.getClaims(),
  ]);
  return track && track.profiles ? { track, artist: track.profiles, viewerId: claims?.claims.sub } : null;
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
  const { track, artist, viewerId } = found;

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
        {viewerId === track.artist_id && (
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
