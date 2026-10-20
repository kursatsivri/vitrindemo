"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Bookmark, House, LogOut, Pencil, Trophy, User, Users } from "lucide-react";
import { useRef } from "react";
import { signOut } from "@/app/auth/actions";

function useActive() {
  const path = usePathname();
  const following = useSearchParams().get("akis") === "takip";
  return (href: string) =>
    href === "/" ? path === "/" && !following : href === "/?akis=takip" ? path === "/" && following : path === href;
}

const LINKS = [
  { href: "/", label: "Ana sayfa", icon: House },
  { href: "/siralama", label: "Sıralama", icon: Trophy },
  { href: "/?akis=takip", label: "Takip ettiklerin", icon: Users },
  { href: "/profil/kaydedilenler", label: "Kaydedilenler", icon: Bookmark },
];

// Masaüstü üst menü; mobilde aynı linkler hesap menüsünde.
export function NavLinks() {
  const active = useActive();
  return (
    <nav aria-label="Ana menü" className="hidden flex-1 gap-7 text-sm font-medium md:flex">
      {LINKS.map((l) => (
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
export function AccountMenu({ username, name, children }: { username: string; name: string; children: React.ReactNode }) {
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
