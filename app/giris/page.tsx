import Link from "next/link";
import { Suspense } from "react";
import { signIn } from "@/app/auth/actions";
import { ActionForm } from "@/app/components/action-form";
import { AuthCard } from "@/app/components/auth-card";
import { Field } from "@/app/components/field";
import { Notice } from "@/app/components/notice";

export const metadata = { title: "Giriş yap — Vitrin" };

async function LinkStatus({ searchParams }: { searchParams: PageProps<"/giris">["searchParams"] }) {
  const { durum } = await searchParams;
  if (durum === "dogrulandi") {
    return <Notice tone="success">E-postan doğrulandı. Şimdi giriş yapabilirsin.</Notice>;
  }
  if (durum === "link") {
    return <Notice tone="error">Link geçersiz veya süresi dolmuş. Tekrar dene.</Notice>;
  }
  return null;
}

export default function Page({ searchParams }: PageProps<"/giris">) {
  return (
    <AuthCard title="Giriş yap">
      <Suspense>
        <LinkStatus searchParams={searchParams} />
      </Suspense>
      <ActionForm action={signIn} submitLabel="Giriş yap">
        <Field label="E-posta" name="email" type="email" required autoComplete="email" />
        <Field label="Şifre" name="password" type="password" required autoComplete="current-password" />
      </ActionForm>
      <div className="flex justify-between text-sm">
        <Link href="/sifremi-unuttum" className="text-muted hover:text-foreground">Şifremi unuttum</Link>
        <Link href="/kayit" className="font-semibold text-accent hover:text-accent-hover">Kayıt ol</Link>
      </div>
    </AuthCard>
  );
}
