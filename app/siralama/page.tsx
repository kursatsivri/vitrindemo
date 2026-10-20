import type { Metadata } from "next";
import Link from "next/link";
import { Trophy } from "lucide-react";
import { Suspense } from "react";
import { Select } from "@/app/components/field";
import { GenreFilter } from "@/app/components/genre-pills";
import { EmptyState } from "@/app/components/notice";
import { RankingList, withTracks } from "@/app/components/ranking";
import { ListSkeleton } from "@/app/components/track-row";
import { cityName, CITIES, GENRES, labelOf } from "@/lib/music";
import { createClient } from "@/lib/supabase/server";
import { periodStart } from "@/lib/tracks";

export const metadata: Metadata = { title: "Sıralama | Vitrin" };

const ARCHIVE_SIZE = 12;
const sideTitle = "font-display text-xl font-bold tracking-[-0.03em]";

function periodLabel(period: "week" | "month", start: string, i: number) {
  if (i === 0) return period === "week" ? "Bu hafta" : "Bu ay";
  const d = new Date(`${start}T00:00:00Z`);
  return period === "week"
    ? `${d.toLocaleDateString("tr-TR", { day: "numeric", month: "long", timeZone: "UTC" })} haftası`
    : d.toLocaleDateString("tr-TR", { month: "long", year: "numeric", timeZone: "UTC" });
}

