// Etiketli input; tüm formlarda aynı görünüm.
export function Field({
  label,
  hint,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium text-muted">{label}</span>
      <input {...props} className="input" />
      {hint && <span className="text-xs text-subtle">{hint}</span>}
    </label>
  );
}
