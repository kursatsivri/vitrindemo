import { GENRES } from "@/lib/music";

// Rap/Beat seçimi: parça için tek (radio), profil için çoklu (checkbox).
export function GenrePills({
  type,
  defaultValues = [],
  disabled,
}: {
  type: "radio" | "checkbox";
  defaultValues?: readonly string[];
  disabled?: boolean;
}) {
  return (
    <fieldset className="flex gap-2 text-sm" disabled={disabled}>
      <legend className="mb-1.5 font-medium text-muted">Tür</legend>
      {GENRES.map((g) => (
        <label
          key={g.value}
          className="cursor-pointer rounded-full border border-border bg-surface-2 px-4 py-1.5 font-medium transition-colors has-[:checked]:border-accent has-[:checked]:bg-accent/10 has-[:checked]:text-accent has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent"
        >
          <input
            type={type}
            name={type === "radio" ? "genre" : "genres"}
            value={g.value}
            required={type === "radio"}
            defaultChecked={defaultValues.includes(g.value)}
            className="sr-only"
          />
          {g.label}
        </label>
      ))}
    </fieldset>
  );
}
