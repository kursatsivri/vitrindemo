import Link from "next/link";
import { LEGAL } from "@/lib/legal";

// Sayfa altı: yasal linkler. PlayerProvider içinde children'dan sonra; oynatıcının boşluğu bunun altına düşer.
export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-3 px-4 py-6 text-xs text-text-muted md:flex-row md:items-center md:justify-between md:px-10">
        <nav aria-label="Yasal" className="flex flex-wrap gap-x-5 gap-y-2">
          {Object.entries(LEGAL).map(([slug, doc]) => (
            <Link key={slug} href={`/yasal/${slug}`} className="transition duration-150 hover:text-text">
              {doc.title}
            </Link>
          ))}
        </nav>
        <span>© Vitrin</span>
      </div>
    </footer>
  );
}
