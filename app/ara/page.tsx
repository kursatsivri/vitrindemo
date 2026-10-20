import type { Metadata } from "next";
import Link from "next/link";
import { MapPin, Search } from "lucide-react";
import { Suspense } from "react";
import { Avatar } from "@/app/components/avatar";
import { Select } from "@/app/components/field";
import { EmptyState } from "@/app/components/notice";
import { ListSkeleton, TrackList, withArtist } from "@/app/components/track-row";
import { readFilters } from "@/lib/discover";
import { cityName, CITIES, GENRES, TAGS } from "@/lib/music";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Ara | Vitrin" };

const sectionTitle = "font-display text-2xl font-bold tracking-[-0.03em]";

async function Results({ q, searchParams }: { q: string; searchParams: Record<string, string | string[] | undefined> }) {
  const { genre, tag, city } = readFilters(searchParams);
  const supabase = await createClient();
  // Parça araması tür/etiket filtresini kullanır; sanatçı araması sadece şehri.
  const [tracks, artists] = await Promise.all([
    supabase
      .rpc("search_tracks", { p_q: q, p_genre: genre ?? undefined, p_tag: tag ?? undefined, p_city: city ?? undefined })
      .select("id, title, genre, cover_path, duration_sec, audio_path, status, profiles!artist_id(username, display_name)"),
    genre || tag ? null : supabase.rpc("search_artists", { p_q: q, p_city: city ?? undefined }).select("id, username, display_name, avatar_path, city"),
  ]);
  if (tracks.error) throw new Error(`Arama yapılamadı: ${tracks.error.message}`);
  const artistRows = artists?.data ?? [];

  if (tracks.data.length === 0 && artistRows.length === 0) {
    return <EmptyState icon={Search} title="Sonuç yok">“{q}” için bir şey bulamadık. Başka bir isim ya da filtre dene.</EmptyState>;
  }

  return (
    <>
      {artistRows.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className={sectionTitle}>Sanatçılar</h2>
          <ul className="flex flex-col">
            {artistRows.map((a) => {
              const name = a.display_name || a.username;
              const where = cityName(a.city);
              return (
                <li key={a.id}>
                  <Link href={`/${a.username}`} className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-surface">
                    <Avatar path={a.avatar_path} name={name} size={44} />
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-[15px] font-medium">{name}</span>
                      <span className="truncate text-xs text-text-muted">@{a.username}{where ? ` · ${where}` : ""}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
      {tracks.data.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className={sectionTitle}>Parçalar</h2>
          <TrackList rows={withArtist(tracks.data)} empty={null} />
        </section>
      )}
    </>
  );
}

async function SearchPage({ searchParams }: { searchParams: PageProps<"/ara">["searchParams"] }) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 80) : "";
  const { genre, tag, city } = readFilters(params);

  return (
    <>
      <form action="/ara" role="search" className="flex flex-col gap-3">
        <div className="flex gap-2">
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Sanatçı, kullanıcı adı ya da parça"
            aria-label="Ara"
            minLength={2}
            autoFocus={!q}
            className="input"
          />
          <button type="submit" className="btn-primary h-12">Ara</button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Select label="Tür" name="tur" defaultValue={genre ?? ""}>
            <option value="">Hepsi</option>
            {GENRES.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
          </Select>
          <Select label="Etiket" name="etiket" defaultValue={tag ?? ""}>
            <option value="">Hepsi</option>
            {TAGS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </Select>
          <Select label="Şehir" name="il" defaultValue={city ? String(city) : ""}>
            <option value="">Hepsi</option>
            {CITIES.map((c, i) => <option key={c} value={i + 1}>{c}</option>)}
          </Select>
        </div>
      </form>
      {q.length >= 2 ? (
        <Suspense key={JSON.stringify(params)} fallback={<ListSkeleton />}>
          <Results q={q} searchParams={params} />
        </Suspense>
      ) : (
        <Link href="/sehir" className="card flex items-center gap-3 px-4 py-4 text-sm hover:border-accent/45">
          <MapPin aria-hidden className="size-5 text-accent" strokeWidth={1.75} />
          <span className="flex-1">Yakınındaki yetenekleri haritada bul</span>
        </Link>
      )}
    </>
  );
}

export default function Page({ searchParams }: PageProps<"/ara">) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-7 md:gap-8 md:py-14">
      <h1 className="font-display text-4xl leading-none font-extrabold tracking-[-0.04em] md:text-5xl">Ara</h1>
      <Suspense>
        <SearchPage searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
