"use server";

import { redirect } from "next/navigation";
import type { FormState } from "@/app/components/action-form";
import { GENRES } from "@/lib/music";
import { createClient } from "@/lib/supabase/server";
import { readTrackMeta, readWaveform, resolveFeatures, syncFeatures } from "@/lib/track-form";

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
  if (!GENRES.some((g) => g.value === genre)) return { error: "Tür seç." };
  if (formData.get("rights") !== "on") return { error: "Haklar onayını işaretlemelisin." };
  if (!audioPath.startsWith(`${user.id}/`) || (coverPath && !coverPath.startsWith(`${user.id}/`))) {
    return { error: "Geçersiz dosya." };
  }
  const durationSec = duration >= 1 && duration <= 3600 ? duration : null;

  const meta = readTrackMeta(formData, genre, durationSec);
  if ("error" in meta) return meta;
  const feats = await resolveFeatures(supabase, meta.featUsernames, user.id);
  if ("error" in feats) return { error: feats.error };

  const { data: track, error } = await supabase.from("tracks").insert({
    artist_id: user.id,
    title,
    genre,
    audio_path: audioPath,
    cover_path: coverPath,
    description,
    duration_sec: durationSec,
    rights_confirmed: true,
    tags: meta.tags,
    moods: meta.moods,
    hook_sec: meta.hook_sec,
    seeking_vocal: meta.seeking_vocal,
    links: meta.links,
    waveform: readWaveform(formData),
  }).select("id").single();
  if (error) {
    if (error.hint === "weekly_limit") return { error: "Bu haftalık yükleme hakkın doldu (en fazla 3 parça)." };
    if (error.code === "42501") return { error: "Sadece sanatçı hesapları parça yükleyebilir." };
    return { error: "Parça kaydedilemedi. Lütfen tekrar dene." };
  }

  // Parça kaydedildi; feat'ler başarısız olursa parça kalır, sanatçı düzenlemeden ekleyebilir.
  await syncFeatures(supabase, track.id, feats.ids);

  const { data: profile } = await supabase.from("profiles").select("username").eq("id", user.id).single();
  redirect(profile ? `/${profile.username}` : "/");
}
