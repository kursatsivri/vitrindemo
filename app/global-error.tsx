"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import "./globals.css";

// Kök layout'un kendisi çöktüğünde gösterilir; layout'un yerini aldığı için html/body burada.
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="tr" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <main className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
          <title>Bir şeyler ters gitti — Vitrin</title>
          <h1 className="font-display text-[28px] font-bold tracking-[-0.03em]">Bir şeyler ters gitti</h1>
          <p className="text-[15px] leading-relaxed text-text-muted">Beklenmedik bir hata oldu. Kaydını aldık; tekrar denemek çoğu zaman işe yarar.</p>
          <button type="button" onClick={() => retry()} className="btn-secondary mt-2 h-12 px-6">
            Tekrar dene
          </button>
        </main>
      </body>
    </html>
  );
}
