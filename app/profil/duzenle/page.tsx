import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ActionForm } from "@/app/components/action-form";
import { CheckCard, Field, FormSkeleton, Select, TextArea } from "@/app/components/field";
import { ImageInput } from "@/app/components/image-input";
import { GenrePills } from "@/app/components/genre-pills";
import { CITIES } from "@/lib/music";
import { SOCIALS } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { updateProfile } from "./actions";

export const metadata = { title: "Profili düzenle — Vitrin" };

async function EditForm() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/giris");

  const [{ data: profile }, { data: contact }, { data: tracks }] = await Promise.all([
    supabase
      .from("profiles")
      .select("role, username, display_name, bio, genres, socials, avatar_path, city, open_to_discovery, featured_track_id")
      .eq("id", user.id)
      .single(),
    supabase.from("artist_contacts").select("email").eq("profile_id", user.id).maybeSingle(),
    supabase.from("tracks").select("id, title").eq("artist_id", user.id).order("created_at", { ascending: false }),
  ]);
  if (!profile) redirect("/giris");

  const isArtist = profile.role === "artist";
  const socials = (profile.socials ?? {}) as Record<string, string>;

  return (
    <>
      <ActionForm action={updateProfile} submitLabel="Kaydet">
        <ImageInput
          bucket="avatars"
          userId={user.id}
          initialPath={profile.avatar_path}
          fieldName="avatar_path"
          maxMb={2}
          round
          placeholder={(profile.display_name || profile.username).charAt(0)}
          alt={profile.display_name || profile.username}
        />
        <Field
          label="Kullanıcı adı"
          name="username"
          defaultValue={profile.username}
          required
          minLength={3}
          maxLength={20}
          pattern="[a-z0-9_.]{3,20}"
          autoCapitalize="none"
        />
        <Field label="Görünen ad" name="display_name" defaultValue={profile.display_name ?? ""} maxLength={50} />
        <TextArea label="Kısa biyografi" name="bio" defaultValue={profile.bio ?? ""} maxLength={300} rows={4} />
        <Select label="Şehir" name="city" defaultValue={profile.city ?? ""}>
          <option value="">Seçilmedi</option>
          {CITIES.map((c, i) => (
            <option key={c} value={i + 1}>{c}</option>
          ))}
        </Select>

        {isArtist && (
          <>
            <GenrePills type="checkbox" defaultValues={profile.genres} />
            {tracks && tracks.length > 0 && (
              <Select
                label="Öne çıkan parça"
                name="featured_track_id"
                defaultValue={profile.featured_track_id ?? ""}
                hint="Profilinin en üstünde gösterilir."
              >
                <option value="">Yok</option>
                {tracks.map((t) => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </Select>
            )}
            <CheckCard
              name="open_to_discovery"
              defaultChecked={profile.open_to_discovery}
              title="Keşfedilmeye açığım"
              hint="Yapımcı ve plak şirketlerinden teklif almak istiyorum."
            />
            {SOCIALS.map((s) => (
              <Field
                key={s.key}
                label={s.label}
                name={s.key}
                type="url"
                defaultValue={socials[s.key] ?? ""}
                placeholder={`https://${s.hosts[0]}/…`}
              />
            ))}
            <Field
              label="İletişim e-postası (opsiyonel)"
              name="contact_email"
              type="email"
              defaultValue={contact?.email ?? ""}
              hint="Sadece eşleştiğin onaylı keşifçiler görebilir."
            />
          </>
        )}
      </ActionForm>
      <Link href={`/${profile.username}`} className="btn-ghost self-center">
        Profilimi görüntüle →
      </Link>
    </>
  );
}

export default function Page() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-8 px-4 py-7 md:py-14">
      <h1 className="font-display text-4xl leading-none font-extrabold tracking-[-0.04em] md:text-5xl">Profili düzenle</h1>
      <Suspense fallback={<FormSkeleton fields={5} />}>
        <EditForm />
      </Suspense>
    </main>
  );
}
