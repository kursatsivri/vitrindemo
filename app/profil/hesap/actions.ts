"use server";

import { redirect } from "next/navigation";
import type { FormState } from "@/app/components/action-form";
import { dbMessage } from "@/lib/scouts";
import { createClient } from "@/lib/supabase/server";

// Hesabı siler: önce dosyalar (SQL storage'ı silemez), sonra hesap ve tüm kayıtlar (cascade), sonra çıkış.
export async function deleteAccount(_: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/giris");

  const { data: me } = await supabase.from("profiles").select("username, role").eq("id", user.id).single();
  if (!me) return { error: "Hesap bulunamadı." };
  const typed = String(formData.get("confirm") ?? "").trim().replace(/^@/, "").toLowerCase();
  if (typed !== me.username) return { error: "Onay için kullanıcı adını doğru yaz." };
  // Dosyaları silmeden önce: yönetici silinemez (DB de reddeder, ama dosyalar gitmesin)
  if (me.role === "admin") return { error: "Yönetici hesabı silinemez; önce yöneticiliği başka hesaba devret." };

  for (const bucket of ["avatars", "tracks", "covers"]) {
    const { data: files } = await supabase.storage.from(bucket).list(user.id, { limit: 1000 });
    if (files?.length) await supabase.storage.from(bucket).remove(files.map((f) => `${user.id}/${f.name}`));
  }

  const { error } = await supabase.rpc("delete_my_account");
  if (error) return { error: dbMessage(error, "Hesap silinemedi. Lütfen tekrar dene.") };
  await supabase.auth.signOut();
  redirect("/giris?durum=silindi");
}
