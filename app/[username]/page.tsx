import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Avatar } from "@/app/components/avatar";
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

  return (
    <article className="flex flex-col gap-6">
      <header className="flex items-center gap-4">
        <Avatar path={profile.avatar_path} name={name} size={96} />
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">{name}</h1>
          <p className="text-sm text-neutral-400">@{profile.username}</p>
          <span className="w-fit rounded-full bg-neutral-800 px-2 py-0.5 text-xs text-neutral-300">
            {ROLE_LABELS[profile.role]}
          </span>
        </div>
      </header>

      {profile.bio && <p className="whitespace-pre-line text-neutral-200">{profile.bio}</p>}

      {profile.genres.length > 0 && (
        <ul className="flex gap-2">
          {GENRES.filter((g) => profile.genres.includes(g.value)).map((g) => (
            <li key={g.value} className="rounded-full border border-neutral-700 px-3 py-1 text-sm">
              {g.label}
            </li>
          ))}
        </ul>
      )}

      {SOCIALS.some((s) => socials[s.key]) && (
        <ul className="flex flex-wrap gap-3 text-sm">
          {SOCIALS.filter((s) => socials[s.key]).map((s) => (
            <li key={s.key}>
              <a
                href={socials[s.key]}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="underline"
              >
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      )}

      {isOwner && (
        <Link href="/profil/duzenle" className="w-fit rounded-md border border-neutral-700 px-3 py-2 text-sm">
          Profili düzenle
        </Link>
      )}
    </article>
  );
}

export default function Page({ params }: PageProps<"/[username]">) {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
      <Suspense fallback={<p className="text-neutral-400">Yükleniyor…</p>}>
        <Profile params={params} />
      </Suspense>
    </main>
  );
}
