"use server";

import { redirect } from "next/navigation";
import type { FormState } from "@/app/components/action-form";
import { createClient } from "@/lib/supabase/server";

async function ownTrack(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/giris");
  const { data: track } = await supabase
    .from("tracks")
    .select("id, audio_path, cover_path, profiles!artist_id(username)")
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
  if (genre !== "rap" && genre !== "beat") return { error: "Tür seç: Rap veya Beat." };
  if (coverPath && !coverPath.startsWith(`${user.id}/`)) return { error: "Geçersiz kapak." };

  const { error } = await supabase
    .from("tracks")
    .update({ title, genre, description, cover_path: coverPath })
    .eq("id", track.id);
  if (error) return { error: "Kaydedilemedi. Lütfen tekrar dene." };

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
