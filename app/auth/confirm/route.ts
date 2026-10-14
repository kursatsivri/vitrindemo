import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// E-posta doğrulama ve şifre sıfırlama linkleri buraya gelir.
// Varsayılan Supabase şablonu `?code=` (PKCE) gönderir; özel şablon (Faz 5, SMTP sonrası) `?token_hash=`.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/";
  // Sadece site içi yollara yönlendir (açık yönlendirme açığını engeller).
  const safeNext = /^\/(?![/\\])/.test(next) ? next : "/";
  const go = (path: string) => NextResponse.redirect(new URL(path, request.url));

  const supabase = await createClient();

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return go(safeNext);
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return go(safeNext);
    // Link kayıt yapılan tarayıcıdan farklı bir yerde açıldıysa oturum açılamaz,
    // ama e-posta Supabase tarafında zaten doğrulanmıştır.
    if (safeNext !== "/sifre-yenile") return go("/giris?durum=dogrulandi");
  }

  return go("/giris?durum=link");
}
