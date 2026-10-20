import Link from "next/link";
import { Compass, MapPin, Search, Upload } from "lucide-react";
import { Suspense } from "react";
import { Avatar } from "@/app/components/avatar";
import { AccountMenu, NavLinks } from "@/app/components/header-nav";
import { createClient } from "@/lib/supabase/server";

// Herkese açık kısayollar: ara, yakınında (masaüstü), keşfet (mobil; masaüstünde menüde).
const iconLink = "flex size-10 items-center justify-center rounded-full text-text-muted transition duration-150 hover:text-text";
function QuickLinks() {
  return (
    <div className="flex items-center">
      <Link href="/kesfet" aria-label="Keşfet" className={`${iconLink} md:hidden`}>
        <Compass aria-hidden className="size-5" strokeWidth={1.75} />
      </Link>
      <Link href="/sehir" aria-label="Yakınındaki yetenekler" className={`${iconLink} hidden md:flex`}>
        <MapPin aria-hidden className="size-5" strokeWidth={1.75} />
      </Link>
      <Link href="/ara" aria-label="Ara" className={iconLink}>
        <Search aria-hidden className="size-5" strokeWidth={1.75} />
      </Link>
    </div>
  );
}

async function UserNav() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;

  if (!userId) {
    return (
      <>
        <NavLinks loggedIn={false} />
        <div className="flex flex-1 items-center justify-end gap-1 md:flex-none">
          <QuickLinks />
          <Link href="/giris" className="btn-ghost px-3 md:px-5">Giriş</Link>
          <Link href="/kayit" className="btn-primary">Kayıt ol</Link>
        </div>
      </>
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, username, display_name, avatar_path")
    .eq("id", userId)
    .single();
  const name = profile ? profile.display_name || profile.username : "";
  return (
    <>
      <NavLinks />
      <div className="flex flex-1 items-center justify-end gap-3 md:flex-none">
        <QuickLinks />
        {profile?.role === "artist" && (
          <>
            <Link href="/yukle" aria-label="Parça yükle" className="btn-primary size-10 px-0 md:hidden">
              <Upload aria-hidden className="size-5" strokeWidth={2} />
            </Link>
            <Link href="/yukle" className="btn-primary hidden md:inline-flex">
              <Upload aria-hidden className="size-[18px]" strokeWidth={2} />
              Parça Yükle
            </Link>
          </>
        )}
        {profile && (
          <AccountMenu username={profile.username} name={name}>
            <Avatar path={profile.avatar_path} name={name} size={40} className="border border-border" />
          </AccountMenu>
        )}
      </div>
    </>
  );
}

export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/72 backdrop-blur-lg">
      <div className="mx-auto flex h-14 w-full max-w-[1200px] items-center gap-4 px-4 md:h-[72px] md:gap-10 md:px-10">
        <Link href="/" className="font-display text-[26px] font-extrabold tracking-[-0.045em] md:text-[28px]">
          vitrin
        </Link>
        <Suspense>
          <UserNav />
        </Suspense>
      </div>
    </header>
  );
}
