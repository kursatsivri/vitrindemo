"use server";

import { redirect } from "next/navigation";
import type { FormState } from "@/app/components/action-form";
import { createClient } from "@/lib/supabase/server";

// Dosyalar tarayıcıdan Storage'a zaten yüklendi; burada sadece kayıt açılır.
// Asıl kurallar (sanatçı mı, haftalık sınır, klasör sahipliği) DB'de.
export async function createTrack(formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/giris");

  const title = String(formData.get("title") ?? "").trim().slice(0, 80);
  const genre = String(formData.get("genre") ?? "");
  const audioPath = String(formData.get("audio_path") ?? "");
  const coverPath = String(formData.get("cover_path") ?? "") || null;
  const description = String(formData.get("description") ?? "").trim().slice(0, 500) || null;
  const duration = Math.round(Number(formData.get("duration_sec")));

  if (!title) return { error: "Başlık gerekli." };
  if (genre !== "rap" && genre !== "beat") return { error: "Tür seç: Rap veya Beat." };
  if (formData.get("rights") !== "on") return { error: "Haklar onayını işaretlemelisin." };
  if (!audioPath.startsWith(`${user.id}/`) || (coverPath && !coverPath.startsWith(`${user.id}/`))) {
    return { error: "Geçersiz dosya." };
  }

  const { error } = await supabase.from("tracks").insert({
    artist_id: user.id,
    title,
    genre,
    audio_path: audioPath,
    cover_path: coverPath,
    description,
    duration_sec: duration >= 1 && duration <= 3600 ? duration : null,
    rights_confirmed: true,
  });
  if (error) {
    if (error.hint === "weekly_limit") return { error: "Bu haftalık yükleme hakkın doldu (en fazla 3 parça)." };
    if (error.code === "42501") return { error: "Sadece sanatçı hesapları parça yükleyebilir." };
    return { error: "Parça kaydedilemedi. Lütfen tekrar dene." };
  }

  const { data: profile } = await supabase.from("profiles").select("username").eq("id", user.id).single();
  redirect(profile ? `/${profile.username}` : "/");
}
