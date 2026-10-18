import Link from "next/link";
import { Suspense } from "react";
import { signOut } from "@/app/auth/actions";
import { Avatar } from "@/app/components/avatar";
import { createClient } from "@/lib/supabase/server";

async function UserNav() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;

  if (!userId) {
    return (
      <>
        <Link href="/giris" className="text-muted hover:text-foreground">Giriş</Link>
        <Link href="/kayit" className="btn-primary py-2">Kayıt ol</Link>
      </>
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, username, display_name, avatar_path")
    .eq("id", userId)
    .single();
  return (
    <>
      {profile?.role === "artist" && (
        <Link href="/yukle" className="btn-primary py-2">+ Yükle</Link>
      )}
      <Link href="/profil/kaydedilenler" className="hidden text-muted hover:text-foreground sm:inline">Kaydedilenler</Link>
      <form action={signOut}>
        <button type="submit" className="text-muted hover:text-foreground">Çıkış</button>
      </form>
      {profile && (
        <Link href={`/${profile.username}`} aria-label="Profilim">
          <Avatar path={profile.avatar_path} name={profile.display_name || profile.username} size={36} />
        </Link>
      )}
    </>
  );
}

export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4">
        <Link href="/" className="font-display text-2xl font-bold tracking-tight">
          vitrin<span className="text-accent">.</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Suspense>
            <UserNav />
          </Suspense>
        </nav>
      </div>
    </header>
  );
}
