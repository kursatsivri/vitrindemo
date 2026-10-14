import Link from "next/link";
import { Suspense } from "react";
import { signIn } from "@/app/auth/actions";
import { ActionForm } from "@/app/components/action-form";
import { AuthCard } from "@/app/components/auth-card";
import { Field } from "@/app/components/field";

export const metadata = { title: "Giriş yap — Vitrin" };

async function LinkStatus({ searchParams }: { searchParams: PageProps<"/giris">["searchParams"] }) {
  const { durum } = await searchParams;
  if (durum === "dogrulandi") {
    return (
      <p role="status" className="rounded-md bg-emerald-950 px-3 py-2 text-sm text-emerald-200">
        E-postan doğrulandı. Şimdi giriş yapabilirsin.
      </p>
    );
  }
  if (durum === "link") {
    return (
      <p role="alert" className="rounded-md bg-red-950 px-3 py-2 text-sm text-red-200">
        Link geçersiz veya süresi dolmuş. Tekrar dene.
      </p>
    );
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
      <div className="flex justify-between text-sm text-neutral-400">
        <Link href="/sifremi-unuttum" className="underline">Şifremi unuttum</Link>
        <Link href="/kayit" className="text-white underline">Kayıt ol</Link>
      </div>
    </AuthCard>
  );
}
