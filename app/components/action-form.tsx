"use client";

import { startTransition, useActionState } from "react";
import { Notice } from "./notice";

export type FormState = { error?: string; message?: string };

// Server action'ı çalıştırıp hata/başarı mesajını gösteren ortak form.
// React, `action` ile gönderilen formu sonradan sıfırlar; hata çıkınca yazılanlar kaybolmasın diye
// gönderimi onSubmit'te kendimiz yapıyoruz (JS yüklenmeden önce `action` yine çalışır).
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

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    startTransition(() => formAction(data));
  }

  return (
    <form action={formAction} onSubmit={onSubmit} className="flex flex-col gap-4">
      {children}
      {state.error && <Notice tone="error">{state.error}</Notice>}
      {state.message && <Notice tone="success">{state.message}</Notice>}
      <button type="submit" disabled={pending} className="btn-primary mt-1">
        {pending ? "Bekleyin…" : submitLabel}
      </button>
    </form>
  );
}
