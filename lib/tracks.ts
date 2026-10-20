// Parça kuralları (DB'deki check/bucket/trigger ayarlarıyla aynı).
export const AUDIO_TYPES = ["audio/mpeg", "audio/mp3"];
export const AUDIO_MAX_BYTES = 15 * 1024 * 1024;
export const COVER_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const COVER_MAX_BYTES = 3 * 1024 * 1024;
export const WEEKLY_UPLOAD_LIMIT = 3;

// Haftanın başı: pazartesi 00:00 Türkiye saati (DB trigger'ı ve sıralamayla aynı).
// ponytail: Türkiye 2016'dan beri sabit UTC+3; yaz saati dönerse Intl ile hesapla.
export function weekStart(now = new Date()) {
  const tr = new Date(now.getTime() + 3 * 3600_000);
  const sinceMonday = (tr.getUTCDay() + 6) % 7;
  tr.setUTCHours(0, 0, 0, 0);
  tr.setUTCDate(tr.getUTCDate() - sinceMonday);
  return new Date(tr.getTime() - 3 * 3600_000);
}

// Sıralama dönemi başlangıcı (Türkiye takvim günü, "YYYY-MM-DD"): DB'deki period_start() ile aynı.
// back: kaç dönem geri (arşiv listesi için).
export function periodStart(period: "week" | "month", now = new Date(), back = 0) {
  const tr = new Date(now.getTime() + 3 * 3600_000);
  if (period === "week") tr.setUTCDate(tr.getUTCDate() - ((tr.getUTCDay() + 6) % 7) - 7 * back);
  else tr.setUTCMonth(tr.getUTCMonth() - back, 1);
  return tr.toISOString().slice(0, 10);
}

export function storageUrl(bucket: "tracks" | "covers" | "avatars", path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}

export function formatDuration(sec: number | null) {
  if (!sec) return "";
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
}
