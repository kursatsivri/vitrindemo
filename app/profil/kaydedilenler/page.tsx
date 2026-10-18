import { redirect } from "next/navigation";
import { Suspense } from "react";
import { TrackList, withArtist } from "@/app/components/track-row";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Kaydedilenler — Vitrin" };

async function Saved() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/giris");

  // RLS: sadece kendi kayıtları; gizlenen parçalar tracks RLS'iyle düşer.
  const { data, error } = await supabase
    .from("saves")
    .select("created_at, tracks(id, title, genre, cover_path, duration_sec, audio_path, status, profiles!artist_id(username, display_name))")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Kaydedilenler yüklenemedi: ${error.message}`);

  const tracks = (data ?? []).flatMap((s) => (s.tracks ? [s.tracks] : []));
  return <TrackList rows={withArtist(tracks)} empty="Henüz bir şey kaydetmedin. Parça sayfasındaki Kaydet butonuyla buraya eklenir." />;
}

export default function Page() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10">
      <h1 className="font-display text-4xl font-bold tracking-tight">Kaydedilenler</h1>
      <Suspense fallback={<p className="text-muted">Yükleniyor…</p>}>
        <Saved />
      </Suspense>
    </main>
  );
}
