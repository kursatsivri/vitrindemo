import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ActionForm } from "@/app/components/action-form";
import { Field } from "@/app/components/field";
import { GENRES, SOCIALS } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { updateProfile } from "./actions";
import { AvatarInput } from "./avatar-input";

export const metadata = { title: "Profili düzenle — Vitrin" };

async function EditForm() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/giris");

  const [{ data: profile }, { data: contact }] = await Promise.all([
    supabase
      .from("profiles")
      .select("role, username, display_name, bio, genres, socials, avatar_path")
      .eq("id", user.id)
      .single(),
    supabase.from("artist_contacts").select("email").eq("profile_id", user.id).maybeSingle(),
  ]);
  if (!profile) redirect("/giris");

  const isArtist = profile.role === "artist";
  const socials = (profile.socials ?? {}) as Record<string, string>;

  return (
    <>
      <ActionForm action={updateProfile} submitLabel="Kaydet">
        <AvatarInput
          userId={user.id}
          initialPath={profile.avatar_path}
          name={profile.display_name || profile.username}
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

        {isArtist && (
          <>
            <fieldset className="flex gap-2 text-sm">
              <legend className="mb-1.5 font-medium text-muted">Tür</legend>
              {GENRES.map((g) => (
                <label
                  key={g.value}
                  className="cursor-pointer rounded-full border border-border bg-surface-2 px-4 py-1.5 font-medium transition-colors has-[:checked]:border-accent has-[:checked]:bg-accent/10 has-[:checked]:text-accent has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent"
                >
                  <input
                    type="checkbox"
                    name="genres"
                    value={g.value}
                    defaultChecked={profile.genres.includes(g.value)}
                    className="sr-only"
                  />
                  {g.label}
                </label>
              ))}
            </fieldset>
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
              hint="Sadece onaylı plak şirketleri görebilir."
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
