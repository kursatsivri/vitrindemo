import Link from "next/link";
import { Check, Headphones, Mic } from "lucide-react";
import { signUp } from "@/app/auth/actions";
import { ActionForm } from "@/app/components/action-form";
import { AuthCard } from "@/app/components/auth-card";
import { Field } from "@/app/components/field";

export const metadata = { title: "Kayıt ol — Vitrin" };

export default function Page() {
  return (
    <AuthCard title="Vitrin'e katıl" subtitle="Önce nasıl katılacağını seç.">
      <ActionForm action={signUp} submitLabel="Hesap oluştur">
        <fieldset className="grid grid-cols-2 gap-3">
          <legend className="label mb-2.5">Hesap türü</legend>
          {[
            { value: "listener", label: "Dinleyici", hint: "Keşfet, beğen, oy ver", icon: Headphones },
            { value: "artist", label: "Sanatçı", hint: "Parça yükle, keşfedil", icon: Mic },
          ].map((r) => (
            <label
              key={r.value}
              className="group relative flex min-h-40 cursor-pointer flex-col gap-3 rounded-2xl border border-border bg-bg p-4 transition duration-150 hover:border-text-muted/50 has-checked:border-accent has-checked:bg-accent-soft has-focus-visible:outline-2 has-focus-visible:outline-accent"
            >
              <input type="radio" name="role" value={r.value} required className="sr-only" />
              <span className="absolute top-3.5 right-3.5 hidden size-[22px] items-center justify-center rounded-full bg-accent text-bg group-has-checked:flex">
                <Check aria-hidden className="size-3.5" strokeWidth={3} />
              </span>
              <span className="flex size-11 items-center justify-center rounded-full bg-surface-2 text-text-muted transition duration-150 group-has-checked:bg-accent group-has-checked:text-bg">
                <r.icon aria-hidden className="size-[22px]" strokeWidth={1.75} />
              </span>
              <span className="flex flex-col gap-1">
                <span className="font-display text-xl font-bold tracking-tight">{r.label}</span>
                <span className="text-[13px] leading-snug text-text-muted">{r.hint}</span>
              </span>
            </label>
          ))}
        </fieldset>
        <Field
          label="Kullanıcı adı"
          name="username"
          required
          minLength={3}
          maxLength={20}
          pattern="[a-z0-9_.]{3,20}"
          autoCapitalize="none"
          autoComplete="username"
          hint="Profil adresin: vitrin/kullaniciadi — küçük harf, rakam, _ ve ."
        />
        <Field label="E-posta" name="email" type="email" required autoComplete="email" />
        <Field
          label="Şifre"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          hint="En az 8 karakter"
        />
      </ActionForm>
      <p className="-mt-1 text-center text-sm text-text-muted">
        Hesabın var mı? <Link href="/giris" className="link">Giriş yap</Link>
      </p>
      <p className="text-center text-xs text-text-muted">
        Yapımcı, plak şirketi ya da menajer misin? Dinleyici hesabı aç, sonra menüden “Keşifçi ol” ile başvur.
      </p>
    </AuthCard>
  );
}
