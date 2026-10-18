import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { ActionForm } from "@/app/components/action-form";
import { Field } from "@/app/components/field";
import { TrackMetaFields } from "@/app/components/track-meta-fields";
import { ImageInput } from "@/app/components/image-input";
import { createClient } from "@/lib/supabase/server";
import { storageUrl } from "@/lib/tracks";
import { updateTrack } from "./actions";
import { DeleteButton } from "./delete-button";

export const metadata = { title: "Parçayı düzenle — Vitrin" };

async function EditTrack({ params }: { params: PageProps<"/parca/[id]/duzenle">["params"] }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/giris");

  const { data: track } = await supabase
    .from("tracks")
    .select(
      "id, title, genre, description, cover_path, audio_path, tags, moods, hook_sec, seeking_vocal, links, track_features(profiles(username))",
    )
    .eq("id", id)
    .eq("artist_id", user.id)
    .maybeSingle();
  if (!track) notFound();

  return (
    <>
      <ActionForm action={updateTrack} submitLabel="Kaydet">
        <input type="hidden" name="id" value={track.id} />
        <ImageInput
          bucket="covers"
          userId={user.id}
          initialPath={track.cover_path}
          fieldName="cover_path"
          maxMb={3}
          placeholder="♪"
          alt={track.title}
        />
        <Field label="Başlık" name="title" defaultValue={track.title} required maxLength={80} />
        <TrackMetaFields
          previewSrc={storageUrl("tracks", track.audio_path)}
          defaults={{
            genre: track.genre,
            tags: track.tags,
            moods: track.moods,
            hookSec: track.hook_sec,
            seekingVocal: track.seeking_vocal,
            links: track.links as Record<string, string>,
            feats: track.track_features.flatMap((f) => (f.profiles ? [f.profiles.username] : [])),
          }}
        />
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-muted">Açıklama (opsiyonel)</span>
          <textarea name="description" defaultValue={track.description ?? ""} maxLength={500} rows={3} className="input" />
        </label>
      </ActionForm>
      <p className="text-xs text-subtle">Ses dosyası değiştirilemez; farklı bir versiyon için parçayı silip yeniden yükle.</p>
      <DeleteButton id={track.id} />
    </>
  );
}

export default function Page({ params }: PageProps<"/parca/[id]/duzenle">) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-10">
      <h1 className="font-display text-3xl font-bold tracking-tight">Parçayı düzenle</h1>
      <Suspense fallback={<p className="text-muted">Yükleniyor…</p>}>
        <EditTrack params={params} />
      </Suspense>
    </main>
  );
}
