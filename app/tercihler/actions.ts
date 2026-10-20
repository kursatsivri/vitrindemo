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
  const tags = picked("tags", TAGS);
  // upsert kullanılmaz: PostgREST user_id'yi de günceller, o kolonda update izni yok (sahiplik değişmesin).
  const savePrefs = async () => {
    const upd = await supabase.from("user_preferences").update({ genres, tags }).eq("user_id", user.id).select("user_id");
    if (upd.error || upd.data.length > 0) return upd;
    return supabase.from("user_preferences").insert({ user_id: user.id, genres, tags });
  };
  const [prefs, profile] = await Promise.all([
    savePrefs(),
    supabase
      .from("profiles")
      .update({ city: Number.isInteger(city) && city >= 1 && city <= 81 ? city : null })
      .eq("id", user.id),
  ]);
  if (prefs.error || profile.error) return { error: "Kaydedilemedi. Lütfen tekrar dene." };

  redirect("/kesfet");
}
