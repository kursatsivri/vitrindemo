import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Compass, Users } from "lucide-react";
import { Suspense } from "react";
import { Avatar } from "@/app/components/avatar";
import { EmptyState } from "@/app/components/notice";
import { RankingList, withTracks } from "@/app/components/ranking";
import { ListSkeleton } from "@/app/components/track-row";
import { cityName } from "@/lib/music";
import { createClient } from "@/lib/supabase/server";
import { periodStart } from "@/lib/tracks";

const sectionTitle = "font-display text-2xl font-bold tracking-[-0.03em]";

export async function generateMetadata({ params }: PageProps<"/sehir/[il]">): Promise<Metadata> {
  const name = cityName(Number((await params).il));
  return { title: name ? `${name} — yetenekler | Vitrin` : "Şehir bulunamadı | Vitrin" };
}

async function City({ params }: { params: PageProps<"/sehir/[il]">["params"] }) {
  const city = Number((await params).il);
  const name = cityName(city);
  if (!name || !Number.isInteger(city)) notFound();

  const supabase = await createClient();
  // ponytail: ilk 60 sanatçı; şehir kalabalıklaşınca sayfalama ekle.
  const [artists, ranking] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, username, display_name, avatar_path")
      .eq("role", "artist")
      .eq("city", city)
      .order("created_at", { ascending: false })
      .limit(60),
    supabase.rpc("ranking", { p_period: "week", p_start: periodStart("week"), p_city: city }).limit(10),
  ]);
  if (artists.error) throw new Error(`Şehir yüklenemedi: ${artists.error.message}`);
  const rows = await withTracks(supabase, ranking.data ?? []);

  return (
    <>
      <div className="flex flex-col gap-3">
        <h1 className="font-display text-4xl leading-none font-extrabold tracking-[-0.04em] md:text-5xl">{name}</h1>
        <div className="flex flex-wrap gap-2">
          <Link href={`/kesfet?il=${city}`} className="btn-primary">
            <Compass aria-hidden className="size-[18px]" strokeWidth={1.75} />
            {name} parçalarını keşfet
          </Link>
          <Link href="/sehir" className="btn-secondary">Haritaya dön</Link>
        </div>
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex items-end justify-between gap-4">
          <h2 className={sectionTitle}>Bu haftanın en iyileri</h2>
          <Link href={`/siralama?sehir=${city}`} className="link text-sm">Tüm şehir sıralaması</Link>
        </div>
        {rows.length ? <RankingList rows={rows} /> : <p className="text-sm text-text-muted">Bu hafta bu şehirden henüz oy alan parça yok.</p>}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className={sectionTitle}>Sanatçılar</h2>
        {artists.data.length === 0 ? (
          <EmptyState icon={Users} title="Henüz sanatçı yok">Profilinde şehir olarak {name} seçen ilk sanatçı sen ol.</EmptyState>
        ) : (
          <ul className="grid grid-cols-3 gap-x-3 gap-y-6 sm:grid-cols-4 md:grid-cols-6">
            {artists.data.map((a) => {
              const n = a.display_name || a.username;
              return (
                <li key={a.id}>
                  <Link href={`/${a.username}`} className="flex flex-col items-center gap-2 text-center">
                    <Avatar path={a.avatar_path} name={n} size={80} />
                    <span className="w-full truncate text-sm font-medium">{n}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}

export default function Page({ params }: PageProps<"/sehir/[il]">) {
  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-8 px-4 py-7 md:gap-12 md:px-10 md:py-14">
      <Suspense fallback={<ListSkeleton />}>
        <City params={params} />
      </Suspense>
    </main>
  );
}
