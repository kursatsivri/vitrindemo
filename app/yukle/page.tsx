import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { WEEKLY_UPLOAD_LIMIT, weekStart } from "@/lib/tracks";
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
    return <p className="text-muted">Sadece sanatçı hesapları parça yükleyebilir.</p>;
  }

  const left = Math.max(0, WEEKLY_UPLOAD_LIMIT - (count ?? 0));
  if (left === 0) {
    return (
      <p className="text-muted">
        Bu haftalık yükleme hakkın doldu (en fazla {WEEKLY_UPLOAD_LIMIT} parça). Pazartesi yenilenir.{" "}
        <Link href="/" className="link">Ana sayfaya dön</Link>
      </p>
    );
  }

  return (
    <>
      <p className="-mt-3 text-sm text-muted">Bu hafta {left} yükleme hakkın kaldı.</p>
      <UploadForm userId={user.id} />
    </>
  );
}

export default function Page() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-10">
      <h1 className="font-display text-3xl font-bold tracking-tight">Parça yükle</h1>
      <Suspense fallback={<p className="text-muted">Yükleniyor…</p>}>
        <Upload />
      </Suspense>
    </main>
  );
}
