import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Avatar } from "@/app/components/avatar";
import { FollowButton } from "@/app/components/interactions";
import { TrackQueue } from "@/app/components/player";
import { toPlayerTrack, TrackRow } from "@/app/components/track-row";
import { cityName, GENRES } from "@/lib/music";
import { ROLE_LABELS, SOCIALS } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

async function Profile({ params }: { params: PageProps<"/[username]">["params"] }) {
  const { username } = await params;
  const supabase = await createClient();

  const [{ data: profile }, { data: claims }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, role, username, display_name, bio, genres, socials, avatar_path, city, open_to_discovery, featured_track_id")
      .eq("username", decodeURIComponent(username).toLowerCase())
      .maybeSingle(),
    supabase.auth.getClaims(),
  ]);
  if (!profile) notFound();

  const name = profile.display_name || profile.username;
  const socials = (profile.socials ?? {}) as Record<string, string>;
  const viewerId = (claims?.claims.sub as string | undefined) ?? null;
  const isOwner = viewerId === profile.id;
  const isArtist = profile.role === "artist";

  const [{ count: followers }, { count: following }, { data: myFollow }] = await Promise.all([
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("followee_id", profile.id),
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", profile.id),
    viewerId && !isOwner
      ? supabase.from("follows").select("followee_id").eq("follower_id", viewerId).eq("followee_id", profile.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  // Gizlenen parçaları RLS sadece sahibine döndürür.
  const { data: tracks, error } = isArtist
    ? await supabase
        .from("tracks")
        .select("id, title, genre, audio_path, cover_path, duration_sec, status")
        .eq("artist_id", profile.id)
        .order("created_at", { ascending: false })
    : { data: [], error: null };
  if (error) throw new Error(`Parçalar yüklenemedi: ${error.message}`);
  // Öne çıkan parça listenin başında
  const ordered = [...(tracks ?? [])].sort(
    (x, y) => Number(y.id === profile.featured_track_id) - Number(x.id === profile.featured_track_id),
  );
  const city = cityName(profile.city);

  return (
    <article className="flex flex-col gap-6">
      <header className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-end sm:text-left">
        <Avatar path={profile.avatar_path} name={name} size={128} />
        <div className="flex flex-col items-center gap-2 sm:items-start">
          <span className="text-xs font-semibold uppercase tracking-widest text-accent">
            {ROLE_LABELS[profile.role]}
          </span>
          <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">{name}</h1>
          <p className="text-sm text-muted">
            @{profile.username}
            {city && <> · {city}</>}
          </p>
          {isArtist && profile.open_to_discovery && (
            <span className="w-fit rounded-full border border-emerald-800 bg-emerald-950/50 px-2.5 py-0.5 text-xs font-medium text-emerald-300">
              Keşfedilmeye açık
            </span>
          )}
        </div>
      </header>

      {profile.bio && (
        <p className="whitespace-pre-line text-center text-foreground/90 sm:text-left">{profile.bio}</p>
      )}

      {(profile.genres.length > 0 || SOCIALS.some((s) => socials[s.key])) && (
        <ul className="flex flex-wrap justify-center gap-2 text-sm sm:justify-start">
          {GENRES.filter((g) => profile.genres.includes(g.value)).map((g) => (
            <li key={g.value} className="rounded-full bg-accent/10 px-3 py-1 font-medium text-accent">
              {g.label}
            </li>
          ))}
          {SOCIALS.filter((s) => socials[s.key]).map((s) => (
            <li key={s.key}>
              <a
                href={socials[s.key]}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="block rounded-full border border-border px-3 py-1 text-muted transition-colors hover:border-subtle hover:text-foreground"
              >
                {s.label} ↗
              </a>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center justify-center gap-4 sm:justify-start">
        {isOwner ? (
          <>
            <Link href="/profil/duzenle" className="btn-secondary">
              Profili düzenle
            </Link>
            <span className="text-sm text-muted">
              <span className="font-semibold text-foreground tabular-nums">{followers ?? 0}</span> takipçi
            </span>
          </>
        ) : (
          <FollowButton profileId={profile.id} viewerId={viewerId} following={!!myFollow} followerCount={followers ?? 0} />
        )}
        <span className="text-sm text-muted">
          <span className="font-semibold text-foreground tabular-nums">{following ?? 0}</span> takip
        </span>
      </div>

      {isArtist && (
        <section className="flex flex-col gap-2">
          <h2 className="font-display text-xl font-semibold">Parçalar</h2>
          {ordered.length > 0 ? (
            <TrackQueue tracks={ordered.map((t) => toPlayerTrack(t, { name, username: profile.username }))}>
            <ul className="divide-y divide-border">
              {ordered.map((t) => (
                <TrackRow
                  key={t.id}
                  track={t}
                  artist={{ name, username: profile.username }}
                  isOwner={isOwner}
                  featured={t.id === profile.featured_track_id}
                />
              ))}
            </ul>
            </TrackQueue>
          ) : (
            <p className="text-muted">
              {isOwner ? (
                <>Henüz parça yüklemedin. <Link href="/yukle" className="link">İlk parçanı yükle</Link></>
              ) : (
                "Henüz parça yok."
              )}
            </p>
          )}
        </section>
      )}
    </article>
  );
}

export default function Page({ params }: PageProps<"/[username]">) {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
      <Suspense fallback={<p className="text-muted">Yükleniyor…</p>}>
        <Profile params={params} />
      </Suspense>
    </main>
  );
}
