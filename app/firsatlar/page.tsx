import type { Metadata } from "next";
import Link from "next/link";
import { Briefcase } from "lucide-react";
import { Suspense } from "react";
import { ActionForm } from "@/app/components/action-form";
import { Field, Select, TextArea } from "@/app/components/field";
import { EmptyState } from "@/app/components/notice";
import { ListSkeleton } from "@/app/components/track-row";
import { readFilters } from "@/lib/discover";
import { cityName, CITIES, GENRES, labelOf } from "@/lib/music";
import { addDays, MAX_DEADLINE_DAYS, SEEKING, trToday } from "@/lib/scouts";
import { createClient } from "@/lib/supabase/server";
import { createOpportunity } from "./actions";

export const metadata: Metadata = { title: "Fırsat panosu | Vitrin" };

// Sadece onaylı keşifçiye: yeni ilan formu (kural DB'de; 5 açık ilan sınırı dahil)
function NewOpportunity({ today }: { today: string }) {
  return (
    <details id="yeni" className="card px-4 py-3">
      <summary className="cursor-pointer text-sm font-medium">Yeni ilan aç</summary>
      <div className="mt-4">
        <ActionForm action={createOpportunity} submitLabel="İlanı yayınla">
          <Field label="Başlık" name="title" required minLength={3} maxLength={80} placeholder="Drill rapçi arıyorum" />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Ne arıyorsun?" name="seeking" required defaultValue="">
              <option value="" disabled>Seç</option>
              {SEEKING.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </Select>
            <Select label="Tür" name="genre" defaultValue="">
              <option value="">Farketmez</option>
              {GENRES.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
            </Select>
            <Select label="Şehir" name="city" defaultValue="">
              <option value="">Farketmez</option>
              {CITIES.map((c, i) => <option key={c} value={i + 1}>{c}</option>)}
            </Select>
            <Field label="Son başvuru" name="deadline" type="date" required min={today} max={addDays(today, MAX_DEADLINE_DAYS)} defaultValue={addDays(today, 14)} />
          </div>
          <TextArea label="Açıklama" name="body" required minLength={10} maxLength={1000} rows={4} />
        </ActionForm>
      </div>
    </details>
  );
}

async function Board({ searchParams }: { searchParams: PageProps<"/firsatlar">["searchParams"] }) {
  const params = await searchParams;
  const { genre, city } = readFilters(params);
  const seeking = SEEKING.some((s) => s.value === params.aranan) ? String(params.aranan) : null;
  const supabase = await createClient();  // await connection() içerir: tarih bundan sonra okunmalı
  const today = trToday();
  const { data: claims } = await supabase.auth.getClaims();
  const viewerId = claims?.claims.sub ?? null;

  let q = supabase
    .from("opportunities")
    .select("id, scout_id, title, seeking, genre, city, deadline")
    .eq("closed", false)
    .gte("deadline", today)
    .order("created_at", { ascending: false })
    .limit(100);
  if (genre) q = q.eq("genre", genre);
  if (city) q = q.eq("city", city);
  if (seeking) q = q.eq("seeking", seeking);
  const [{ data, error }, me] = await Promise.all([
    q,
    viewerId ? supabase.from("profiles").select("role").eq("id", viewerId).single() : null,
  ]);
  if (error) throw new Error(`İlanlar yüklenemedi: ${error.message}`);
  const { data: orgs } = data.length
    ? await supabase.from("scout_profiles").select("user_id, org_name").in("user_id", [...new Set(data.map((o) => o.scout_id))])
    : { data: [] };
  const org = new Map((orgs ?? []).map((o) => [o.user_id, o.org_name]));

  return (
    <>
      {me?.data?.role === "scout" && <NewOpportunity today={today} />}
      <form action="/firsatlar" className="grid grid-cols-3 gap-2">
        <Select label="Aranan" name="aranan" defaultValue={seeking ?? ""}>
          <option value="">Hepsi</option>
          {SEEKING.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </Select>
        <Select label="Tür" name="tur" defaultValue={genre ?? ""}>
          <option value="">Hepsi</option>
          {GENRES.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
        </Select>
        <Select label="Şehir" name="il" defaultValue={city ? String(city) : ""}>
          <option value="">Hepsi</option>
          {CITIES.map((c, i) => <option key={c} value={i + 1}>{c}</option>)}
        </Select>
        <button type="submit" className="btn-secondary col-span-3">Filtrele</button>
      </form>
      {data.length === 0 ? (
        <EmptyState icon={Briefcase} title="Açık ilan yok">Onaylı keşifçiler ilan açtıkça burada görünür.</EmptyState>
      ) : (
        <ul className="flex flex-col gap-3">
          {data.map((o) => (
            <li key={o.id}>
              <Link href={`/firsatlar/${o.id}`} className="card flex flex-col gap-1.5 px-4 py-4 hover:border-accent/45">
                <span className="text-[17px] font-semibold">{o.title}</span>
                <span className="text-xs text-text-muted">
                  {[org.get(o.scout_id), labelOf(SEEKING, o.seeking), o.genre && labelOf(GENRES, o.genre), cityName(o.city), `son gün ${o.deadline}`]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export default function Page({ searchParams }: PageProps<"/firsatlar">) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-7 md:py-14">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-4xl leading-none font-extrabold tracking-[-0.04em] md:text-5xl">Fırsat panosu</h1>
        <p className="text-sm text-text-muted">Onaylı keşifçilerin ilanları. Sanatçılar bir parçasıyla ücretsiz başvurur.</p>
      </div>
      <Suspense fallback={<ListSkeleton />}>
        <Board searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
