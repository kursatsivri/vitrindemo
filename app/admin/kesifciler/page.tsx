import type { Metadata } from "next";
import { UserCheck } from "lucide-react";
import { Suspense } from "react";
import { ArtistLine, PROFILE_MINI } from "@/app/components/artist-line";
import { ListSkeleton } from "@/app/components/track-row";
import { EmptyState } from "@/app/components/notice";
import { labelOf } from "@/lib/music";
import { SCOUT_KINDS } from "@/lib/scouts";
import { adminClient } from "../guard";
import { approveScout } from "@/app/kesifci/actions";

export const metadata: Metadata = { title: "Keşifçi başvuruları | Vitrin" };

// Faz 7'de tam yönetici paneline büyür. Yetki DB'de (approve_scout); burası sadece görünüm.
async function Applications() {
  const supabase = await adminClient();

  const { data, error } = await supabase
    .from("scout_applications")
    .select(`user_id, kind, org_name, website, contact_person, contact_email, about, created_at, profiles!user_id(${PROFILE_MINI})`)
    .eq("status", "pending")
    .order("created_at");
  if (error) throw new Error(`Başvurular yüklenemedi: ${error.message}`);
  if (data.length === 0) return <EmptyState icon={UserCheck} title="Bekleyen başvuru yok" />;

  return (
    <ul className="flex flex-col gap-4">
      {data.map((a) => (
        <li key={a.user_id} className="card flex flex-col gap-3 p-5">
          {a.profiles && <ArtistLine p={a.profiles} sub={a.created_at.slice(0, 10)} />}
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
            <dt className="text-text-muted">Tür</dt><dd>{labelOf(SCOUT_KINDS, a.kind)}</dd>
            <dt className="text-text-muted">Ad / şirket</dt><dd>{a.org_name}</dd>
            <dt className="text-text-muted">Yetkili</dt><dd>{a.contact_person}</dd>
            <dt className="text-text-muted">E-posta</dt><dd className="break-all">{a.contact_email}</dd>
            {a.website && <><dt className="text-text-muted">Web</dt><dd><a href={a.website} target="_blank" rel="noopener noreferrer nofollow" className="link break-all">{a.website}</a></dd></>}
          </dl>
          <p className="text-sm whitespace-pre-line">{a.about}</p>
          <form action={approveScout} className="flex gap-2">
            <input type="hidden" name="user_id" value={a.user_id} />
            <button type="submit" name="approve" value="1" className="btn-primary">Onayla</button>
            <button type="submit" name="approve" value="0" className="btn-secondary">Reddet</button>
          </form>
        </li>
      ))}
    </ul>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <Applications />
    </Suspense>
  );
}
