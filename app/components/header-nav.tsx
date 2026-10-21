"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { BadgeCheck, Bookmark, Briefcase, ChartColumn, Compass, House, LogOut, Pencil, Settings, ShieldCheck, SlidersHorizontal, Swords, Trophy, User, Users } from "lucide-react";
import { useRef } from "react";
import { signOut } from "@/app/auth/actions";

function useActive() {
  const path = usePathname();
  const following = useSearchParams().get("akis") === "takip";
  return (href: string) =>
    href === "/" ? path === "/" && !following : href === "/?akis=takip" ? path === "/" && following : path === href;
}

const LINKS = [
  { href: "/", label: "Ana sayfa", icon: House, auth: false },
  { href: "/kesfet", label: "Keşfet", icon: Compass, auth: false },
  { href: "/siralama", label: "Sıralama", icon: Trophy, auth: false },
  { href: "/challenge", label: "Challenge", icon: Swords, auth: false },
  { href: "/firsatlar", label: "Fırsatlar", icon: Briefcase, auth: false },
  { href: "/?akis=takip", label: "Takip ettiklerin", icon: Users, auth: true },
  { href: "/profil/kaydedilenler", label: "Kaydedilenler", icon: Bookmark, auth: true },
];

// Masaüstü üst menü; mobilde aynı linkler hesap menüsünde. Girişsizde hesap gerektirenler gizli.
export function NavLinks({ loggedIn = true }: { loggedIn?: boolean }) {
  const active = useActive();
  return (
    <nav aria-label="Ana menü" className="hidden flex-1 gap-7 text-sm font-medium md:flex">
      {LINKS.filter((l) => loggedIn || !l.auth).map((l) => (
        <Link
          key={l.href}
          href={l.href}
          aria-current={active(l.href) ? "page" : undefined}
          className="text-text-muted transition duration-150 hover:text-text aria-[current=page]:text-text"
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}

const item = "flex h-11 items-center gap-3 rounded-[10px] px-3 text-sm transition duration-150 hover:bg-border";

// Avatar menüsü: tarayıcının popover'ı (dışarı tıklayınca / Esc ile kapanır). Linke basınca da kapanır.
// Role göre panel linki: sanatçı paneli, keşifçi paneli/başvurusu, yönetici onayları.
const ROLE_LINKS: Record<string, { href: string; label: string; icon: typeof User }> = {
  artist: { href: "/profil/panel", label: "Sanatçı paneli", icon: ChartColumn },
  scout: { href: "/kesifci", label: "Keşifçi paneli", icon: BadgeCheck },
  listener: { href: "/kesifci", label: "Keşifçi ol", icon: BadgeCheck },
  admin: { href: "/admin", label: "Yönetici paneli", icon: ShieldCheck },
};

export function AccountMenu({ username, name, role, children }: { username: string; name: string; role: string; children: React.ReactNode }) {
  const roleLink = ROLE_LINKS[role];
  const menu = useRef<HTMLDivElement>(null);
  const close = () => menu.current?.hidePopover();
  return (
    <>
      <button type="button" popoverTarget="hesap-menusu" aria-label="Hesap menüsü" className="rounded-full">
        {children}
      </button>
      <div
        ref={menu}
        id="hesap-menusu"
        popover="auto"
        className="inset-auto top-16 right-4 m-0 w-64 rounded-2xl border border-border bg-surface-2 p-2 text-text shadow-2xl shadow-bg md:top-20 md:right-[max(2.5rem,calc((100vw-1200px)/2+2.5rem))]"
      >
        <div className="mb-1 flex flex-col gap-0.5 border-b border-border px-3 pt-2 pb-3">
          <span className="truncate text-sm font-medium">{name}</span>
          <span className="truncate text-xs text-text-muted">@{username}</span>
        </div>
        <Link href={`/${username}`} onClick={close} className={item}>
          <User aria-hidden className="size-[18px]" strokeWidth={1.75} />
          Profilim
        </Link>
        {roleLink && (
          <Link href={roleLink.href} onClick={close} className={item}>
            <roleLink.icon aria-hidden className="size-[18px]" strokeWidth={1.75} />
            {roleLink.label}
          </Link>
        )}
        {LINKS.slice(1).map((l) => (
          <Link key={l.href} href={l.href} onClick={close} className={`${item} md:hidden`}>
            <l.icon aria-hidden className="size-[18px]" strokeWidth={1.75} />
            {l.label}
          </Link>
        ))}
        <Link href="/profil/duzenle" onClick={close} className={item}>
          <Pencil aria-hidden className="size-[18px]" strokeWidth={1.75} />
          Profili düzenle
        </Link>
        <Link href="/tercihler" onClick={close} className={item}>
          <SlidersHorizontal aria-hidden className="size-[18px]" strokeWidth={1.75} />
          Tercihlerim
        </Link>
        <Link href="/profil/hesap" onClick={close} className={item}>
          <Settings aria-hidden className="size-[18px]" strokeWidth={1.75} />
          Hesap ayarları
        </Link>
        <form action={signOut}>
          <button type="submit" className={`${item} w-full text-text-muted`}>
            <LogOut aria-hidden className="size-[18px]" strokeWidth={1.75} />
            Çıkış
          </button>
        </form>
      </div>
    </>
  );
}
