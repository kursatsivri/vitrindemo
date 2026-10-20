import Link from "next/link";
import { notFound } from "next/navigation";
import { Camera, Check, Cloud, ExternalLink, MonitorPlay, Music } from "lucide-react";
import { Suspense } from "react";
import { Avatar } from "@/app/components/avatar";
import { FollowButton } from "@/app/components/interactions";
import { EmptyState } from "@/app/components/notice";
import { BestRank } from "@/app/components/ranking";
import { TrackQueue } from "@/app/components/player";
import { ShareButton } from "@/app/components/share-button";
import { ListSkeleton, toPlayerTrack, TrackRow } from "@/app/components/track-row";
import { cityName, GENRES } from "@/lib/music";
import { ROLE_LABELS, SOCIALS } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { storageUrl } from "@/lib/tracks";

const SOCIAL_ICONS: Record<string, typeof Camera> = { instagram: Camera, youtube: MonitorPlay, spotify: Music, soundcloud: Cloud };
const asideTitle = "text-[13px] font-medium tracking-[0.08em] text-text-muted uppercase";

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

  const [{ count: followers }, { count: following }, { data: myFollow }, { data: best }] = await Promise.all([
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("followee_id", profile.id),
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", profile.id),
    viewerId && !isOwner
      ? supabase.from("follows").select("followee_id").eq("follower_id", viewerId).eq("followee_id", profile.id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("ranking_snapshots")
      .select("rank_genre, genre, period")
      .eq("artist_id", profile.id)
      .order("rank_genre")
      .limit(1)
      .maybeSingle(),
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
  // Toplam sayılan oy: sanatçının parçalarının oy toplamı
  const { data: totals } = tracks?.length
    ? await supabase.from("track_vote_totals").select("votes").in("track_id", tracks.map((t) => t.id))
    : { data: [] };
  const votes = (totals ?? []).reduce((sum, t) => sum + (t.votes ?? 0), 0);
  // Öne çıkan parça listenin başında
  const ordered = [...(tracks ?? [])].sort(
    (x, y) => Number(y.id === profile.featured_track_id) - Number(x.id === profile.featured_track_id),
  );
  const city = cityName(profile.city);
  // Başlık zemini: öne çıkan parçanın kapağı, yoksa profil fotoğrafı (bulanık)
  const featured = ordered.find((t) => t.id === profile.featured_track_id && t.cover_path);
  const backdrop = featured?.cover_path
    ? storageUrl("covers", featured.cover_path)
    : profile.avatar_path
      ? storageUrl("avatars", profile.avatar_path)
      : null;
  const genres = GENRES.filter((g) => profile.genres.includes(g.value));
  const links = SOCIALS.filter((s) => socials[s.key]);
  const hasAside = !!profile.bio || genres.length > 0 || links.length > 0;

  return (
    <article className="relative">
      <div aria-hidden className="absolute inset-x-0 top-0 h-64 overflow-hidden bg-surface mask-b-from-30% md:h-96">
        {backdrop && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={backdrop} alt="" className="size-full scale-125 object-cover opacity-60 blur-3xl" />
        )}
      </div>

      <div className="relative mx-auto flex w-full max-w-[1200px] flex-col gap-8 px-4 pt-20 pb-10 md:gap-14 md:px-10 md:pt-36 md:pb-20">
        <header className="flex flex-col items-center gap-4 text-center md:flex-row md:items-end md:gap-8 md:text-left">
          <Avatar path={profile.avatar_path} name={name} size={168} className="size-28! border-4 border-bg md:size-[168px]! md:border-[5px]" />
          <div className="flex min-w-0 flex-col items-center gap-3 md:flex-1 md:items-start md:pb-2">
            <div className="flex flex-wrap justify-center gap-2">
              <span className="inline-flex h-7 items-center rounded-full bg-accent-soft px-3 text-xs font-medium tracking-wide text-accent">
                {ROLE_LABELS[profile.role]}
              </span>
              {isArtist && profile.open_to_discovery && (
                <span className="inline-flex h-7 items-center gap-1.5 rounded-full border border-border bg-bg/40 px-3 text-xs font-medium">
                  <Check aria-hidden className="size-3.5" strokeWidth={2} />
                  Keşfedilmeye açık
                </span>
              )}
              <BestRank best={best} />
            </div>
            <h1 className="max-w-full font-display text-[42px] leading-none font-extrabold tracking-[-0.04em] break-words md:text-[clamp(48px,7vw,96px)] md:leading-[0.92] md:tracking-[-0.05em]">
              {name}
            </h1>
            <p className="text-sm text-text-muted md:text-[15px]">
              @{profile.username}
              {city && <> · {city}</>}
            </p>
          </div>
          <div className="flex w-full flex-wrap items-center justify-center gap-3 md:w-auto md:pb-2">
            {isOwner ? (
              <>
                <Link href="/profil/duzenle" className="btn-secondary h-12 px-6">
                  Profili düzenle
                </Link>
                <span className="text-sm text-text-muted">
                  <span className="font-medium text-text tabular-nums">{followers ?? 0}</span> takipçi
                </span>
              </>
            ) : (
              <FollowButton profileId={profile.id} viewerId={viewerId} following={!!myFollow} followerCount={followers ?? 0} />
            )}
            <span className="text-sm text-text-muted">
              <span className="font-medium text-text tabular-nums">{following ?? 0}</span> takip
            </span>
            {isArtist && (
              <span className="text-sm text-text-muted">
                <span className="font-medium text-text tabular-nums">{votes}</span> oy
              </span>
            )}
            <ShareButton title={`${name} — Vitrin`} iconOnly />
          </div>
        </header>

        <div className="flex flex-col gap-8 md:flex-row md:items-start md:gap-12">
          {hasAside && (
            <aside className="flex flex-col gap-6 md:order-last md:w-80 md:shrink-0 md:rounded-2xl md:border md:border-border md:bg-surface md:p-6">
              {profile.bio && (
                <div className="flex flex-col gap-2.5">
                  <h2 className={`${asideTitle} hidden md:block`}>Hakkında</h2>
                  <p className="text-center text-[15px] leading-relaxed whitespace-pre-line md:text-left">{profile.bio}</p>
                </div>
              )}
              {genres.length > 0 && (
                <div className="flex flex-col gap-2.5">
                  <h2 className={`${asideTitle} hidden md:block`}>Türler</h2>
                  <ul className="flex flex-wrap justify-center gap-1.5 md:justify-start">
                    {genres.map((g) => (
                      <li key={g.value} className="inline-flex h-[30px] items-center rounded-full bg-surface-2 px-3 text-[13px]">
                        {g.label}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {links.length > 0 && (
                <nav aria-label="Sosyal bağlantılar" className="flex flex-col gap-2.5">
                  <h2 className={`${asideTitle} hidden md:block`}>Bağlantılar</h2>
                  <ul className="flex flex-wrap justify-center gap-2 md:flex-col md:gap-2.5">
                    {links.map((s) => {
                      const Icon = SOCIAL_ICONS[s.key] ?? ExternalLink;
                      return (
                        <li key={s.key}>
                          <a
                            href={socials[s.key]}
                            target="_blank"
                            rel="noopener noreferrer nofollow"
                            className="flex h-9 items-center gap-2 rounded-full border border-border bg-surface px-3.5 text-[13px] font-medium text-text-muted transition duration-150 hover:text-text md:h-11 md:gap-3 md:rounded-xl md:border-0 md:bg-surface-2 md:text-sm md:text-text"
                          >
                            <Icon aria-hidden className="size-4 md:size-[18px]" strokeWidth={1.75} />
                            <span className="md:flex-1">{s.label}</span>
                            <ExternalLink aria-hidden className="hidden size-4 text-text-muted md:block" strokeWidth={1.75} />
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                </nav>
              )}
            </aside>
          )}

          {isArtist && (
            <section className="flex min-w-0 flex-1 flex-col gap-3">
              <h2 className="font-display text-2xl font-bold tracking-[-0.03em] md:text-[32px] md:tracking-[-0.035em]">Parçalar</h2>
              {ordered.length > 0 ? (
                <TrackQueue tracks={ordered.map((t) => toPlayerTrack(t, { name, username: profile.username }))}>
                  <ol className="-mx-2 flex flex-col sm:-mx-4">
                    {ordered.map((t, i) => (
                      <TrackRow
                        key={t.id}
                        track={t}
                        index={i}
                        artist={{ name, username: profile.username }}
                        isOwner={isOwner}
                        featured={t.id === profile.featured_track_id}
                      />
                    ))}
                  </ol>
                </TrackQueue>
              ) : (
                <EmptyState
                  icon={Music}
                  title="Henüz parça yok"
                  action={isOwner && <Link href="/yukle" className="btn-primary">İlk parçanı yükle</Link>}
                >
                  {isOwner ? "Vitrinin seni bekliyor. İlk parçanı yükle, keşfedilmeye başla." : `${name} henüz parça yüklemedi.`}
                </EmptyState>
              )}
            </section>
          )}
        </div>
      </div>
    </article>
  );
}

function ProfileSkeleton() {
  return (
    <div aria-hidden className="mx-auto flex w-full max-w-[1200px] flex-col gap-10 px-4 pt-20 md:px-10 md:pt-36">
      <div className="flex flex-col items-center gap-4 md:flex-row md:items-end md:gap-8">
        <div className="skeleton size-28 md:size-[168px]" />
        <div className="flex flex-col items-center gap-3 md:items-start">
          <div className="skeleton h-10 w-56 md:h-20 md:w-96" />
          <div className="skeleton h-3.5 w-40" />
        </div>
      </div>
      <ListSkeleton />
    </div>
  );
}

export default function Page({ params }: PageProps<"/[username]">) {
  return (
    <main className="w-full flex-1">
      <Suspense fallback={<ProfileSkeleton />}>
        <Profile params={params} />
      </Suspense>
    </main>
  );
}
