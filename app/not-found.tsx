import Link from "next/link";

export const metadata = { title: "Sayfa bulunamadı — Vitrin" };

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-4 px-4 py-10 text-center">
      <h1 className="text-2xl font-semibold">Sayfa bulunamadı</h1>
      <p className="text-neutral-400">Aradığın sayfa veya kullanıcı yok.</p>
      <Link href="/" className="underline">Ana sayfaya dön</Link>
    </main>
  );
}
