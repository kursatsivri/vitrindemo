// Keşfet modu: kaydırma kararı, filtre okuma ve kart verisi (sunucu ve istemci ortak).
import { cityName, GENRES, MOODS, TAGS } from "./music.ts";

// Kart yatayda genişliğin %25'inden (en az 80 px) fazla kaydırılırsa karar verilir.
export function swipeDecision(dx: number, width: number): "like" | "skip" | null {
  const threshold = Math.max(80, width * 0.25);
  return dx >= threshold ? "like" : dx <= -threshold ? "skip" : null;
}

export type DiscoverFilters = { genre: string | null; tag: string | null; mood: string | null; city: number | null };

// URL parametreleri (?tur=&etiket=&ruh=&il=) → sadece listede olan değerler
export function readFilters(q: Record<string, string | string[] | undefined>): DiscoverFilters {
  const pick = (list: readonly { value: string }[], v: unknown) =>
    typeof v === "string" && list.some((x) => x.value === v) ? v : null;
  const city = Number(q.il);
  return {
    genre: pick(GENRES, q.tur),
    tag: pick(TAGS, q.etiket),
    mood: pick(MOODS, q.ruh),
    city: cityName(city) ? city : null,
  };
}

// discover_feed() parametreleri (null'lar gönderilmez)
export function feedArgs(f: DiscoverFilters, limit: number) {
  return {
    p_genre: f.genre ?? undefined,
    p_tag: f.tag ?? undefined,
    p_mood: f.mood ?? undefined,
    p_city: f.city ?? undefined,
    p_limit: limit,
  };
}

export const CARD_SELECT =
  "id, title, genre, tags, moods, hook_sec, cover_path, duration_sec, audio_path, status, profiles!artist_id(username, display_name, city)";

type CardRow = {
  id: string;
  title: string;
  genre: string;
  tags: string[];
  moods: string[];
  hook_sec: number;
  cover_path: string | null;
  duration_sec: number | null;
  audio_path: string;
  status: string;
  profiles: { username: string; display_name: string | null; city: number | null } | null;
};

export type DeckCard = Omit<CardRow, "profiles"> & { artist: { name: string; username: string; city: number | null } };

// Parça satırlarını akış sırasına dizer (in() sırayı korumaz), sanatçısı olmayanı atar.
export function toCards(order: string[], rows: CardRow[]): DeckCard[] {
  const byId = new Map(rows.map((r) => [r.id, r]));
  return order.flatMap((id) => {
    const r = byId.get(id);
    if (!r?.profiles) return [];
    const { profiles: p, ...track } = r;
    return [{ ...track, artist: { name: p.display_name || p.username, username: p.username, city: p.city } }];
  });
}
