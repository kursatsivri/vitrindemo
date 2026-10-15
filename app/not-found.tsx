import Link from "next/link";

export const metadata = { title: "Sayfa bulunamadı — Vitrin" };

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-4 px-4 py-10 text-center">
      <p className="font-display text-7xl font-bold text-accent">404</p>
      <h1 className="font-display text-2xl font-bold">Sayfa bulunamadı</h1>
      <p className="text-muted">Aradığın sayfa veya kullanıcı yok.</p>
      <Link href="/" className="btn-secondary">Ana sayfaya dön</Link>
    </main>
  );
}
