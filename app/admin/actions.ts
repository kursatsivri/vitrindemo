"use server";

import { revalidatePath } from "next/cache";
import type { FormState } from "@/app/components/action-form";
import { dbMessage } from "@/lib/scouts";
import { createClient } from "@/lib/supabase/server";

type Supa = Awaited<ReturnType<typeof createClient>>;
// Yetki DB'de (require_admin); hata olursa sayfa hatası olarak gösterilir.
function check({ error }: { error: { code?: string; message: string } | null }) {
  if (error) throw new Error(dbMessage(error));
}

async function resolveTarget(supabase: Supa, type: string, id: string, status: "actioned" | "dismissed") {
  const { data } = await supabase.from("reports").select("id").eq("target_type", type).eq("target_id", id).eq("status", "open");
  for (const r of data ?? []) check(await supabase.rpc("resolve_report", { p_report: r.id, p_status: status }));
}

// Şikayet edilen hedefe işlem uygular ve o hedefin açık şikayetlerini kapatır.
export async function moderate(formData: FormData) {
  const supabase = await createClient();
  const type = String(formData.get("target_type"));
  const id = String(formData.get("target_id"));
  const owner = String(formData.get("owner_id") ?? "");
  const op = String(formData.get("op"));
  switch (op) {
    case "hide":
    case "remove":
      check(await supabase.rpc("set_track_status", { p_track: id, p_status: op === "hide" ? "hidden" : "removed" }));
      break;
    case "delete_comment":
      check(await supabase.rpc("admin_delete_comment", { p_comment: id }));
      break;
    case "close":
      check(await supabase.rpc("admin_close_opportunity", { p_opp: id }));
      break;
    case "suspend":
      check(await supabase.rpc("suspend_user", { p_user: owner || id, p_on: true }));
      break;
  }
  await resolveTarget(supabase, type, id, op === "dismiss" ? "dismissed" : "actioned");
  revalidatePath("/admin");
}

export async function suspend(formData: FormData) {
  const supabase = await createClient();
  check(await supabase.rpc("suspend_user", { p_user: String(formData.get("user_id")), p_on: formData.get("on") === "1" }));
  revalidatePath("/admin", "layout");
}

export async function voidVotes(formData: FormData) {
  const supabase = await createClient();
  check(await supabase.rpc("void_votes", { p_user: String(formData.get("user_id")) }));
  revalidatePath("/admin/oylar");
}

// Parça linki (/p/<id>) ya da kimliği kabul edilir.
export async function setEditorPick(_: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  const id = String(formData.get("track") ?? "").match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/)?.[0];
  if (!id) return { error: "Parça linkini ya da kimliğini yapıştır." };
  const { error } = await supabase.rpc("set_editor_pick", { p_track: id, p_note: String(formData.get("note") ?? "").slice(0, 140) });
  if (error) return { error: dbMessage(error) };
  revalidatePath("/admin/vitrin");
  revalidatePath("/");
  return { message: "Bu haftanın editör seçimi kaydedildi." };
}

export async function createChallenge(formData: FormData) {
  const supabase = await createClient();
  check(await supabase.rpc("create_challenge", { p_week: String(formData.get("week")), p_beat: String(formData.get("beat")) }));
  revalidatePath("/admin/vitrin");
  revalidatePath("/challenge");
}
