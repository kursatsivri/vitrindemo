"use server";

import { redirect } from "next/navigation";
import type { FormState } from "@/app/components/action-form";
import { GENRES } from "@/lib/music";
import { readLinks } from "@/lib/links";
import { SOCIALS, USERNAME_RE } from "@/lib/profile";
import type { TablesUpdate } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";

function text(formData: FormData, key: string, max: number) {
  const value = String(formData.get(key) ?? "").trim();
  return value ? value.slice(0, max) : null;
}

export async function updateProfile(_: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/giris");

  const { data: current } = await supabase
    .from("profiles")
    .select("role, avatar_path")
    .eq("id", user.id)
    .single();
  if (!current) return { error: "Profil bulunamadı." };
  const isArtist = current.role === "artist";

  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  if (!USERNAME_RE.test(username)) {
    return { error: "Kullanıcı adı 3–20 karakter olmalı: küçük harf, rakam, _ ve ." };
  }

  const avatarPath = text(formData, "avatar_path", 200);
  if (avatarPath && !avatarPath.startsWith(`${user.id}/`)) return { error: "Geçersiz profil fotoğrafı." };

  const city = Number(formData.get("city"));
  const update: TablesUpdate<"profiles"> = {
    username,
    display_name: text(formData, "display_name", 50),
    bio: text(formData, "bio", 300),
    avatar_path: avatarPath,
    city: Number.isInteger(city) && city >= 1 && city <= 81 ? city : null,
  };

  if (isArtist) {
    const genres = formData.getAll("genres").map(String);
    update.genres = GENRES.map((g) => g.value).filter((g) => genres.includes(g));

    const socials = readLinks(formData, SOCIALS);
    if ("error" in socials) return socials;
    update.socials = socials.links;

    update.open_to_discovery = formData.get("open_to_discovery") === "on";
    // Sadece kendi parçası olabilir; DB politikası da kontrol eder.
    update.featured_track_id = text(formData, "featured_track_id", 36);
  }

  const { error } = await supabase.from("profiles").update(update).eq("id", user.id);
  if (error) {
    if (error.code === "23505") return { error: "Bu kullanıcı adı alınmış." };
    if (error.message.includes("username")) return { error: "Bu kullanıcı adı kullanılamaz." };
    return { error: "Kaydedilemedi. Lütfen tekrar dene." };
  }

  if (isArtist) {
    const contact = text(formData, "contact_email", 254);
    const { error: contactError } = contact
      ? await supabase.from("artist_contacts").upsert({ profile_id: user.id, email: contact })
      : await supabase.from("artist_contacts").delete().eq("profile_id", user.id);
    if (contactError) return { error: "İletişim e-postası geçersiz." };
  }

  // Eski fotoğrafı sil (başarısız olursa sorun değil, sadece depoda yer kaplar).
  if (current.avatar_path && current.avatar_path !== avatarPath) {
    await supabase.storage.from("avatars").remove([current.avatar_path]);
  }

  return { message: "Profil kaydedildi." };
}
