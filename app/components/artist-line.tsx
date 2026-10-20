import Link from "next/link";
import { Avatar } from "@/app/components/avatar";
import { cityName } from "@/lib/music";

export type ArtistLineData = { username: string; display_name: string | null; avatar_path: string | null; city?: number | null };

// Avatar + ad + @kullanıcı adı satırı; sağına eylem (buton, durum) konabilir.
export function ArtistLine({ p, sub, children }: { p: ArtistLineData; sub?: React.ReactNode; children?: React.ReactNode }) {
  const name = p.display_name || p.username;
  const where = cityName(p.city ?? null);
  return (
    <div className="flex items-center gap-3 py-2.5">
      <Link href={`/${p.username}`} className="flex min-w-0 flex-1 items-center gap-3 hover:opacity-85">
        <Avatar path={p.avatar_path} name={name} size={44} />
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-[15px] font-medium">{name}</span>
          <span className="truncate text-xs text-text-muted">
            @{p.username}
            {where ? ` · ${where}` : ""}
            {sub ? <> · {sub}</> : null}
          </span>
        </span>
      </Link>
      {children && <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">{children}</div>}
    </div>
  );
}

export const PROFILE_MINI = "username, display_name, avatar_path, city";
export const sectionTitle = "font-display text-2xl font-bold tracking-[-0.03em]";
