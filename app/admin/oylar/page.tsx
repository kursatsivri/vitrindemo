import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { Suspense } from "react";
import { ArtistLine, PROFILE_MINI } from "@/app/components/artist-line";
import { EmptyState } from "@/app/components/notice";
import { ListSkeleton } from "@/app/components/track-row";
import { suspend, voidVotes } from "../actions";
import { adminClient } from "../guard";

export const metadata: Metadata = { title: "Şüpheli oylar | Vitrin" };

// Aynı IP’yi paylaşan ve son 30 günde oy veren 3+ hesap. Otomatik işlem yok: okul/mobil hat gibi ortak IP olabilir.
async function Clusters() {
  const supabase = await adminClient();
  const { data, error } = await supabase.rpc("suspicious_vote_clusters");
  if (error) throw new Error(`Yüklenemedi: ${error.message}`);
  if (data.length === 0) return <EmptyState icon={ShieldCheck} title="Şüpheli küme yok">Aynı IP’den oy veren 3+ hesap görünmüyor.</EmptyState>;

  const ids = [...new Set(data.flatMap((c) => c.users))];
  const { data: people } = await supabase.from("profiles").select(`id, ${PROFILE_MINI}, created_at`).in("id", ids);
  const person = new Map((people ?? []).map((p) => [p.id, p]));
  return (
    <ul className="flex flex-col gap-3">
      {data.map((c) => (
        <li key={c.ip} className="card flex flex-col gap-1 p-4">
          <p className="text-sm"><span className="font-mono">{c.ip}</span> · {c.users.length} hesap · 30 günde {c.votes} oy</p>
          <ul className="divide-y divide-border">
            {c.users.map((id) => {
              const p = person.get(id);
              return p ? (
                <li key={id}>
                  <ArtistLine p={p} sub={`hesap ${p.created_at.slice(0, 10)}`}>
                    <form action={voidVotes}>
                      <input type="hidden" name="user_id" value={id} />
                      <button type="submit" className="btn-secondary">Oyları geçersiz say</button>
                    </form>
                    <form action={suspend}>
                      <input type="hidden" name="user_id" value={id} />
                      <button type="submit" name="on" value="1" className="btn-ghost">Askıya al</button>
                    </form>
                  </ArtistLine>
                </li>
              ) : null;
            })}
          </ul>
        </li>
      ))}
    </ul>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <Clusters />
    </Suspense>
  );
}
