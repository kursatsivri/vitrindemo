import Link from "next/link";

const TABS = [
  { href: "/admin", label: "Şikayetler" },
  { href: "/admin/kesifciler", label: "Keşifçi başvuruları" },
  { href: "/admin/oylar", label: "Şüpheli oylar" },
  { href: "/admin/vitrin", label: "Vitrin ve challenge" },
];

// Sekmeler; her sayfa kendi yetkisini adminClient() ile kontrol eder.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-7 md:py-14">
      <h1 className="font-display text-4xl leading-none font-extrabold tracking-[-0.04em]">Yönetici paneli</h1>
      <nav aria-label="Yönetici sekmeleri" className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link key={t.href} href={t.href} className="btn-secondary">{t.label}</Link>
        ))}
      </nav>
      {children}
    </main>
  );
}
