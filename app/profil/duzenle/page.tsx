import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ActionForm } from "@/app/components/action-form";
import { Field } from "@/app/components/field";
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
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-muted">Kısa biyografi</span>
          <textarea name="bio" defaultValue={profile.bio ?? ""} maxLength={300} rows={4} className="input" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-muted">Şehir</span>
          <select name="city" defaultValue={profile.city ?? ""} className="input">
            <option value="">Seçilmedi</option>
            {CITIES.map((c, i) => (
              <option key={c} value={i + 1}>{c}</option>
            ))}
          </select>
        </label>

        {isArtist && (
          <>
            <GenrePills type="checkbox" defaultValues={profile.genres} />
            {tracks && tracks.length > 0 && (
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium text-muted">Öne çıkan parça</span>
                <select name="featured_track_id" defaultValue={profile.featured_track_id ?? ""} className="input">
                  <option value="">Yok</option>
                  {tracks.map((t) => (
                    <option key={t.id} value={t.id}>{t.title}</option>
                  ))}
                </select>
                <span className="text-xs text-subtle">Profilinin en üstünde gösterilir.</span>
              </label>
            )}
            <label className="flex items-start gap-3 rounded-xl bg-surface-2 p-3.5 text-sm">
              <input
                type="checkbox"
                name="open_to_discovery"
                defaultChecked={profile.open_to_discovery}
                className="mt-0.5 size-4 accent-accent"
              />
              <span>
                <span className="font-semibold">Keşfedilmeye açığım</span>
                <span className="block text-xs text-muted">Yapımcı ve plak şirketlerinden teklif almak istiyorum.</span>
              </span>
            </label>
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
      <Link href={`/${profile.username}`} className="text-sm text-muted hover:text-foreground">
        Profilimi görüntüle →
      </Link>
    </>
  );
}

export default function Page() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-10">
      <h1 className="font-display text-3xl font-bold tracking-tight">Profili düzenle</h1>
      <Suspense fallback={<p className="text-muted">Yükleniyor…</p>}>
        <EditForm />
      </Suspense>
    </main>
  );
}
