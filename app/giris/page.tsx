import Link from "next/link";
import { Suspense } from "react";
import { signIn } from "@/app/auth/actions";
import { ActionForm } from "@/app/components/action-form";
import { Captcha } from "@/app/components/captcha";
import { AuthCard } from "@/app/components/auth-card";
import { Field } from "@/app/components/field";
import { Notice } from "@/app/components/notice";

export const metadata = { title: "Giriş yap — Vitrin" };

async function LinkStatus({ searchParams }: { searchParams: PageProps<"/giris">["searchParams"] }) {
  const { durum } = await searchParams;
  if (durum === "dogrulandi") {
    return <Notice tone="success">E-postan doğrulandı. Şimdi giriş yapabilirsin.</Notice>;
  }
  if (durum === "sifre") {
    return <Notice tone="success">Şifren değişti. Yeni şifrenle giriş yap.</Notice>;
  }
  if (durum === "link") {
    return <Notice tone="error">Link geçersiz veya süresi dolmuş. Tekrar dene.</Notice>;
  }
  return null;
}

export default function Page({ searchParams }: PageProps<"/giris">) {
  return (
    <AuthCard title="Tekrar hoş geldin" subtitle="Kaldığın yerden dinlemeye devam et.">
      <Suspense>
        <LinkStatus searchParams={searchParams} />
      </Suspense>
      <ActionForm action={signIn} submitLabel="Giriş yap">
        <Field label="E-posta" name="email" type="email" required autoComplete="email" />
        <Field label="Şifre" name="password" type="password" required autoComplete="current-password" />
        <Captcha />
      </ActionForm>
      <div className="-mt-1 flex flex-col items-center gap-4 text-sm">
        <Link href="/sifremi-unuttum" className="text-text-muted hover:text-text">Şifremi unuttum</Link>
        <p className="text-text-muted">
          Hesabın yok mu? <Link href="/kayit" className="link">Kayıt ol</Link>
        </p>
      </div>
    </AuthCard>
  );
}
