import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell } from "lucide-react";
import { Suspense } from "react";
import { Avatar } from "@/app/components/avatar";
import { EmptyState } from "@/app/components/notice";
import { ListSkeleton } from "@/app/components/track-row";
import { describe } from "@/lib/notifications";
import { createClient } from "@/lib/supabase/server";
import { timeAgo } from "@/lib/time";

export const metadata: Metadata = { title: "Bildirimler | Vitrin" };

// Son 50 bildirim; sayfa açılınca hepsi okundu sayılır (90 günden eskiler günlük işle silinir).
async function List() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/giris");

  const [{ data, error }, { data: me }] = await Promise.all([
    supabase
      .from("notifications")
      .select("id, type, data, entity_id, read_at, created_at, actor:profiles!actor_id(username, display_name, avatar_path), track:tracks(id, title)")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase.from("profiles").select("role").eq("id", user.id).single(),
  ]);
  if (error) throw new Error(`Bildirimler yüklenemedi: ${error.message}`);
  if (data.some((n) => !n.read_at)) {
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null);
  }
  if (data.length === 0) {
    return <EmptyState icon={Bell} title="Bildirim yok">Takip, beğeni, yorum, ilgi ve sıralama haberleri burada görünür.</EmptyState>;
  }

  return (
    <ul className="flex flex-col divide-y divide-border">
      {data.map((n) => {
        const { text, href } = describe({ ...n, data: (n.data ?? {}) as Record<string, unknown> }, me?.role ?? "listener");
        const name = n.actor ? n.actor.display_name || n.actor.username : "Vitrin";
        return (
          <li key={n.id}>
            <Link href={href} className="-mx-2 flex items-start gap-3 rounded-xl px-2 py-3 hover:bg-surface">
              <Avatar path={n.actor?.avatar_path ?? null} name={name} size={40} />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-sm leading-snug break-words">{text}</span>
                <span className="text-xs text-text-muted">{timeAgo(n.created_at)}</span>
              </span>
              {!n.read_at && <span aria-label="Okunmadı" className="mt-2 size-2 shrink-0 rounded-full bg-accent" />}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export default function Page() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-7 md:py-14">
      <h1 className="font-display text-4xl leading-none font-extrabold tracking-[-0.04em] md:text-5xl">Bildirimler</h1>
      <Suspense fallback={<ListSkeleton />}>
        <List />
      </Suspense>
    </main>
  );
}
