import Link from "next/link";
import { signUp } from "@/app/auth/actions";
import { ActionForm } from "@/app/components/action-form";
import { AuthCard } from "@/app/components/auth-card";
import { Field } from "@/app/components/field";

export const metadata = { title: "Kayıt ol — Vitrin" };

export default function Page() {
  return (
    <AuthCard title="Kayıt ol">
      <ActionForm action={signUp} submitLabel="Kayıt ol">
        <fieldset className="grid grid-cols-2 gap-2">
          <legend className="mb-1 text-sm text-neutral-300">Hesap türü</legend>
          {[
            { value: "listener", label: "Dinleyici", hint: "Dinle, oy ver" },
            { value: "artist", label: "Sanatçı", hint: "Parça yükle" },
          ].map((r) => (
            <label
              key={r.value}
              className="flex cursor-pointer flex-col rounded-md border border-neutral-700 p-3 has-[:checked]:border-white"
            >
              <input type="radio" name="role" value={r.value} required className="sr-only" />
              <span className="font-medium">{r.label}</span>
              <span className="text-xs text-neutral-400">{r.hint}</span>
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
      <p className="text-sm text-neutral-400">
        Hesabın var mı? <Link href="/giris" className="text-white underline">Giriş yap</Link>
      </p>
    </AuthCard>
  );
}
