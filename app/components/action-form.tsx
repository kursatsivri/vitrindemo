"use client";

import { useActionState } from "react";
import { Notice } from "./notice";

export type FormState = { error?: string; message?: string };

// Server action'ı çalıştırıp hata/başarı mesajını gösteren ortak form.
export function ActionForm({
  action,
  submitLabel,
  children,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  submitLabel: string;
  children: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {children}
      {state.error && <Notice tone="error">{state.error}</Notice>}
      {state.message && <Notice tone="success">{state.message}</Notice>}
      <button type="submit" disabled={pending} className="btn-primary mt-1">
        {pending ? "Bekleyin…" : submitLabel}
      </button>
    </form>
  );
}
