import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { ActionForm } from "@/app/components/action-form";
import { Field, FormSkeleton, TextArea } from "@/app/components/field";
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
      "id, title, genre, description, cover_path, audio_path, tags, moods, hook_sec, seeking_vocal, challenge_candidate, links, track_features(profiles(username))",
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
          placeholder=""
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
            challengeCandidate: track.challenge_candidate,
            links: track.links as Record<string, string>,
            feats: track.track_features.flatMap((f) => (f.profiles ? [f.profiles.username] : [])),
          }}
        />
        <TextArea label="Açıklama (opsiyonel)" name="description" defaultValue={track.description ?? ""} maxLength={500} rows={3} />
      </ActionForm>
      <p className="text-center text-xs text-text-muted">Ses dosyası değiştirilemez; farklı bir versiyon için parçayı silip yeniden yükle.</p>
      <DeleteButton id={track.id} />
    </>
  );
}

export default function Page({ params }: PageProps<"/parca/[id]/duzenle">) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-8 px-4 py-7 md:py-14">
      <h1 className="font-display text-4xl leading-none font-extrabold tracking-[-0.04em] md:text-5xl">Parçayı düzenle</h1>
      <Suspense fallback={<FormSkeleton fields={5} />}>
        <EditTrack params={params} />
      </Suspense>
    </main>
  );
}
