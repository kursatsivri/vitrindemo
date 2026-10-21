// Etiketli input; tüm formlarda aynı görünüm.
export function Field({
  label,
  hint,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="label">{label}</span>
      <input {...props} className="input" />
      {hint && <span className="text-xs text-text-muted">{hint}</span>}
    </label>
  );
}

// Etiketli textarea / select: Field ile aynı düzen.
export function TextArea({ label, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="label">{label}</span>
      <textarea {...props} className="input h-auto resize-none py-3" />
    </label>
  );
}

export function Select({
  label,
  hint,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; hint?: string }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="label">{label}</span>
      <select {...props} className="input">
        {children}
      </select>
      {hint && <span className="text-xs text-text-muted">{hint}</span>}
    </label>
  );
}

// Kart görünümlü onay kutusu (haklar bende, keşfedilmeye açığım, vokal arıyorum).
export function CheckCard({
  title,
  hint,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "title"> & { title: React.ReactNode; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border bg-surface p-4 transition duration-150 has-checked:border-accent/45 has-focus-visible:outline-2 has-focus-visible:outline-accent">
      <input type="checkbox" {...props} className="mt-0.5 size-5 shrink-0 accent-accent" />
      <span className="flex flex-col gap-1">
        <span className="text-sm font-medium">{title}</span>
        {hint && <span className="text-[13px] leading-snug text-text-muted">{hint}</span>}
      </span>
    </label>
  );
}

// Form sayfalarının yükleme durumu
export function FormSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div aria-hidden className="flex flex-col gap-6">
      {Array.from({ length: fields }, (_, i) => (
        <div key={i} className="flex flex-col gap-2.5">
          <div className="skeleton h-3 w-24" />
          <div className="skeleton h-12 rounded-xl" />
        </div>
      ))}
    </div>
  );
}
