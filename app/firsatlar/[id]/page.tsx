import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Inbox } from "lucide-react";
import { Suspense } from "react";
import { ActionForm } from "@/app/components/action-form";
import { ArtistLine, PROFILE_MINI, sectionTitle } from "@/app/components/artist-line";
import { Select, TextArea } from "@/app/components/field";
import { EmptyState, Notice } from "@/app/components/notice";
import { TrackQueue } from "@/app/components/player";
import { ListSkeleton, toPlayerTrack, TrackRow } from "@/app/components/track-row";
import { cityName, GENRES, labelOf } from "@/lib/music";
import { SEEKING, trToday } from "@/lib/scouts";
import { createClient } from "@/lib/supabase/server";
import { applyOpportunity, closeOpportunity, reviewApplication } from "../actions";

export const metadata: Metadata = { title: "İlan | Vitrin" };

const STATUS: Record<string, string> = {
  pending: "Yeni",
  shortlisted: "Kısa listede",
  declined: "Reddedildi",
  matched: "Eşleştiniz",
};

type Supa = Awaited<ReturnType<typeof createClient>>;

// İlan sahibi: başvuruları dinler, kısa listeye alır, reddeder ya da eşleşir (eşleşince iletişim açılır).
async function Applications({ supabase, id }: { supabase: Supa; id: string }) {
  const { data, error } = await supabase
    .from("opportunity_applications")
    .select(`artist_id, note, status, tracks(id, title, genre, audio_path, cover_path, duration_sec, status), profiles!artist_id(${PROFILE_MINI})`)
    .eq("opportunity_id", id)
    .order("created_at");
  if (error) throw new Error(`Başvurular yüklenemedi: ${error.message}`);
  const rows = data.filter((a) => a.tracks && a.profiles);
  if (rows.length === 0) return <EmptyState icon={Inbox} title="Henüz başvuru yok" />;

  const artistOf = (a: (typeof rows)[number]) => ({ name: a.profiles!.display_name || a.profiles!.username, username: a.profiles!.username });
  return (
    <TrackQueue tracks={rows.map((a) => toPlayerTrack(a.tracks!, artistOf(a)))}>
      <ul className="flex flex-col gap-3">
        {rows.map((a, i) => (
          <li key={a.artist_id} className="card flex flex-col gap-1 px-4 py-2">
            <ArtistLine p={a.profiles!} sub={STATUS[a.status]}>
              {a.status !== "matched" && (
                <form action={reviewApplication} className="flex flex-wrap gap-2">
                  <input type="hidden" name="opportunity_id" value={id} />
                  <input type="hidden" name="artist_id" value={a.artist_id} />
                  {a.status !== "shortlisted" && <button type="submit" name="status" value="shortlisted" className="btn-secondary">Kısa liste</button>}
                  {a.status !== "declined" && <button type="submit" name="status" value="declined" className="btn-ghost">Reddet</button>}
                  <button type="submit" name="status" value="matched" className="btn-primary">Eşleş</button>
                </form>
              )}
              {a.status === "matched" && <Link href="/kesifci" className="link text-sm">İletişim bilgisi</Link>}
            </ArtistLine>
            <ol className="-mx-2">
              <TrackRow track={a.tracks!} artist={artistOf(a)} index={i} />
            </ol>
            {a.note && <p className="pb-2 text-sm whitespace-pre-line text-text-muted">“{a.note}”</p>}
          </li>
        ))}
      </ul>
    </TrackQueue>
  );
}

// Sanatçı: kendi aktif parçalarından biriyle başvurur (ilan başına 1).
async function ApplyBox({ supabase, id, userId }: { supabase: Supa; id: string; userId: string }) {
  const [{ data: mine }, { data: tracks }] = await Promise.all([
    supabase.from("opportunity_applications").select("status").eq("opportunity_id", id).eq("artist_id", userId).maybeSingle(),
    supabase.from("tracks").select("id, title").eq("artist_id", userId).eq("status", "active").order("created_at", { ascending: false }),
  ]);
  if (mine) return <Notice tone="success">Başvurdun · {STATUS[mine.status] === "Yeni" ? "Değerlendiriliyor" : STATUS[mine.status]}</Notice>;
  if (!tracks?.length) return <Notice tone="error">Başvurmak için önce <Link href="/yukle" className="link">bir parça yükle</Link>.</Notice>;
  return (
    <ActionForm action={applyOpportunity} submitLabel="Parçamla başvur">
      <input type="hidden" name="opportunity_id" value={id} />
      <Select label="Hangi parçanla?" name="track_id" required>
        {tracks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
      </Select>
      <TextArea label="Kısa not (isteğe bağlı)" name="note" maxLength={300} rows={3} />
    </ActionForm>
  );
}

async function Opportunity({ params }: { params: PageProps<"/firsatlar/[id]">["params"] }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const supabase = await createClient();
  const [{ data: o }, { data: claims }] = await Promise.all([
    supabase.from("opportunities").select(`id, scout_id, title, seeking, genre, city, deadline, body, closed, profiles!scout_id(${PROFILE_MINI})`).eq("id", id).maybeSingle(),
    supabase.auth.getClaims(),
  ]);
  if (!o) notFound();
  const viewerId = claims?.claims.sub ?? null;
  const isOwner = viewerId === o.scout_id;
  const open = !o.closed && o.deadline >= trToday();
  const [{ data: org }, me] = await Promise.all([
    supabase.from("scout_profiles").select("org_name").eq("user_id", o.scout_id).maybeSingle(),
    viewerId && !isOwner ? supabase.from("profiles").select("role").eq("id", viewerId).single() : null,
  ]);

  return (
    <>
      <header className="flex flex-col gap-3">
        <span className={`w-fit rounded-full px-3 py-1 text-xs font-medium ${open ? "bg-accent-soft text-accent" : "bg-surface-2 text-text-muted"}`}>
          {open ? `Açık · son gün ${o.deadline}` : "Kapandı"}
        </span>
        <h1 className="font-display text-4xl leading-none font-extrabold tracking-[-0.04em]">{o.title}</h1>
        <p className="text-sm text-text-muted">
          {[labelOf(SEEKING, o.seeking), o.genre && labelOf(GENRES, o.genre), cityName(o.city)].filter(Boolean).join(" · ")}
        </p>
        {o.profiles && <ArtistLine p={o.profiles} sub={org?.org_name ?? "Onaylı keşifçi"} />}
      </header>
      <p className="text-[15px] leading-relaxed whitespace-pre-line">{o.body}</p>

      {isOwner ? (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className={sectionTitle}>Başvurular</h2>
            {open && (
              <form action={closeOpportunity}>
                <input type="hidden" name="id" value={o.id} />
                <button type="submit" className="btn-ghost">İlanı kapat</button>
              </form>
            )}
          </div>
          <Applications supabase={supabase} id={o.id} />
        </section>
      ) : open && me?.data?.role === "artist" && viewerId ? (
        <section className="flex flex-col gap-3">
          <h2 className={sectionTitle}>Başvur</h2>
          <ApplyBox supabase={supabase} id={o.id} userId={viewerId} />
        </section>
      ) : open && !viewerId ? (
        <p className="text-sm text-text-muted"><Link href="/giris" className="link">Giriş yap</Link>, sanatçı hesabınla bir parçanla başvur.</p>
      ) : null}
    </>
  );
}

export default function Page({ params }: PageProps<"/firsatlar/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-7 md:py-14">
      <Suspense fallback={<ListSkeleton />}>
        <Opportunity params={params} />
      </Suspense>
    </main>
  );
}
