"use server";

import { redirect } from "next/navigation";
import type { FormState } from "@/app/components/action-form";
import { GENRES } from "@/lib/music";
import { createClient } from "@/lib/supabase/server";
import { readTrackMeta, resolveFeatures, syncFeatures } from "@/lib/track-form";

async function ownTrack(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/giris");
  const { data: track } = await supabase
    .from("tracks")
    .select("id, audio_path, cover_path, duration_sec, profiles!artist_id(username)")
    .eq("id", id)
    .eq("artist_id", user.id)
    .maybeSingle();
  return { supabase, user, track };
}

export async function updateTrack(_: FormState, formData: FormData): Promise<FormState> {
  const { supabase, user, track } = await ownTrack(String(formData.get("id")));
  if (!track) return { error: "Parça bulunamadı." };

  const title = String(formData.get("title") ?? "").trim().slice(0, 80);
  const genre = String(formData.get("genre") ?? "");
  const description = String(formData.get("description") ?? "").trim().slice(0, 500) || null;
  const coverPath = String(formData.get("cover_path") ?? "") || null;

  if (!title) return { error: "Başlık gerekli." };
  if (!GENRES.some((g) => g.value === genre)) return { error: "Tür seç." };
  if (coverPath && !coverPath.startsWith(`${user.id}/`)) return { error: "Geçersiz kapak." };

  const meta = readTrackMeta(formData, genre, track.duration_sec);
  if ("error" in meta) return meta;
  const feats = await resolveFeatures(supabase, meta.featUsernames, user.id);
  if ("error" in feats) return { error: feats.error };

  const { error } = await supabase
    .from("tracks")
    .update({
      title,
      genre,
      description,
      cover_path: coverPath,
      tags: meta.tags,
      moods: meta.moods,
      hook_sec: meta.hook_sec,
      seeking_vocal: meta.seeking_vocal,
      links: meta.links,
    })
    .eq("id", track.id);
  if (error) return { error: "Kaydedilemedi. Lütfen tekrar dene." };

  const synced = await syncFeatures(supabase, track.id, feats.ids);
  if (synced.error) return { error: synced.error };

  // Eski kapağı sil (başarısız olursa sorun değil, sadece depoda yer kaplar).
  if (track.cover_path && track.cover_path !== coverPath) {
    await supabase.storage.from("covers").remove([track.cover_path]);
  }
  return { message: "Parça kaydedildi." };
}

export async function deleteTrack(formData: FormData) {
  const { supabase, track } = await ownTrack(String(formData.get("id")));
  if (!track) redirect("/");

  const { error } = await supabase.from("tracks").delete().eq("id", track.id);
  if (error) throw new Error("Parça silinemedi.");

  await supabase.storage.from("tracks").remove([track.audio_path]);
  if (track.cover_path) await supabase.storage.from("covers").remove([track.cover_path]);
  redirect(track.profiles ? `/${track.profiles.username}` : "/");
}
