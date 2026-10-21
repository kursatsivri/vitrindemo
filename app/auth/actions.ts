"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { FormState } from "@/app/components/action-form";
import { USERNAME_RE } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

function authError(code: string | undefined): string {
  switch (code) {
    case "invalid_credentials":
      return "E-posta veya şifre hatalı.";
    case "email_not_confirmed":
      return "E-postanı henüz doğrulamadın. Gelen kutunu (ve spam klasörünü) kontrol et.";
    case "weak_password":
      return "Şifre çok zayıf. En az 8 karakter, harf ve rakam kullan.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Çok fazla deneme yapıldı. Biraz sonra tekrar dene.";
    case "same_password":
      return "Yeni şifre eskisiyle aynı olamaz.";
    case "user_banned":
      return "Hesabın askıya alındı. İtiraz için destekle iletişime geç.";
    case "captcha_failed":
      return "Robot doğrulaması başarısız. Kutucuğu yeniden doğrulayıp tekrar dene.";
    case "unexpected_failure":
      return "Bu kullanıcı adı alınamadı. Başka bir ad dene.";
    default:
      return "Bir hata oluştu. Lütfen tekrar dene.";
  }
}

// Turnstile token'ı (captcha kapalıysa boş; Supabase captcha açıkken zorunlu)
const captcha = (formData: FormData) => String(formData.get("cf-turnstile-response") ?? "") || undefined;

async function origin() {
  return (await headers()).get("origin") ?? "";
}

export async function signUp(_: FormState, formData: FormData): Promise<FormState> {
  const role = String(formData.get("role"));
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (role !== "listener" && role !== "artist") return { error: "Dinleyici veya Sanatçı seç." };
  if (!USERNAME_RE.test(username)) {
    return { error: "Kullanıcı adı 3–20 karakter olmalı: küçük harf, rakam, _ ve . (Türkçe karakter yok)." };
  }
  if (password.length < 8) return { error: "Şifre en az 8 karakter olmalı." };

  const supabase = await createClient();
  const { data: taken } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();
  if (taken) return { error: "Bu kullanıcı adı alınmış." };

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { role, username },
      captchaToken: captcha(formData),
      emailRedirectTo: `${await origin()}/auth/confirm?next=/tercihler`,
    },
  });
  if (error) return { error: authError(error.code) };

  return { message: "Kayıt alındı! E-postana gelen doğrulama linkine tıkla, sonra giriş yap." };
}

export async function signIn(_: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
    options: { captchaToken: captcha(formData) },
  });
  if (error) return { error: authError(error.code) };

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", data.user.id)
    .single();
  redirect(profile ? `/${profile.username}` : "/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function requestPasswordReset(_: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(
    String(formData.get("email") ?? "").trim(),
    { redirectTo: `${await origin()}/auth/confirm?next=/sifre-yenile`, captchaToken: captcha(formData) },
  );
  if (error) return { error: authError(error.code) };

  // Hesabın var olup olmadığını belli etmemek için her zaman aynı mesaj.
  return { message: "Bu e-postayla bir hesap varsa şifre sıfırlama linki gönderildi." };
}

export async function updatePassword(_: FormState, formData: FormData): Promise<FormState> {
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { error: "Şifre en az 8 karakter olmalı." };
  if (password !== String(formData.get("password2") ?? "")) return { error: "Şifreler aynı değil." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Linkin süresi dolmuş. Şifre sıfırlamayı yeniden iste." };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: authError(error.code) };

  // Sıfırlama linkinin açtığı oturum kapanır; kullanıcı yeni şifresiyle kendisi giriş yapar.
  await supabase.auth.signOut();
  redirect("/giris?durum=sifre");
}
