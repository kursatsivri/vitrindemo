import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Yönetici sayfaları için: giriş yoksa girişe, admin değilse 404. Asıl yetki DB fonksiyonlarında.
export async function adminClient() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/giris");
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") notFound();
  return supabase;
}
