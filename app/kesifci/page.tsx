import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell, Briefcase, Search, Star, Trash2 } from "lucide-react";
import { Suspense } from "react";
import { ActionForm } from "@/app/components/action-form";
import { ArtistLine, PROFILE_MINI, sectionTitle } from "@/app/components/artist-line";
import { Field, FormSkeleton, Select, TextArea } from "@/app/components/field";
import { EmptyState, Notice } from "@/app/components/notice";
import { cityName, CITIES, GENRES, labelOf } from "@/lib/music";
import { SCOUT_KINDS, trToday } from "@/lib/scouts";
import { createClient } from "@/lib/supabase/server";
import { addAlert, applyScout, deleteAlert, saveNote } from "./actions";

export const metadata: Metadata = { title: "Keşifçi | Vitrin" };

type Supa = Awaited<ReturnType<typeof createClient>>;

// Keşifçi olmayana: başvuru formu ya da başvuru durumu
async function Apply({ supabase, role }: { supabase: Supa; role: string }) {
  if (role === "artist") {
    return <Notice tone="error">Sanatçı hesabıyla keşifçi başvurusu yapılamaz. Keşifçi olarak ayrı bir dinleyici hesabı aç.</Notice>;
  }
  if (role === "admin") return <Link href="/admin/kesifciler" className="link">Bekleyen başvurulara git</Link>;

  const { data: app } = await supabase.from("scout_applications").select("status, org_name, reviewed_at").maybeSingle();
  if (app?.status === "pending") {
    return <Notice tone="success">“{app.org_name}” başvurun inceleniyor. Onaylanınca bu sayfada keşifçi araçların açılır.</Notice>;
  }
  return (
    <>
      {app?.status === "rejected" && (
        <Notice tone="error">Önceki başvurun onaylanmadı. Reddedilen başvurudan 30 gün sonra tekrar başvurabilirsin.</Notice>
      )}
      <p className="text-sm leading-relaxed text-text-muted">
        Yapımcı, plak şirketi ya da menajer misin? Başvurun onaylanınca “Onaylı Keşifçi” rozeti alırsın; yetenekleri
        favorileyip not tutabilir, ilgi gönderip eşleşebilir ve fırsat panosunda ilan açabilirsin. Keşifçiler oy veremez.
      </p>
      <ActionForm action={applyScout} submitLabel="Başvur">
        <Select label="Ne olarak başvuruyorsun?" name="kind" required defaultValue="">
          <option value="" disabled>Seç</option>
          {SCOUT_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
        </Select>
        <Field label="Ad / şirket" name="org_name" required minLength={2} maxLength={80} />
        <Field label="Web sitesi veya Instagram" name="website" type="url" placeholder="https://" hint="İsteğe bağlı" />
        <Field label="Yetkili kişi" name="contact_person" required minLength={2} maxLength={80} />
        <Field label="İletişim e-postası" name="contact_email" type="email" required hint="Sadece eşleştiğin sanatçılar görür." />
        <TextArea label="Kısaca kimsin, ne arıyorsun?" name="about" required minLength={10} maxLength={500} rows={4} />
      </ActionForm>
    </>
  );
}

async function Panel({ supabase, userId }: { supabase: Supa; userId: string }) {
  const [matches, favs, sent, opps, alerts, hits] = await Promise.all([
    supabase.rpc("my_matches"),
    supabase.from("scout_favorites").select(`artist_id, note, profiles!artist_id(${PROFILE_MINI})`).order("created_at", { ascending: false }),
    supabase.from("interests").select(`artist_id, status, profiles!artist_id(${PROFILE_MINI})`).eq("scout_id", userId).neq("status", "accepted").order("created_at", { ascending: false }),
    supabase.from("opportunities").select("id, title, deadline, closed").eq("scout_id", userId).order("created_at", { ascending: false }),
    supabase.from("scout_alerts").select("id, genre, city, min_week_votes").order("created_at"),
    supabase.rpc("alert_matches"),
  ]);
  const ids = [...new Set([...(matches.data ?? []).map((m) => m.other_id), ...(hits.data ?? []).map((h) => h.artist_id)])];
  const { data: people } = ids.length ? await supabase.from("profiles").select(`id, ${PROFILE_MINI}`).in("id", ids) : { data: [] };
  const person = new Map((people ?? []).map((p) => [p.id, p]));
  const today = trToday();
  // Alarm sonuçları: sanatçı başına en yüksek haftalık oy
  const hitBest = new Map<string, number>();
  for (const h of hits.data ?? []) hitBest.set(h.artist_id, Math.max(hitBest.get(h.artist_id) ?? 0, h.score));

  return (
    <>
      <nav className="flex flex-wrap gap-2">
        <Link href="/kesfet" className="btn-secondary">Keşfet</Link>
        <Link href="/kesifci/ara" className="btn-secondary"><Search aria-hidden className="size-4" strokeWidth={1.75} />Gelişmiş arama</Link>
        <Link href="/firsatlar" className="btn-secondary"><Briefcase aria-hidden className="size-4" strokeWidth={1.75} />Fırsat panosu</Link>
      </nav>

      <section className="flex flex-col gap-2">
        <h2 className={sectionTitle}>Eşleşmeler</h2>
        {(matches.data ?? []).length === 0 ? (
          <p className="text-sm text-text-muted">Henüz eşleşme yok. Sanatçı ilgini kabul edince ya da ilan başvurusunda “Eşleş” deyince iletişim bilgisi burada açılır.</p>
        ) : (
          <ul className="divide-y divide-border">
            {(matches.data ?? []).map((m) => {
              const p = person.get(m.other_id);
              return p ? (
                <li key={m.other_id}>
                  <ArtistLine p={p}>
                    {m.email ? <a href={`mailto:${m.email}`} className="link text-sm">{m.email}</a> : <span className="text-xs text-text-muted">E-posta eklememiş; profilindeki linklerden ulaş</span>}
                  </ArtistLine>
                </li>
              ) : null;
            })}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className={sectionTitle}>Favoriler</h2>
        {(favs.data ?? []).length === 0 ? (
          <EmptyState icon={Star} title="Favori yok">Keşfette ya da profillerde “Favorile” ile ekle. Notların sadece sana görünür.</EmptyState>
        ) : (
          <ul className="flex flex-col gap-3">
            {(favs.data ?? []).map((f) => f.profiles && (
              <li key={f.artist_id} className="card px-4 py-2">
                <ArtistLine p={f.profiles} />
                <details className="pb-2" open={!!f.note}>
                  <summary className="cursor-pointer text-sm text-text-muted">Özel not</summary>
                  <div className="mt-3">
                    <ActionForm action={saveNote} submitLabel="Notu kaydet">
                      <input type="hidden" name="artist_id" value={f.artist_id} />
                      <TextArea label="Not (sadece sen görürsün)" name="note" defaultValue={f.note ?? ""} maxLength={1000} rows={3} />
                    </ActionForm>
                  </div>
                </details>
              </li>
            ))}
          </ul>
        )}
      </section>

      {(sent.data ?? []).length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className={sectionTitle}>Gönderilen ilgiler</h2>
          <ul className="divide-y divide-border">
            {(sent.data ?? []).map((i) => i.profiles && (
              <li key={i.artist_id}>
                <ArtistLine p={i.profiles}>
                  <span className="text-xs text-text-muted">{i.status === "pending" ? "Cevap bekleniyor" : "Reddedildi"}</span>
                </ArtistLine>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className={sectionTitle}>İlanlarım</h2>
          <Link href="/firsatlar#yeni" className="btn-ghost">Yeni ilan</Link>
        </div>
        {(opps.data ?? []).length === 0 ? (
          <p className="text-sm text-text-muted">Henüz ilan açmadın. Aynı anda en fazla 5 açık ilanın olabilir.</p>
        ) : (
          <ul className="divide-y divide-border">
            {(opps.data ?? []).map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-3 py-2.5">
                <Link href={`/firsatlar/${o.id}`} className="truncate text-[15px] font-medium hover:underline">{o.title}</Link>
                <span className="shrink-0 text-xs text-text-muted">{o.closed || o.deadline < today ? "Kapalı" : `Son gün ${o.deadline}`}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className={sectionTitle}>Yetenek alarmı</h2>
        <p className="text-sm text-text-muted">Bu hafta yükselenlerden kriterine uyan yeni yetenekler burada listelenir.</p>
        {(alerts.data ?? []).length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {(alerts.data ?? []).map((a) => (
              <li key={a.id} className="flex items-center gap-1 rounded-full bg-surface-2 py-1 pr-1 pl-3 text-xs">
                {[a.genre ? labelOf(GENRES, a.genre) : "Tüm türler", cityName(a.city) ?? "Tüm şehirler", `haftada ${a.min_week_votes}+ oy`].join(" · ")}
                <form action={deleteAlert}>
                  <input type="hidden" name="id" value={a.id} />
                  <button type="submit" aria-label="Alarmı sil" className="icon-btn size-7"><Trash2 aria-hidden className="size-3.5" strokeWidth={1.75} /></button>
                </form>
              </li>
            ))}
          </ul>
        )}
        {hitBest.size > 0 ? (
          <ul className="divide-y divide-border">
            {[...hitBest].map(([id, score]) => {
              const p = person.get(id);
              return p ? <li key={id}><ArtistLine p={p} sub={`bu hafta ${score} oy`} /></li> : null;
            })}
          </ul>
        ) : (alerts.data ?? []).length > 0 && <p className="text-sm text-text-muted">Şu an alarmlarına uyan yükselen yetenek yok.</p>}
        <details className="card px-4 py-3">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium">
            <Bell aria-hidden className="size-4" strokeWidth={1.75} />Alarm kur
          </summary>
          <div className="mt-4">
            <ActionForm action={addAlert} submitLabel="Alarmı kur">
              <div className="grid grid-cols-2 gap-3">
                <Select label="Tür" name="genre" defaultValue="">
                  <option value="">Hepsi</option>
                  {GENRES.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
                </Select>
                <Select label="Şehir" name="city" defaultValue="">
                  <option value="">Hepsi</option>
                  {CITIES.map((c, i) => <option key={c} value={i + 1}>{c}</option>)}
                </Select>
              </div>
              <Field label="Bu hafta en az kaç oy?" name="min_week_votes" type="number" min={1} max={1000} defaultValue={3} />
            </ActionForm>
          </div>
        </details>
      </section>
    </>
  );
}

async function ScoutHome() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/giris");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const role = profile?.role ?? "listener";
  return role === "scout" ? <Panel supabase={supabase} userId={user.id} /> : <Apply supabase={supabase} role={role} />;
}

export default function Page() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-7 md:py-14">
      <h1 className="font-display text-4xl leading-none font-extrabold tracking-[-0.04em] md:text-5xl">Keşifçi</h1>
      <Suspense fallback={<FormSkeleton fields={5} />}>
        <ScoutHome />
      </Suspense>
    </main>
  );
}
