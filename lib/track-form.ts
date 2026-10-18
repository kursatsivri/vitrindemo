import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { readLinks } from "@/lib/links";
import { MAX_FEATURES, MAX_MOODS, MAX_TAGS, MOODS, parseTime, TAGS, TRACK_LINKS } from "@/lib/music";
import { USERNAME_RE } from "@/lib/profile";

export type TrackMeta = {
  tags: string[];
  moods: string[];
  hook_sec: number;
  seeking_vocal: boolean;
  links: Record<string, string>;
  featUsernames: string[];
};

function pick(formData: FormData, key: string, allowed: readonly { value: string }[], max: number) {
  const chosen = new Set(formData.getAll(key).map(String));
  return allowed.map((x) => x.value).filter((v) => chosen.has(v)).slice(0, max);
}

// Yükleme ve düzenleme formlarındaki ortak alanlar. DB check'leri asıl kontrol; bu, anlaşılır hata mesajı için.
export function readTrackMeta(formData: FormData, genre: string, durationSec: number | null): TrackMeta | { error: string } {
  const hook = parseTime(String(formData.get("hook") ?? ""));
  if (hook === null) return { error: "En iyi an dk:sn biçiminde olmalı (ör. 1:05)." };
  if (durationSec && hook >= durationSec) return { error: "En iyi an parçanın süresinden kısa olmalı." };

  const links = readLinks(formData, TRACK_LINKS);
  if ("error" in links) return links;

  const featUsernames = [
    ...new Set(
      String(formData.get("feats") ?? "")
        .split(/[\s,]+/)
        .map((u) => u.replace(/^@/, "").toLowerCase())
        .filter(Boolean),
    ),
  ];
  if (featUsernames.length > MAX_FEATURES) return { error: `En fazla ${MAX_FEATURES} sanatçı etiketlenebilir.` };
  if (featUsernames.some((u) => !USERNAME_RE.test(u))) return { error: "Feat kullanıcı adlarından biri geçersiz." };

  return {
    tags: pick(formData, "tags", TAGS, MAX_TAGS),
    moods: pick(formData, "moods", MOODS, MAX_MOODS),
    hook_sec: hook,
    seeking_vocal: genre === "beat" && formData.get("seeking_vocal") === "on",
    links: links.links,
    featUsernames,
  };
}

// Tarayıcıda çıkarılan ses dalgası; biçimi bozuksa yok sayılır (zorunlu değil).
export function readWaveform(formData: FormData): number[] | null {
  try {
    const w: unknown = JSON.parse(String(formData.get("waveform") ?? "null"));
    if (!Array.isArray(w) || w.length < 1 || w.length > 200) return null;
    return w.every((v) => Number.isInteger(v) && v >= 0 && v <= 100) ? (w as number[]) : null;
  } catch {
    return null;
  }
}

// Kullanıcı adlarını sanatçı id'lerine çevirir; bulunamayan/sanatçı olmayan varsa hata.
export async function resolveFeatures(supabase: SupabaseClient<Database>, usernames: string[], ownerId: string) {
  if (usernames.length === 0) return { ids: [] as string[] };
  const { data } = await supabase.from("profiles").select("id, username, role").in("username", usernames);
  const found = new Map((data ?? []).map((p) => [p.username, p]));
  for (const u of usernames) {
    const p = found.get(u);
    if (!p || p.role !== "artist") return { error: `@${u} adında bir sanatçı bulunamadı.` };
    if (p.id === ownerId) return { error: "Kendini feat olarak etiketleyemezsin." };
  }
  return { ids: usernames.map((u) => found.get(u)!.id) };
}

// Parçanın feat listesini verilen listeyle eşitler.
export async function syncFeatures(supabase: SupabaseClient<Database>, trackId: string, ids: string[]) {
  const { data: current } = await supabase.from("track_features").select("artist_id").eq("track_id", trackId);
  const have = new Set((current ?? []).map((f) => f.artist_id));
  const removed = [...have].filter((id) => !ids.includes(id));
  const added = ids.filter((id) => !have.has(id));
  if (removed.length) {
    const { error } = await supabase.from("track_features").delete().eq("track_id", trackId).in("artist_id", removed);
    if (error) return { error: "Feat'ler güncellenemedi." };
  }
  if (added.length) {
    const { error } = await supabase.from("track_features").insert(added.map((artist_id) => ({ track_id: trackId, artist_id })));
    if (error) return { error: error.hint === "feature_limit" ? "En fazla 3 sanatçı etiketlenebilir." : "Feat'ler kaydedilemedi." };
  }
  return {};
}
