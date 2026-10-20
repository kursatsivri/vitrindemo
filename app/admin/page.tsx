import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { Suspense } from "react";
import { ArtistLine, PROFILE_MINI, sectionTitle } from "@/app/components/artist-line";
import { EmptyState } from "@/app/components/notice";
import { ListSkeleton } from "@/app/components/track-row";
import { timeAgo } from "@/lib/time";
import { moderate, suspend } from "./actions";
import { adminClient } from "./guard";

export const metadata: Metadata = { title: "Yönetici paneli | Vitrin" };

const REASONS: Record<string, string> = {
  copyright: "Telif",
  inappropriate: "Uygunsuz",
  fake: "Sahte hesap",
  harassment: "Taciz",
  other: "Diğer",
};
const TYPES: Record<string, string> = { track: "Parça", comment: "Yorum", profile: "Profil", opportunity: "İlan" };

type Op = { op: string; label: string; primary?: boolean };

// Hedef başına bir kart: kim, neden şikayet etti + uygun işlemler. İşlem hedefin tüm açık şikayetlerini kapatır.
async function Reports() {
  const supabase = await adminClient();
  const { data: reports, error } = await supabase
    .from("reports")
    .select("id, target_type, target_id, reason, details, created_at, reporter:profiles!reporter_id(username)")
    .eq("status", "open")
    .order("created_at")
    .limit(200);
  if (error) throw new Error(`Şikayetler yüklenemedi: ${error.message}`);
  if (reports.length === 0) return <EmptyState icon={ShieldCheck} title="Açık şikayet yok" />;

  const groups = new Map<string, typeof reports>();
  for (const r of reports) {
    const k = `${r.target_type}:${r.target_id}`;
    groups.set(k, [...(groups.get(k) ?? []), r]);
  }
  const ids = (t: string) => reports.filter((r) => r.target_type === t).map((r) => r.target_id);
  const [tracks, comments, profiles, opps] = await Promise.all([
    supabase.from("tracks").select("id, title, status, artist_id, profiles!artist_id(username)").in("id", ids("track")),
    supabase.from("comments").select("id, body, track_id, author_id, profiles!author_id(username)").in("id", ids("comment")),
    supabase.from("profiles").select("id, username, display_name, suspended_at").in("id", ids("profile")),
    supabase.from("opportunities").select("id, title, closed, scout_id").in("id", ids("opportunity")),
  ]);
  const by = <T extends { id: string }>(rows: T[] | null) => new Map((rows ?? []).map((r) => [r.id, r]));
  const T = by(tracks.data), C = by(comments.data), P = by(profiles.data), O = by(opps.data);

  function target(type: string, id: string): { preview: React.ReactNode; owner: string | null; ops: Op[] } {
    if (type === "track") {
      const t = T.get(id);
      return {
        preview: t ? <><Link href={`/p/${t.id}`} className="link">{t.title}</Link> · @{t.profiles?.username} · {t.status}</> : "Silinmiş parça",
        owner: t?.artist_id ?? null,
        ops: t ? [{ op: "hide", label: "Gizle", primary: true }, { op: "remove", label: "Kaldır" }, { op: "suspend", label: "Sahibini askıya al" }] : [],
      };
    }
    if (type === "comment") {
      const c = C.get(id);
      return {
        preview: c ? <>@{c.profiles?.username}: “{c.body}” · <Link href={`/p/${c.track_id}`} className="link">parça</Link></> : "Silinmiş yorum",
        owner: c?.author_id ?? null,
        ops: c ? [{ op: "delete_comment", label: "Yorumu sil", primary: true }, { op: "suspend", label: "Yazanı askıya al" }] : [],
      };
    }
    if (type === "profile") {
      const p = P.get(id);
      return {
        preview: p ? <><Link href={`/${p.username}`} className="link">@{p.username}</Link>{p.suspended_at ? " · askıda" : ""}</> : "Silinmiş hesap",
        owner: p?.id ?? null,
        ops: p && !p.suspended_at ? [{ op: "suspend", label: "Askıya al", primary: true }] : [],
      };
    }
    const o = O.get(id);
    return {
      preview: o ? <><Link href={`/firsatlar/${o.id}`} className="link">{o.title}</Link>{o.closed ? " · kapalı" : ""}</> : "Silinmiş ilan",
      owner: o?.scout_id ?? null,
      ops: o ? [{ op: "close", label: "İlanı kapat", primary: true }, { op: "suspend", label: "Keşifçiyi askıya al" }] : [],
    };
  }

  return (
    <ul className="flex flex-col gap-3">
      {[...groups.values()].map((rs) => {
        const { target_type: type, target_id: id } = rs[0];
        const t = target(type, id);
        return (
          <li key={`${type}:${id}`} className="card flex flex-col gap-3 p-4">
            <p className="text-sm">
              <span className="mr-2 rounded-full bg-surface-2 px-2 py-0.5 text-xs">{TYPES[type]}</span>
              {t.preview}
            </p>
            <ul className="flex flex-col gap-1 text-xs text-text-muted">
              {rs.map((r) => (
                <li key={r.id}>
                  @{r.reporter?.username} · {REASONS[r.reason]} · {timeAgo(r.created_at)}
                  {r.details && <> · “{r.details}”</>}
                </li>
              ))}
            </ul>
            <form action={moderate} className="flex flex-wrap gap-2">
              <input type="hidden" name="target_type" value={type} />
              <input type="hidden" name="target_id" value={id} />
              <input type="hidden" name="owner_id" value={t.owner ?? ""} />
              {t.ops.map((o) => (
                <button key={o.op} type="submit" name="op" value={o.op} className={o.primary ? "btn-primary" : "btn-secondary"}>{o.label}</button>
              ))}
              <button type="submit" name="op" value="dismiss" className="btn-ghost">Şikayeti reddet</button>
            </form>
          </li>
        );
      })}
    </ul>
  );
}

async function Suspended() {
  const supabase = await adminClient();
  const { data } = await supabase.from("profiles").select(`id, ${PROFILE_MINI}, suspended_at`).not("suspended_at", "is", null).order("suspended_at", { ascending: false });
  if (!data?.length) return <p className="text-sm text-text-muted">Askıda hesap yok.</p>;
  return (
    <ul className="divide-y divide-border">
      {data.map((p) => (
        <li key={p.id}>
          <ArtistLine p={p} sub={`askıya alındı ${timeAgo(p.suspended_at!)}`}>
            <form action={suspend}>
              <input type="hidden" name="user_id" value={p.id} />
              <button type="submit" name="on" value="0" className="btn-secondary">Geri aç</button>
            </form>
          </ArtistLine>
        </li>
      ))}
    </ul>
  );
}

export default function Page() {
  return (
    <>
      <section className="flex flex-col gap-3">
        <h2 className={sectionTitle}>Açık şikayetler</h2>
        <Suspense fallback={<ListSkeleton />}>
          <Reports />
        </Suspense>
      </section>
      <section className="flex flex-col gap-3">
        <h2 className={sectionTitle}>Askıdaki hesaplar</h2>
        <Suspense fallback={<ListSkeleton count={2} />}>
          <Suspended />
        </Suspense>
      </section>
    </>
  );
}
