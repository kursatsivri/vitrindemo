import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ArtistLine, PROFILE_MINI, sectionTitle } from "@/app/components/artist-line";
import { Notice } from "@/app/components/notice";
import { ListSkeleton } from "@/app/components/track-row";
import { createClient } from "@/lib/supabase/server";
import { answerInterest } from "@/app/kesifci/actions";

export const metadata: Metadata = { title: "Sanatçı paneli | Vitrin" };

const APP_STATUS: Record<string, string> = {
  pending: "Değerlendiriliyor",
  shortlisted: "Kısa listede",
  declined: "Olmadı",
  matched: "Eşleştiniz",
};

async function Dashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/giris");
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "artist") redirect("/");

  const [stats, incoming, matches, apps, contact] = await Promise.all([
    supabase.rpc("artist_stats").single(),
    supabase.from("interests").select(`scout_id, created_at, profiles!scout_id(${PROFILE_MINI})`).eq("artist_id", user.id).eq("status", "pending").order("created_at", { ascending: false }),
    supabase.rpc("my_matches"),
    supabase.from("opportunity_applications").select("opportunity_id, status, opportunities(title)").eq("artist_id", user.id).order("created_at", { ascending: false }),
    supabase.from("artist_contacts").select("email").maybeSingle(),
  ]);
  const scoutIds = [...new Set([...(incoming.data ?? []).map((i) => i.scout_id), ...(matches.data ?? []).map((m) => m.other_id)])];
  const [{ data: orgs }, { data: people }] = scoutIds.length
    ? await Promise.all([
        supabase.from("scout_profiles").select("user_id, org_name").in("user_id", scoutIds),
        supabase.from("profiles").select(`id, ${PROFILE_MINI}`).in("id", scoutIds),
      ])
    : [{ data: [] }, { data: [] }];
  const org = new Map((orgs ?? []).map((o) => [o.user_id, o.org_name]));
  const person = new Map((people ?? []).map((p) => [p.id, p]));
  const s = stats.data;
  const cards = [
    ["Dinlenme", s?.plays], ["Beğeni", s?.likes], ["Kaydetme", s?.saves], ["Oy", s?.votes], ["Takipçi", s?.followers],
  ] as const;

  return (
    <>
      <section className="flex flex-col gap-3">
        <p className="card px-4 py-4 text-[15px]">
          Profilini bu hafta <span className="font-display text-2xl font-extrabold text-accent tabular-nums">{s?.scout_views_week ?? 0}</span> keşifçi görüntüledi.
        </p>
        <dl className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {cards.map(([label, n]) => (
            <div key={label} className="card flex flex-col gap-1 px-3 py-3">
              <dt className="text-xs text-text-muted">{label}</dt>
              <dd className="font-display text-2xl font-bold tabular-nums">{n ?? 0}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className={sectionTitle}>Gelen ilgiler</h2>
        {!contact.data && (
          <Notice tone="error">
            Kabul ettiğin keşifçiler sana ulaşabilsin diye <Link href="/profil/duzenle" className="link">profiline iletişim e-postası ekle</Link>.
          </Notice>
        )}
        {(incoming.data ?? []).length === 0 ? (
          <p className="text-sm text-text-muted">Bekleyen ilgi yok. Onaylı keşifçiler ilgi gönderince burada görürsün; kabul edersen iletişim bilgileriniz karşılıklı açılır.</p>
        ) : (
          <ul className="divide-y divide-border">
            {(incoming.data ?? []).map((i) => i.profiles && (
              <li key={i.scout_id}>
                <ArtistLine p={i.profiles} sub={org.get(i.scout_id) ?? "Onaylı keşifçi"}>
                  <form action={answerInterest} className="flex gap-2">
                    <input type="hidden" name="scout_id" value={i.scout_id} />
                    <button type="submit" name="accept" value="1" className="btn-primary">Kabul et</button>
                    <button type="submit" name="accept" value="0" className="btn-ghost">Reddet</button>
                  </form>
                </ArtistLine>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className={sectionTitle}>Eşleşmeler</h2>
        {(matches.data ?? []).length === 0 ? (
          <p className="text-sm text-text-muted">Henüz eşleşme yok.</p>
        ) : (
          <ul className="divide-y divide-border">
            {(matches.data ?? []).map((m) => {
              const p = person.get(m.other_id);
              return p ? (
                <li key={m.other_id}>
                  <ArtistLine p={p} sub={[org.get(m.other_id), m.contact_person].filter(Boolean).join(" · ")}>
                    {m.email && <a href={`mailto:${m.email}`} className="link text-sm">{m.email}</a>}
                  </ArtistLine>
                </li>
              ) : null;
            })}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <h2 className={sectionTitle}>İlan başvurularım</h2>
          <Link href="/firsatlar" className="btn-ghost">Fırsat panosu</Link>
        </div>
        {(apps.data ?? []).length === 0 ? (
          <p className="text-sm text-text-muted">Fırsat panosundaki ilanlara bir parçanla başvurabilirsin.</p>
        ) : (
          <ul className="divide-y divide-border">
            {(apps.data ?? []).map((a) => (
              <li key={a.opportunity_id} className="flex items-center justify-between gap-3 py-2.5">
                <Link href={`/firsatlar/${a.opportunity_id}`} className="truncate text-[15px] font-medium hover:underline">{a.opportunities?.title}</Link>
                <span className={`shrink-0 text-xs ${a.status === "matched" ? "text-accent" : "text-text-muted"}`}>{APP_STATUS[a.status]}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

export default function Page() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-7 md:py-14">
      <h1 className="font-display text-4xl leading-none font-extrabold tracking-[-0.04em] md:text-5xl">Sanatçı paneli</h1>
      <Suspense fallback={<ListSkeleton />}>
        <Dashboard />
      </Suspense>
    </main>
  );
}
