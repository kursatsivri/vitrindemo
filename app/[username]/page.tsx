import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Avatar } from "@/app/components/avatar";
import { TrackRow } from "@/app/components/track-row";
import { GENRES, ROLE_LABELS, SOCIALS } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

async function Profile({ params }: { params: PageProps<"/[username]">["params"] }) {
  const { username } = await params;
  const supabase = await createClient();

  const [{ data: profile }, { data: claims }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, role, username, display_name, bio, genres, socials, avatar_path")
      .eq("username", decodeURIComponent(username).toLowerCase())
      .maybeSingle(),
    supabase.auth.getClaims(),
  ]);
  if (!profile) notFound();

  const name = profile.display_name || profile.username;
  const socials = (profile.socials ?? {}) as Record<string, string>;
  const isOwner = claims?.claims.sub === profile.id;
  const isArtist = profile.role === "artist";

  // Gizlenen parçaları RLS sadece sahibine döndürür.
  const { data: tracks } = isArtist
    ? await supabase
        .from("tracks")
        .select("id, title, genre, audio_path, cover_path, duration_sec, status")
        .eq("artist_id", profile.id)
        .order("created_at", { ascending: false })
    : { data: [] };

  return (
    <article className="flex flex-col gap-6">
      <header className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-end sm:text-left">
        <Avatar path={profile.avatar_path} name={name} size={128} />
        <div className="flex flex-col items-center gap-2 sm:items-start">
          <span className="text-xs font-semibold uppercase tracking-widest text-accent">
            {ROLE_LABELS[profile.role]}
          </span>
          <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">{name}</h1>
          <p className="text-sm text-muted">@{profile.username}</p>
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

      {isOwner && (
        <Link href="/profil/duzenle" className="btn-secondary w-fit self-center sm:self-start">
          Profili düzenle
        </Link>
      )}

      {isArtist && (
        <section className="flex flex-col gap-2">
          <h2 className="font-display text-xl font-semibold">Parçalar</h2>
          {tracks && tracks.length > 0 ? (
            <ul className="divide-y divide-border">
              {tracks.map((t) => (
                <TrackRow key={t.id} track={t} artist={{ name, username: profile.username }} isOwner={isOwner} />
              ))}
            </ul>
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
