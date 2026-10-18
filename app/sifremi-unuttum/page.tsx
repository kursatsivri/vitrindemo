import { requestPasswordReset } from "@/app/auth/actions";
import { ActionForm } from "@/app/components/action-form";
import { AuthCard } from "@/app/components/auth-card";
import { Field } from "@/app/components/field";

export const metadata = { title: "Şifremi unuttum — Vitrin" };

export default function Page() {
  return (
    <AuthCard title="Şifremi unuttum" subtitle="E-postana bir sıfırlama linki gönderelim.">
      <ActionForm action={requestPasswordReset} submitLabel="Sıfırlama linki gönder">
        <Field label="E-posta" name="email" type="email" required autoComplete="email" />
      </ActionForm>
    </AuthCard>
  );
}
