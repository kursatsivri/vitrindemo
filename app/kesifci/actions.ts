"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormState } from "@/app/components/action-form";
import { GENRES } from "@/lib/music";
import { dbMessage, readApplication } from "@/lib/scouts";
import { createClient } from "@/lib/supabase/server";

async function userClient() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/giris");
  return { supabase, user };
}

// Butonlu formlar (onay, kabul, sil) için: hata sayfa hatası olarak gösterilir.
function check(error: { code?: string; message: string } | null) {
  if (error) throw new Error(dbMessage(error));
}

export async function applyScout(_: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await userClient();
  const a = readApplication(formData);
  if ("error" in a) return a;
  const { error } = await supabase.rpc("apply_scout", {
    p_kind: a.kind,
    p_org_name: a.org_name,
    p_website: a.website ?? "",
    p_contact_person: a.contact_person,
    p_contact_email: a.contact_email,
    p_about: a.about,
  });
  if (error) return { error: dbMessage(error) };
  revalidatePath("/kesifci");
  return { message: "Başvurun alındı. Onaylanınca keşifçi araçların açılacak." };
}

export async function approveScout(formData: FormData) {
  const { supabase } = await userClient();
  const { error } = await supabase.rpc("approve_scout", {
    p_user: String(formData.get("user_id")),
    p_approve: formData.get("approve") === "1",
  });
  check(error);
  revalidatePath("/admin/kesifciler");
}

export async function answerInterest(formData: FormData) {
  const { supabase } = await userClient();
  const { error } = await supabase.rpc("answer_interest", {
    p_scout: String(formData.get("scout_id")),
    p_accept: formData.get("accept") === "1",
  });
  check(error);
  revalidatePath("/profil/panel");
}

// Not favori satırında durur; favori değilse önce favoriye eklenir.
export async function saveNote(_: FormState, formData: FormData): Promise<FormState> {
  const { supabase, user } = await userClient();
  const artistId = String(formData.get("artist_id"));
  const note = String(formData.get("note") ?? "").trim().slice(0, 1000) || null;
  const { data, error } = await supabase
    .from("scout_favorites")
    .update({ note })
    .eq("scout_id", user.id)
    .eq("artist_id", artistId)
    .select("artist_id");
  if (error) return { error: dbMessage(error) };
  if (data.length === 0) {
    const { error: e } = await supabase.from("scout_favorites").insert({ scout_id: user.id, artist_id: artistId, note });
    if (e) return { error: dbMessage(e) };
  }
  revalidatePath("/kesifci");
  revalidatePath("/[username]", "page");
  return { message: "Not kaydedildi." };
}

export async function addAlert(_: FormState, formData: FormData): Promise<FormState> {
  const { supabase, user } = await userClient();
  const genre = String(formData.get("genre") ?? "");
  const city = Number(formData.get("city")) || null;
  const min = Number(formData.get("min_week_votes")) || 1;
  const { error } = await supabase.from("scout_alerts").insert({
    scout_id: user.id,
    genre: GENRES.some((g) => g.value === genre) ? genre : null,
    city: city && city >= 1 && city <= 81 ? city : null,
    min_week_votes: Math.min(Math.max(Math.trunc(min), 1), 1000),
  });
  if (error) return { error: dbMessage(error) };
  revalidatePath("/kesifci");
  return { message: "Alarm kuruldu." };
}

export async function deleteAlert(formData: FormData) {
  const { supabase } = await userClient();
  const { error } = await supabase.from("scout_alerts").delete().eq("id", String(formData.get("id")));
  check(error);
  revalidatePath("/kesifci");
}
