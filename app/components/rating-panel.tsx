"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Notice } from "@/app/components/notice";
import { usePlayer } from "@/app/components/player";
import { createClient } from "@/lib/supabase/client";

export type RatingSummary = { n: number; avgs: (number | null)[] };

// Yapılandırılmış geri bildirim: 4 kriter 1–5. Kural (30 sn dinlemiş, kendi parçası değil) DB'de;
// `canRate` sadece doğru mesajı göstermek için.
export function RatingPanel({
  trackId,
  viewerId,
  criteria,
  isOwner,
  canRate,
  mine,
  summary,
}: {
  trackId: string;
  viewerId: string | null;
  criteria: string[];
  isOwner: boolean;
  canRate: boolean;
  mine: number[] | null;
  summary: RatingSummary;
}) {
  const router = useRouter();
  const player = usePlayer();
  // Bu sayfada 35 sn çalındıysa dinleme kaydı düşmüştür; formu yenilemeden aç (DB yine doğrular).
  const listenedHere = player?.current?.id === trackId && player.time >= 35;
  const [scores, setScores] = useState<number[]>(mine ?? [0, 0, 0, 0]);
  const [status, setStatus] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (scores.some((s) => s < 1)) return setStatus({ tone: "error", text: "Dört kritere de puan ver." });
    setBusy(true);
    const db = createClient();
    const [s1, s2, s3, s4] = scores;
    const { error } = mine
      ? await db.from("ratings").update({ s1, s2, s3, s4 }).eq("user_id", viewerId!).eq("track_id", trackId)
      : await db.from("ratings").insert({ user_id: viewerId!, track_id: trackId, s1, s2, s3, s4 });
    setBusy(false);
    if (error) return setStatus({ tone: "error", text: "Puan kaydedilemedi. Parçayı en az 30 sn dinlediğinden emin ol." });
    setStatus({ tone: "success", text: "Puanın kaydedildi. Teşekkürler!" });
    router.refresh();
  }

  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-display text-2xl font-bold tracking-[-0.03em]">Geri bildirim</h2>

      {summary.n >= 5 ? (
        <ul className="grid gap-2 sm:grid-cols-2">
          {criteria.map((c, i) => (
            <li key={c} className="flex items-center gap-3 text-sm">
              <span className="w-28 shrink-0 text-text-muted">{c}</span>
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                <span className="block h-full bg-accent" style={{ width: `${((summary.avgs[i] ?? 0) / 5) * 100}%` }} />
              </span>
              <span className="w-8 text-right font-medium tabular-nums">{summary.avgs[i]?.toFixed(1)}</span>
            </li>
          ))}
          <li className="text-xs text-text-muted sm:col-span-2">{summary.n} puanlama</li>
        </ul>
      ) : (
        <p className="text-sm text-text-muted">
          {summary.n > 0 ? `${summary.n} puanlama. ` : ""}Ortalamalar en az 5 puanlamadan sonra görünür.
        </p>
      )}

      {viewerId && !isOwner && (
        canRate || listenedHere ? (
          <div className="card flex flex-col gap-3 p-4">
            <p className="text-sm font-medium">{mine ? "Puanını güncelle" : "Sen de puan ver"}</p>
            {criteria.map((c, i) => (
              <div key={c} className="flex items-center gap-3 text-sm" role="radiogroup" aria-label={c}>
                <span className="w-28 shrink-0 text-text-muted">{c}</span>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5].map((v) => (
                    <button
                      key={v}
                      type="button"
                      role="radio"
                      aria-checked={scores[i] === v}
                      aria-label={`${c}: ${v}`}
                      onClick={() => setScores(scores.map((s, j) => (j === i ? v : s)))}
                      className={`size-8 rounded-full border text-xs font-medium transition-colors ${
                        scores[i] >= v ? "border-accent bg-accent text-bg" : "border-border bg-surface-2 text-text-muted hover:border-text-muted/50"
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <button type="button" onClick={save} disabled={busy} className="btn-primary self-start">
              {busy ? "Kaydediliyor…" : "Puanı kaydet"}
            </button>
            {status && <Notice tone={status.tone}>{status.text}</Notice>}
          </div>
        ) : (
          <p className="text-sm text-text-muted">Puan vermek için parçayı en az 30 saniye dinle.</p>
        )
      )}
    </section>
  );
}
