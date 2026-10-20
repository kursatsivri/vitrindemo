import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ActionForm } from "@/app/components/action-form";
import { FormSkeleton, Select } from "@/app/components/field";
import { GenrePills } from "@/app/components/genre-pills";
import { CITIES, TAGS } from "@/lib/music";
import { createClient } from "@/lib/supabase/server";
import { savePreferences } from "./actions";

export const metadata: Metadata = { title: "Tercihler | Vitrin" };

async function PreferencesForm() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/giris");

  const [{ data: prefs }, { data: profile }] = await Promise.all([
    supabase.from("user_preferences").select("genres, tags").maybeSingle(),
    supabase.from("profiles").select("city").eq("id", user.id).single(),
  ]);

  return (
    <ActionForm action={savePreferences} submitLabel="Kaydet ve keşfetmeye başla">
      <GenrePills type="checkbox" defaultValues={prefs?.genres ?? []} />
      <fieldset className="flex flex-wrap gap-2">
        <legend className="label mb-2.5">Sevdiğin tarzlar (isteğe bağlı)</legend>
        {TAGS.map((t) => (
          <label key={t.value} className="chip">
            <input type="checkbox" name="tags" value={t.value} defaultChecked={prefs?.tags.includes(t.value)} className="sr-only" />
            {t.label}
          </label>
        ))}
      </fieldset>
      <Select label="Şehrin" name="city" defaultValue={profile?.city ? String(profile.city) : ""} hint="Profilinde görünür; yakınındaki yetenekler için kullanılır.">
        <option value="">Belirtme</option>
        {CITIES.map((c, i) => <option key={c} value={i + 1}>{c}</option>)}
      </Select>
    </ActionForm>
  );
}

export default function Page() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-7 md:py-14">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-4xl leading-none font-extrabold tracking-[-0.04em]">Neler dinlersin?</h1>
        <p className="text-sm text-text-muted">
          Seçimlerine göre keşfet ve “Sana özel” önerileri gelir. İstediğin zaman değiştirebilirsin.{" "}
          <Link href="/kesfet" className="link">Şimdilik geç</Link>
        </p>
      </div>
      <Suspense fallback={<FormSkeleton fields={3} />}>
        <PreferencesForm />
      </Suspense>
    </main>
  );
}
