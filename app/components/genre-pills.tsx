import Link from "next/link";
import { GENRES } from "@/lib/music";

// Tür seçimi formlarda: parça için tek (radio), profil için çoklu (checkbox).
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
    <fieldset className="flex flex-wrap gap-2" disabled={disabled}>
      <legend className="label mb-2.5">Tür</legend>
      {GENRES.map((g) => (
        <label key={g.value} className="chip">
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

// Ana sayfa tür filtresi: link pill'ler; mobilde yatay kayar.
export function GenreFilter({ active, href }: { active: string | null; href: (genre: string | null) => string }) {
  return (
    <nav
      aria-label="Tür filtresi"
      className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:flex-wrap md:overflow-visible md:px-0"
    >
      {[{ value: null, label: "Hepsi" }, ...GENRES].map((f) => (
        <Link key={f.label} href={href(f.value)} aria-current={active === f.value ? "page" : undefined} className="chip md:h-[38px] md:px-[18px]">
          {f.label}
        </Link>
      ))}
    </nav>
  );
}
