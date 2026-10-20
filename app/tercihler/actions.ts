"use server";

import { redirect } from "next/navigation";
import type { FormState } from "@/app/components/action-form";
import { GENRES, TAGS } from "@/lib/music";
import { createClient } from "@/lib/supabase/server";

// Tercihler (tür + etiket) ve profildeki şehir. Listeler DB check'leriyle aynı; DB yine doğrular.
export async function savePreferences(_: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/giris");

  const picked = (key: string, list: readonly { value: string }[]) => {
    const values = formData.getAll(key).map(String);
    return list.map((x) => x.value).filter((v) => values.includes(v));
  };
  const genres = picked("genres", GENRES);
  if (genres.length === 0) return { error: "En az bir tür seç." };

  const city = Number(formData.get("city"));
  const [prefs, profile] = await Promise.all([
    supabase.from("user_preferences").upsert({ user_id: user.id, genres, tags: picked("tags", TAGS) }),
    supabase
      .from("profiles")
      .update({ city: Number.isInteger(city) && city >= 1 && city <= 81 ? city : null })
      .eq("id", user.id),
  ]);
  if (prefs.error || profile.error) return { error: "Kaydedilemedi. Lütfen tekrar dene." };

  redirect("/kesfet");
}
