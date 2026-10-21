import { updatePassword } from "@/app/auth/actions";
import { ActionForm } from "@/app/components/action-form";
import { AuthCard } from "@/app/components/auth-card";
import { Field } from "@/app/components/field";

export const metadata = { title: "Yeni şifre — Vitrin" };

export default function Page() {
  return (
    <AuthCard title="Yeni şifre belirle" subtitle="En az 8 karakter.">
      <ActionForm action={updatePassword} submitLabel="Şifreyi kaydet">
        <Field
          label="Yeni şifre"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
        />
        <Field
          label="Yeni şifre (tekrar)"
          name="password2"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
        />
      </ActionForm>
    </AuthCard>
  );
}
