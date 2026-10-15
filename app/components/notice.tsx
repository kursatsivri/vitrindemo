// Başarı/hata kutusu; formlarda ve link durum mesajlarında aynı görünüm.
export function Notice({ tone, children }: { tone: "error" | "success"; children: React.ReactNode }) {
  return tone === "error" ? (
    <p role="alert" className="rounded-xl border border-red-900/60 bg-red-950/50 px-3.5 py-2.5 text-sm text-red-200">
      {children}
    </p>
  ) : (
    <p role="status" className="rounded-xl border border-emerald-900/60 bg-emerald-950/50 px-3.5 py-2.5 text-sm text-emerald-200">
      {children}
    </p>
  );
}
