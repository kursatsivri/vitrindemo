import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarClock, Mic } from "lucide-react";
import { Suspense } from "react";
import { EmptyState } from "@/app/components/notice";
import { createClient } from "@/lib/supabase/server";
import { WEEKLY_UPLOAD_LIMIT, weekStart } from "@/lib/tracks";
import { FormSkeleton } from "@/app/components/field";
import { UploadForm } from "./upload-form";

export const metadata = { title: "Parça yükle — Vitrin" };

async function Upload() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/giris");

  const [{ data: profile }, { count }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user.id).single(),
    supabase
      .from("tracks")
      .select("id", { count: "exact", head: true })
      .eq("artist_id", user.id)
      .gte("created_at", weekStart().toISOString()),
  ]);

  if (profile?.role !== "artist") {
    return (
      <EmptyState icon={Mic} title="Sadece sanatçılar yükleyebilir" action={<Link href="/" className="btn-secondary">Ana sayfaya dön</Link>}>
        Dinleyici hesabıyla parça yüklenemiyor.
      </EmptyState>
    );
  }

  const left = Math.max(0, WEEKLY_UPLOAD_LIMIT - (count ?? 0));
  if (left === 0) {
    return (
      <EmptyState icon={CalendarClock} title="Bu haftalık hakkın doldu" action={<Link href="/" className="btn-secondary">Ana sayfaya dön</Link>}>
        Haftada en fazla {WEEKLY_UPLOAD_LIMIT} parça yüklenebilir. Hakların pazartesi yenilenir.
      </EmptyState>
    );
  }

  return (
    <>
      <Quota left={left} />
      <UploadForm userId={user.id} />
    </>
  );
}

// Haftalık hak göstergesi: kullanılanlar sönük, kalanlar turuncu.
function Quota({ left }: { left: number }) {
  return (
    <div className="-mt-4 flex w-fit items-center gap-3 md:absolute md:top-14 md:right-10 md:mt-0 md:h-11 md:rounded-full md:border md:border-border md:bg-surface md:px-[18px]">
      <div aria-hidden className="flex gap-1">
        {Array.from({ length: WEEKLY_UPLOAD_LIMIT }, (_, i) => (
          <span key={i} className={`h-1.5 w-7 rounded-full md:w-[22px] ${i < WEEKLY_UPLOAD_LIMIT - left ? "bg-border" : "bg-accent"}`} />
        ))}
      </div>
      <span className="text-[13px] text-text-muted">
        Bu hafta <span className="font-medium text-text">{left} hakkın</span> kaldı · Pazartesi yenilenir
      </span>
    </div>
  );
}

export default function Page() {
  return (
    <main className="relative mx-auto flex w-full max-w-[1040px] flex-1 flex-col gap-8 px-4 py-7 md:gap-10 md:px-10 md:py-14">
      <h1 className="font-display text-4xl leading-none font-extrabold tracking-[-0.04em] md:text-[56px] md:tracking-[-0.045em]">Parça yükle</h1>
      <Suspense fallback={<FormSkeleton />}>
        <Upload />
      </Suspense>
    </main>
  );
}
