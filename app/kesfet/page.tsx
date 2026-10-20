import type { Metadata } from "next";
import Link from "next/link";
import { SlidersHorizontal } from "lucide-react";
import { Suspense } from "react";
import { Select } from "@/app/components/field";
import { CARD_SELECT, type DiscoverFilters, feedArgs, readFilters, toCards } from "@/lib/discover";
import { CITIES, GENRES, MOODS, TAGS } from "@/lib/music";
import { createClient } from "@/lib/supabase/server";
import { SwipeDeck } from "./swipe-deck";

export const metadata: Metadata = { title: "Keşfet | Vitrin" };

const BATCH = 20;

// Yerel GET formu: JS'siz çalışır
function Filters({ f }: { f: DiscoverFilters }) {
  const active = [f.genre, f.tag, f.mood, f.city].filter(Boolean).length;
  return (
    <details className="card group px-4 py-3" open={active > 0}>
      <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium">
        <SlidersHorizontal aria-hidden className="size-4" strokeWidth={1.75} />
        Filtreler{active ? ` (${active})` : ""}
      </summary>
      <form action="/kesfet" className="mt-4 grid grid-cols-2 gap-3">
        <Select label="Tür" name="tur" defaultValue={f.genre ?? ""}>
          <option value="">Hepsi</option>
          {GENRES.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
        </Select>
        <Select label="Etiket" name="etiket" defaultValue={f.tag ?? ""}>
          <option value="">Hepsi</option>
          {TAGS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </Select>
        <Select label="Ruh hali" name="ruh" defaultValue={f.mood ?? ""}>
          <option value="">Hepsi</option>
          {MOODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
        </Select>
        <Select label="Şehir" name="il" defaultValue={f.city ? String(f.city) : ""}>
          <option value="">Hepsi</option>
          {CITIES.map((c, i) => <option key={c} value={i + 1}>{c}</option>)}
        </Select>
        <div className="col-span-2 flex justify-end gap-2">
          {active > 0 && <Link href="/kesfet" className="btn-ghost">Temizle</Link>}
          <button type="submit" className="btn-primary">Uygula</button>
        </div>
      </form>
    </details>
  );
}

async function Deck({ searchParams }: { searchParams: PageProps<"/kesfet">["searchParams"] }) {
  const filters = readFilters(await searchParams);
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const viewerId = claims?.claims.sub ?? null;

  const [feed, prefs, me] = await Promise.all([
    supabase.rpc("discover_feed", feedArgs(filters, BATCH)),
    viewerId ? supabase.from("user_preferences").select("user_id").maybeSingle() : null,
    viewerId ? supabase.from("profiles").select("role").eq("id", viewerId).single() : null,
  ]);
  if (feed.error) throw new Error(`Keşfet yüklenemedi: ${feed.error.message}`);
  const ids = feed.data.map((r) => r.track_id);
  const { data: rows, error } = ids.length
    ? await supabase.from("tracks").select(CARD_SELECT).in("id", ids)
    : { data: [], error: null };
  if (error) throw new Error(`Keşfet yüklenemedi: ${error.message}`);

  return (
    <>
      {viewerId && !prefs?.data && (
        <Link href="/tercihler" className="card flex items-center justify-between gap-3 px-4 py-3 text-sm hover:border-accent/45">
          <span>Sevdiğin türleri seç, öneriler sana göre gelsin.</span>
          <span className="link shrink-0">Tercihlerini seç</span>
        </Link>
      )}
      <Filters f={filters} />
      {/* Filtre değişince deste baştan kurulur */}
      <SwipeDeck key={JSON.stringify(filters)} initial={toCards(ids, rows ?? [])} filters={filters} viewerId={viewerId} viewerRole={me?.data?.role ?? null} />
    </>
  );
}

export default function Page({ searchParams }: PageProps<"/kesfet">) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-4 py-6 md:py-10">
      <h1 className="font-display text-[34px] leading-none font-extrabold tracking-[-0.04em]">Keşfet</h1>
      <Suspense fallback={<div aria-hidden className="skeleton aspect-[4/5] w-full rounded-2xl" />}>
        <Deck searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
