import { Check, CircleAlert } from "lucide-react";

// Başarı/hata kutusu; formlarda ve link durum mesajlarında aynı görünüm.
export function Notice({ tone, children }: { tone: "error" | "success"; children: React.ReactNode }) {
  return tone === "error" ? (
    <p role="alert" className="flex items-start gap-2.5 rounded-xl border border-danger/35 bg-danger/10 px-4 py-3 text-sm text-text">
      <CircleAlert aria-hidden className="mt-px size-[18px] shrink-0 text-danger" strokeWidth={1.75} />
      <span>{children}</span>
    </p>
  ) : (
    <p role="status" className="flex items-start gap-2.5 rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm text-text">
      <Check aria-hidden className="mt-px size-[18px] shrink-0" strokeWidth={2} />
      <span>{children}</span>
    </p>
  );
}

// Boş durum: ikon + başlık + açıklama + isteğe bağlı eylem. Her listede aynı görünüm.
export function EmptyState({
  icon: Icon,
  title,
  children,
  action,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number; "aria-hidden"?: boolean }>;
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border px-6 py-12 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-surface-2 text-text-muted">
        <Icon aria-hidden className="size-6" strokeWidth={1.5} />
      </span>
      <p className="font-display text-[22px] font-bold tracking-tight">{title}</p>
      {children && <div className="max-w-xs text-sm leading-relaxed text-text-muted">{children}</div>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
