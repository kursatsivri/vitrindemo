"use client";

import { useActionState } from "react";

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
      {state.error && (
        <p role="alert" className="rounded-md bg-red-950 px-3 py-2 text-sm text-red-200">
          {state.error}
        </p>
      )}
      {state.message && (
        <p role="status" className="rounded-md bg-emerald-950 px-3 py-2 text-sm text-emerald-200">
          {state.message}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-white px-4 py-2 font-medium text-black disabled:opacity-50"
      >
        {pending ? "Bekleyin…" : submitLabel}
      </button>
    </form>
  );
}
