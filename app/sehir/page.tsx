import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CITIES } from "@/lib/music";
import { createClient } from "@/lib/supabase/server";
import { MapColors, TurkeyMap } from "./turkey-map";

export const metadata: Metadata = { title: "Yakınındaki yetenekler | Vitrin" };

async function getCounts() {
  const supabase = await createClient();
  const { data } = await supabase.from("city_artist_counts").select("city, artists");
  return new Map((data ?? []).flatMap((r) => (r.city && r.artists ? [[r.city, r.artists] as const] : [])));
}

function CityList({ counts }: { counts: Map<number, number> }) {
  return (
    <ul className="grid grid-cols-2 gap-x-6 sm:grid-cols-3 md:grid-cols-4">
      {CITIES.map((name, i) => {
        const n = counts.get(i + 1);
        return (
          <li key={name}>
            <Link href={`/sehir/${i + 1}`} className="flex items-center justify-between gap-2 border-b border-border py-2.5 text-sm hover:text-accent">
              <span className={n ? "font-medium" : "text-text-muted"}>{name}</span>
              {n ? <span className="text-xs text-text-muted tabular-nums">{n} sanatçı</span> : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

async function Counts() {
  const counts = await getCounts();
  return (
    <>
      <MapColors counts={counts} />
      <CityList counts={counts} />
    </>
  );
}

export default function Page() {
  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-6 px-4 py-7 md:gap-10 md:px-10 md:py-14">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-4xl leading-none font-extrabold tracking-[-0.04em] md:text-5xl">Yakınındaki yetenekler</h1>
        <p className="text-sm text-text-muted">Bir ile dokun: o şehrin sanatçıları ve şehir sıralaması. Sadece profillerdeki şehir kullanılır.</p>
      </div>
      <TurkeyMap />
      <Suspense fallback={<CityList counts={new Map()} />}>
        <Counts />
      </Suspense>
    </main>
  );
}
