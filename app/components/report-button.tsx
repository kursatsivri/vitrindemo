"use client";

import { Flag } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Notice } from "@/app/components/notice";
import { createClient } from "@/lib/supabase/client";

const REASONS = [
  { value: "copyright", label: "Telif ihlali" },
  { value: "inappropriate", label: "Uygunsuz içerik" },
  { value: "fake", label: "Sahte hesap" },
  { value: "harassment", label: "Taciz" },
  { value: "other", label: "Diğer" },
];

// "Şikayet et": tarayıcının <dialog>'u içinde neden + açıklama. Kurallar (1 hedef 1 şikayet, günde 10) DB'de.
export function ReportButton({
  targetType,
  targetId,
  viewerId,
  compact = false,
}: {
  targetType: "track" | "comment" | "profile" | "opportunity";
  targetId: string;
  viewerId: string | null;
  compact?: boolean;
}) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [state, setState] = useState<{ error?: string; done?: boolean }>({});
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    const { error } = await createClient().from("reports").insert({
      reporter_id: viewerId!,
      target_type: targetType,
      target_id: targetId,
      reason: String(f.get("reason")),
      details: String(f.get("details") ?? "").trim().slice(0, 500) || null,
    });
    setBusy(false);
    if (!error || error.code === "23505") return setState({ done: true });
    setState({ error: error.code === "P0001" ? error.message : "Gönderilemedi. Tekrar dene." });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => (viewerId ? dialog.current?.showModal() : router.push("/giris"))}
        className={compact ? "text-xs text-text-muted hover:text-text" : "btn-ghost text-text-muted"}
      >
        {!compact && <Flag aria-hidden className="size-4" strokeWidth={1.75} />}
        Şikayet et
      </button>
      <dialog
        ref={dialog}
        onClose={() => setState({})}
        className="m-auto w-[min(92vw,420px)] rounded-2xl border border-border bg-surface-2 p-5 text-text backdrop:bg-bg/70"
      >
        {state.done ? (
          <div className="flex flex-col gap-4">
            <Notice tone="success">Şikayetin alındı. Yöneticiler inceleyecek.</Notice>
            <button type="button" onClick={() => dialog.current?.close()} className="btn-secondary">Kapat</button>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-4">
            <h2 className="font-display text-xl font-bold">Şikayet et</h2>
            <fieldset className="flex flex-col gap-2">
              <legend className="label mb-2">Neden?</legend>
              {REASONS.map((r, i) => (
                <label key={r.value} className="flex items-center gap-2 text-sm">
                  <input type="radio" name="reason" value={r.value} required defaultChecked={i === 0} className="accent-accent" />
                  {r.label}
                </label>
              ))}
            </fieldset>
            <label className="flex flex-col gap-2">
              <span className="label">Açıklama (isteğe bağlı)</span>
              <textarea name="details" maxLength={500} rows={3} className="input h-auto resize-none py-3" />
            </label>
            {state.error && <Notice tone="error">{state.error}</Notice>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => dialog.current?.close()} className="btn-ghost">Vazgeç</button>
              <button type="submit" disabled={busy} className="btn-primary">{busy ? "Gönderiliyor…" : "Gönder"}</button>
            </div>
          </form>
        )}
      </dialog>
    </>
  );
}
