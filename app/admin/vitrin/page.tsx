import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ActionForm } from "@/app/components/action-form";
import { ArtistLine, PROFILE_MINI, sectionTitle } from "@/app/components/artist-line";
import { Field } from "@/app/components/field";
import { ListSkeleton } from "@/app/components/track-row";
import { addDays } from "@/lib/scouts";
import { periodStart } from "@/lib/tracks";
import { createChallenge, setEditorPick } from "../actions";
import { adminClient } from "../guard";

export const metadata: Metadata = { title: "Vitrin ve challenge | Vitrin" };

async function Showcase() {
  const supabase = await adminClient();
  const week = periodStart("week");
  const next = addDays(week, 7);
  const [{ data: pick }, { data: challenges }, { data: beats }] = await Promise.all([
    supabase.from("editor_picks").select("note, tracks(id, title)").eq("week_start", week).maybeSingle(),
    supabase.from("challenges").select("week_start, tracks!beat_track_id(id, title)").in("week_start", [week, next]),
    supabase
      .from("tracks")
      .select(`id, title, created_at, profiles!artist_id(${PROFILE_MINI})`)
      .eq("challenge_candidate", true)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);
  const byWeek = new Map((challenges ?? []).map((c) => [c.week_start, c.tracks]));
  const slots = [
    { week, label: "Bu hafta" },
    { week: next, label: "Gelecek hafta" },
  ];

  return (
    <>
      <section className="flex flex-col gap-3">
        <h2 className={sectionTitle}>Editörün seçimi</h2>
        <p className="text-sm text-text-muted">
          Bu hafta ({week}):{" "}
          {pick?.tracks ? <Link href={`/p/${pick.tracks.id}`} className="link">{pick.tracks.title}</Link> : "seçilmedi"}
          {pick?.note && <> · “{pick.note}”</>}
        </p>
        <ActionForm action={setEditorPick} submitLabel="Bu haftanın seçimi yap">
          <Field label="Parça linki ya da kimliği" name="track" required placeholder="https://…/p/…" />
          <Field label="Kısa not (isteğe bağlı)" name="note" maxLength={140} />
        </ActionForm>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className={sectionTitle}>Haftalık challenge</h2>
        <ul className="flex flex-col gap-1 text-sm">
          {slots.map((s) => (
            <li key={s.week}>
              {s.label} ({s.week}): {byWeek.get(s.week) ? <Link href={`/p/${byWeek.get(s.week)!.id}`} className="link">{byWeek.get(s.week)!.title}</Link> : "seçilmedi"}
            </li>
          ))}
        </ul>
        <h3 className="text-sm font-medium">Aday beat'ler</h3>
        {(beats ?? []).length === 0 ? (
          <p className="text-sm text-text-muted">Henüz aday beat yok. Beatmaker'lar yükleme formunda "Haftalık challenge'a aday" seçeneğini işaretleyince burada görünür.</p>
        ) : (
          <ul className="divide-y divide-border">
            {(beats ?? []).map((b) => b.profiles && (
              <li key={b.id}>
                <ArtistLine p={b.profiles} sub={<Link href={`/p/${b.id}`} className="link">{b.title}</Link>}>
                  <form action={createChallenge} className="flex gap-2">
                    <input type="hidden" name="beat" value={b.id} />
                    {slots.filter((s) => !byWeek.has(s.week)).map((s) => (
                      <button key={s.week} type="submit" name="week" value={s.week} className="btn-secondary">{s.label}</button>
                    ))}
                  </form>
                </ArtistLine>
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
    <Suspense fallback={<ListSkeleton />}>
      <Showcase />
    </Suspense>
  );
}
