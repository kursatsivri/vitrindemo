// Etiketli input; tüm formlarda aynı görünüm.
export function Field({
  label,
  hint,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-neutral-300">{label}</span>
      <input
        {...props}
        className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-base text-white placeholder:text-neutral-500"
      />
      {hint && <span className="text-xs text-neutral-500">{hint}</span>}
    </label>
  );
}
