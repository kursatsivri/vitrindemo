"use client";

import { Flame } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Notice } from "@/app/components/notice";
import { usePlayer } from "@/app/components/player";
import { createClient } from "@/lib/supabase/client";

// cast_vote() hata ipuçları (hint) → mesaj
const ERRORS: Record<string, string> = {
  auth: "Oy vermek için giriş yap.",
  role: "Bu hesap türü oy veremez.",
  not_found: "Parça bulunamadı.",
  own_track: "Kendi parçana oy veremezsin.",
  not_listened: "Oy için parçayı en az 30 saniye dinlemelisin.",
  already_voted: "Bu parçaya bu hafta zaten oy verdin.",
  rate_limit: "Çok hızlı oy veriyorsun. Biraz sonra tekrar dene.",
};

// Haftalık oy. Kurallar (30 sn dinleme, haftada 1, hız sınırı, 7 günlük hesap) DB'de;
// buradaki dinleme kontrolü sadece butonu doğru zamanda göstermek için.
export function VoteButton({
  trackId,
  viewerId,
  isOwner,
  listened,
  voted,
  votes,
}: {
  trackId: string;
  viewerId: string | null;
  isOwner: boolean;
  listened: boolean;
  voted: boolean;
  votes?: number;
}) {
  const router = useRouter();
  const player = usePlayer();
  // Bu sayfada 35 sn çalındıysa dinleme kaydı düşmüştür (RatingPanel ile aynı).
  const listenedHere = player?.current?.id === trackId && player.listened >= 35;
  const [done, setDone] = useState(voted);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ tone: "error" | "success"; text: string } | null>(null);

  async function vote() {
    if (!viewerId) return router.push("/giris");
    setBusy(true);
    const { data, error } = await createClient().rpc("cast_vote", { p_track: trackId });
    setBusy(false);
    if (error) {
      if (error.hint === "already_voted") setDone(true);
      return setStatus({ tone: "error", text: ERRORS[error.hint] ?? "Oy verilemedi. Tekrar dene." });
    }
    setDone(true);
    setStatus({ tone: "success", text: data ? "Oyun kaydedildi. Teşekkürler!" : "Oyun kaydedildi, hesabın 7 günü doldurunca sayılacak" });
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        {isOwner ? null : listened || listenedHere ? (
          <button type="button" onClick={vote} disabled={done || busy} className="btn-primary">
            <Flame aria-hidden className="size-[18px]" strokeWidth={1.75} />
            {done ? "Bu hafta oy verdin" : busy ? "Gönderiliyor…" : "Oy ver"}
          </button>
        ) : (
          <span className="text-sm text-text-muted">Oy vermek için parçayı en az 30 saniye dinle.</span>
        )}
        {votes !== undefined && (
          <span className="text-sm text-text-muted">
            <span className="font-medium text-text tabular-nums">{votes}</span> oy
          </span>
        )}
      </div>
      {status && <Notice tone={status.tone}>{status.text}</Notice>}
    </div>
  );
}
