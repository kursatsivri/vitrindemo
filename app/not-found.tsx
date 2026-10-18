import Link from "next/link";

export const metadata = { title: "Sayfa bulunamadı — Vitrin" };

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <p aria-hidden className="font-display text-[128px] leading-[0.9] font-extrabold tracking-[-0.06em] text-accent">
        404
      </p>
      <h1 className="font-display text-[28px] font-bold tracking-[-0.03em]">Bu sayfa çalmıyor</h1>
      <p className="text-[15px] leading-relaxed text-text-muted">Aradığın sayfa veya kullanıcı yok. Belki adı değişti, belki hiç olmadı.</p>
      <Link href="/" className="btn-secondary mt-2 h-12 px-6">
        Ana sayfaya dön
      </Link>
    </main>
  );
}
