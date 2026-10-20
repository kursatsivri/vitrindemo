import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Search } from "lucide-react";
import { Suspense } from "react";
import { ArtistLine, PROFILE_MINI } from "@/app/components/artist-line";
import { CheckCard, Select } from "@/app/components/field";
import { FavoriteButton } from "@/app/components/interactions";
import { EmptyState } from "@/app/components/notice";
import { ListSkeleton } from "@/app/components/track-row";
import { readFilters } from "@/lib/discover";
import { CITIES, GENRES } from "@/lib/music";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Gelişmiş arama | Vitrin" };

const SORTS = [
  { value: "votes", label: "Toplam oy" },
  { value: "rising", label: "Bu hafta yükselen" },
  { value: "new", label: "En yeni" },
];

async function Results({ params }: { params: Record<string, string | string[] | undefined> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/giris");
  const { genre, city } = readFilters(params);
  const min = Math.max(0, Math.trunc(Number(params.min) || 0));
  const sort = SORTS.some((s) => s.value === params.sirala) ? String(params.sirala) : "votes";

  const { data, error } = await supabase.rpc("scout_search", {
    p_genre: genre ?? undefined,
    p_city: city ?? undefined,
    p_min_votes: min,
    p_open_only: params.acik === "1",
    p_sort: sort,
  });
  // Onaysız: DB reddeder → başvuru sayfasına
  if (error?.code === "P0001") redirect("/kesifci");
  if (error) throw new Error(`Arama yapılamadı: ${error.message}`);
  if (data.length === 0) return <EmptyState icon={Search} title="Sonuç yok">Filtreleri gevşetmeyi dene.</EmptyState>;

  const ids = data.map((r) => r.artist_id);
  const [{ data: people }, { data: favs }] = await Promise.all([
    supabase.from("profiles").select(`id, ${PROFILE_MINI}`).in("id", ids),
    supabase.from("scout_favorites").select("artist_id").in("artist_id", ids),
  ]);
  const person = new Map((people ?? []).map((p) => [p.id, p]));
  const fav = new Set((favs ?? []).map((f) => f.artist_id));
  return (
    <ul className="divide-y divide-border">
      {data.map((r) => {
        const p = person.get(r.artist_id);
        return p ? (
          <li key={r.artist_id}>
            <ArtistLine p={p} sub={`${r.total_votes} oy · bu hafta ${r.week_votes}`}>
              <FavoriteButton artistId={r.artist_id} viewerId={user.id} favorited={fav.has(r.artist_id)} />
            </ArtistLine>
          </li>
        ) : null;
      })}
    </ul>
  );
}

async function SearchPage({ searchParams }: { searchParams: PageProps<"/kesifci/ara">["searchParams"] }) {
  const params = await searchParams;
  const { genre, city } = readFilters(params);
  return (
    <>
      <form action="/kesifci/ara" className="card grid grid-cols-2 gap-3 p-4">
        <Select label="Tür" name="tur" defaultValue={genre ?? ""}>
          <option value="">Hepsi</option>
          {GENRES.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
        </Select>
        <Select label="Şehir" name="il" defaultValue={city ? String(city) : ""}>
          <option value="">Hepsi</option>
          {CITIES.map((c, i) => <option key={c} value={i + 1}>{c}</option>)}
        </Select>
        <label className="flex flex-col gap-2">
          <span className="label">En az toplam oy</span>
          <input type="number" name="min" min={0} defaultValue={typeof params.min === "string" ? params.min : ""} className="input" />
        </label>
        <Select label="Sırala" name="sirala" defaultValue={typeof params.sirala === "string" ? params.sirala : "votes"}>
          {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </Select>
        <div className="col-span-2">
          <CheckCard name="acik" value="1" defaultChecked={params.acik === "1"} title="Sadece keşfedilmeye açık olanlar" />
        </div>
        <button type="submit" className="btn-primary col-span-2">Ara</button>
      </form>
      <Suspense key={JSON.stringify(params)} fallback={<ListSkeleton />}>
        <Results params={params} />
      </Suspense>
    </>
  );
}

export default function Page({ searchParams }: PageProps<"/kesifci/ara">) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-7 md:py-14">
      <h1 className="font-display text-4xl leading-none font-extrabold tracking-[-0.04em]">Gelişmiş arama</h1>
      <Suspense>
        <SearchPage searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
