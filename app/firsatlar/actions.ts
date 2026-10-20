"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormState } from "@/app/components/action-form";
import { dbMessage, readOpportunity, trToday } from "@/lib/scouts";
import { createClient } from "@/lib/supabase/server";

async function userClient() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/giris");
  return { supabase, user };
}

export async function createOpportunity(_: FormState, formData: FormData): Promise<FormState> {
  const { supabase, user } = await userClient();
  const o = readOpportunity(formData, trToday());
  if ("error" in o) return o;
  const { data, error } = await supabase.from("opportunities").insert({ scout_id: user.id, ...o }).select("id").single();
  if (error) return { error: dbMessage(error, "İlan açılamadı. Sadece onaylı keşifçiler ilan açabilir.") };
  redirect(`/firsatlar/${data.id}`);
}

export async function closeOpportunity(formData: FormData) {
  const { supabase } = await userClient();
  const id = String(formData.get("id"));
  const { error } = await supabase.from("opportunities").update({ closed: true }).eq("id", id);
  if (error) throw new Error(dbMessage(error));
  revalidatePath(`/firsatlar/${id}`);
}

export async function applyOpportunity(_: FormState, formData: FormData): Promise<FormState> {
  const { supabase, user } = await userClient();
  const id = String(formData.get("opportunity_id"));
  const note = String(formData.get("note") ?? "").trim();
  if (note.length > 300) return { error: "Not en fazla 300 karakter olabilir." };
  const { error } = await supabase.from("opportunity_applications").insert({
    opportunity_id: id,
    artist_id: user.id,
    track_id: String(formData.get("track_id")),
    note: note || null,
  });
  if (error) {
    return { error: error.code === "23505" ? "Bu ilana zaten başvurdun." : dbMessage(error, "Başvurulamadı. İlan kapanmış olabilir.") };
  }
  revalidatePath(`/firsatlar/${id}`);
  return { message: "Başvurun gönderildi." };
}

export async function reviewApplication(formData: FormData) {
  const { supabase } = await userClient();
  const id = String(formData.get("opportunity_id"));
  const { error } = await supabase.rpc("review_application", {
    p_opp: id,
    p_artist: String(formData.get("artist_id")),
    p_status: String(formData.get("status")),
  });
  if (error) throw new Error(dbMessage(error));
  revalidatePath(`/firsatlar/${id}`);
}