async function Ranking({ searchParams }: { searchParams: PageProps<"/siralama">["searchParams"] }) {
  const { donem, tur, sehir, baslangic } = await searchParams;
  const supabase = await createClient();

  const period = donem === "ay" ? "month" : "week";
  const genre = GENRES.some((g) => g.value === tur) ? (tur as string) : null;
  const city = cityName(Number(sehir)) ? Number(sehir) : null;
  // Arşiv: son 12 dönem; ranking() arşivlenmişse dondurulmuş listeyi, değilse canlıyı döndürür.
  const now = new Date();
  const starts = Array.from({ length: ARCHIVE_SIZE }, (_, i) => periodStart(period, now, i));
  const start = starts.includes(baslangic as string) ? (baslangic as string) : starts[0];

  // ponytail: ilk 50; uzun listeler için sayfalama ekle.
  const [ranking, rising, ears] = await Promise.all([
    supabase
      .rpc("ranking", { p_period: period, p_start: start, p_genre: genre ?? undefined, p_city: city ?? undefined })
      .limit(50),
    supabase.from("rising_live").select("track_id, score").order("score", { ascending: false }).order("last_vote_at").limit(10),
    supabase
      .from("ear_leaderboard")
      .select("user_id, points, profiles(username, display_name)")
      .eq("month_start", periodStart("month", now))
      .order("points", { ascending: false })
      .limit(10),
  ]);
  if (ranking.error) throw new Error(`Sıralama yüklenemedi: ${ranking.error.message}`);
  const [rows, risingRows] = await Promise.all([
    withTracks(supabase, ranking.data),
    withTracks(
      supabase,
      (rising.data ?? []).flatMap((r, i) => (r.track_id ? [{ rank: i + 1, track_id: r.track_id, score: r.score ?? 0 }] : [])),
    ),
  ]);

  const href = (g: string | null) => {
    const q = new URLSearchParams();
    if (period === "month") q.set("donem", "ay");
    if (g) q.set("tur", g);
    if (city) q.set("sehir", String(city));
    if (start !== starts[0]) q.set("baslangic", start);
    return q.size ? `/siralama?${q}` : "/siralama";
  };
  const archived = ranking.data[0]?.archived ?? false;
  const title = [
    period === "week" ? "Haftalık" : "Aylık",
    genre ? labelOf(GENRES, genre) : "genel",
    "liste",
    city ? `· ${cityName(city)}` : "",
  ].join(" ");

  return (
    <>
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between md:border-b md:border-border">
        <h1 className="font-display text-[34px] leading-none font-extrabold tracking-[-0.04em] md:mb-4 md:text-5xl">Sıralama</h1>
        <nav className="flex gap-6 border-b border-border md:gap-7 md:border-0" aria-label="Dönem">
          {[
            { label: "Haftalık", value: "week", q: "" },
            { label: "Aylık", value: "month", q: "donem=ay" },
          ].map((t) => {
            const q = new URLSearchParams(t.q);
            if (genre) q.set("tur", genre);
            if (city) q.set("sehir", String(city));
            return (
              <Link
                key={t.value}
                href={q.size ? `/siralama?${q}` : "/siralama"}
                aria-current={period === t.value ? "page" : undefined}
                className="-mb-px border-b-2 border-transparent pb-3 text-[15px] font-medium text-text-muted transition duration-150 hover:text-text aria-[current=page]:border-accent aria-[current=page]:text-text md:pb-4"
              >
                {t.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <GenreFilter active={genre} href={href} />

      {/* Yerel GET formu: JS'siz çalışır */}
      <form action="/siralama" className="flex flex-wrap items-end gap-3">
        {period === "month" && <input type="hidden" name="donem" value="ay" />}
        {genre && <input type="hidden" name="tur" value={genre} />}
        <div className="w-full sm:w-56">
          <Select label="Dönem" name="baslangic" defaultValue={start}>
            {starts.map((s, i) => (
              <option key={s} value={s}>
                {periodLabel(period, s, i)}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-full sm:w-56">
          <Select label="Şehir" name="sehir" defaultValue={city ?? ""}>
            <option value="">Tüm Türkiye</option>
            {CITIES.map((c, i) => (
              <option key={c} value={i + 1}>
                {c}
              </option>
            ))}
          </Select>
        </div>
        <button type="submit" className="btn-secondary">
          Göster
        </button>
      </form>

      <div className="flex flex-col gap-10 md:flex-row md:items-start md:gap-12">
        <section className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-2xl font-bold tracking-[-0.03em]">{title}</h2>
            <span className="text-[13px] text-text-muted">
              {periodLabel(period, start, starts.indexOf(start))} · {archived ? "Arşiv (dondurulmuş)" : "Canlı"}
            </span>
          </div>
          {rows.length > 0 ? (
            <RankingList rows={rows} />
          ) : (
            <EmptyState icon={Trophy} title="Bu listede henüz oy yok">
              Parçaları dinle, beğendiklerine oy ver; sıralama oylarla oluşur.
            </EmptyState>
          )}
        </section>

        <aside className="flex flex-col gap-8 md:w-80 md:shrink-0">
          <section className="flex flex-col gap-3">
            <h2 className={sideTitle}>Yükselenler</h2>
            <p className="text-[13px] text-text-muted">Bu hafta, son 90 günde katılan sanatçılar.</p>
            {risingRows.length > 0 ? <RankingList rows={risingRows} /> : <p className="text-sm text-text-muted">Henüz yok.</p>}
          </section>
          <section className="flex flex-col gap-3">
            <h2 className={sideTitle}>En iyi kulaklar</h2>
            <p className="text-[13px] text-text-muted">Bu ay, listeye girmeden önce oy verenler.</p>
            {(ears.data ?? []).length > 0 ? (
              <ol className="flex flex-col gap-1">
                {(ears.data ?? []).flatMap((e, i) =>
                  e.profiles
                    ? [
                        <li key={e.user_id} className="flex h-10 items-center gap-3 text-sm">
                          <span className="w-6 text-text-muted tabular-nums">{i + 1}</span>
                          <Link href={`/${e.profiles.username}`} className="min-w-0 flex-1 truncate font-medium hover:underline">
                            {e.profiles.display_name || e.profiles.username}
                          </Link>
                          <span className="text-[13px] text-text-muted tabular-nums">{e.points} puan</span>
                        </li>,
                      ]
                    : [],
                )}
              </ol>
            ) : (
              <p className="text-sm text-text-muted">Henüz yok.</p>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}

export default function Page({ searchParams }: PageProps<"/siralama">) {
  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-6 px-4 py-6 md:gap-8 md:px-10 md:py-14">
      <Suspense fallback={<ListSkeleton count={8} />}>
        <Ranking searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
