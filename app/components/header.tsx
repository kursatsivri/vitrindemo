import Link from "next/link";
import { Suspense } from "react";
import { signOut } from "@/app/auth/actions";
import { createClient } from "@/lib/supabase/server";

async function UserNav() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;

  if (!userId) {
    return (
      <>
        <Link href="/giris">Giriş</Link>
        <Link href="/kayit" className="rounded-md bg-white px-3 py-1.5 font-medium text-black">
          Kayıt ol
        </Link>
      </>
    );
  }

  const { data: profile } = await supabase.from("profiles").select("username").eq("id", userId).single();
  return (
    <>
      {profile && <Link href={`/${profile.username}`}>Profilim</Link>}
      <form action={signOut}>
        <button type="submit" className="text-neutral-400">Çıkış</button>
      </form>
    </>
  );
}

export function Header() {
  return (
    <header className="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
      <Link href="/" className="text-lg font-semibold">Vitrin</Link>
      <nav className="flex items-center gap-4 text-sm">
        <Suspense>
          <UserNav />
        </Suspense>
      </nav>
    </header>
  );
}
