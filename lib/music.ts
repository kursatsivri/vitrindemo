// Tür, etiket, ruh hali, il ve dış link listeleri — DB check'leriyle aynı (migration 20261018120000).

export const GENRES = [
  { value: "rap", label: "Rap / Hip-Hop" },
  { value: "beat", label: "Beat / Prodüksiyon" },
  { value: "pop", label: "Pop" },
  { value: "arabesk", label: "Arabesk / Fantezi" },
  { value: "rnb", label: "R&B / Soul" },
  { value: "rock", label: "Rock / Alternatif" },
  { value: "electronic", label: "Elektronik / Dans" },
  { value: "acoustic", label: "Akustik / Indie" },
  { value: "folk", label: "Türkü / Halk" },
] as const;

export const TAGS = [
  { value: "trap", label: "Trap" },
  { value: "drill", label: "Drill" },
  { value: "boom_bap", label: "Boom bap" },
  { value: "melodic_rap", label: "Melodik rap" },
  { value: "arabesk_rap", label: "Arabesk rap" },
  { value: "old_school", label: "Old school" },
  { value: "underground", label: "Underground" },
  { value: "lofi", label: "Lo-fi" },
  { value: "phonk", label: "Phonk" },
  { value: "afro", label: "Afro" },
  { value: "jersey_club", label: "Jersey club" },
  { value: "deep_house", label: "Deep house" },
  { value: "slow", label: "Slow" },
  { value: "ballad", label: "Balad" },
  { value: "indie", label: "Indie" },
  { value: "alternative", label: "Alternatif" },
] as const;
export const MAX_TAGS = 3;

export const MOODS = [
  { value: "hard", label: "Sert" },
  { value: "emotional", label: "Duygusal" },
  { value: "chill", label: "Chill" },
  { value: "energetic", label: "Enerjik" },
  { value: "dark", label: "Karanlık" },
  { value: "love", label: "Aşk" },
  { value: "party", label: "Parti" },
] as const;
export const MAX_MOODS = 2;

export const MAX_FEATURES = 3;

export const TRACK_LINKS = [
  { key: "spotify", label: "Spotify", hosts: ["spotify.com"] },
  { key: "youtube", label: "YouTube", hosts: ["youtube.com", "youtu.be"] },
  { key: "apple_music", label: "Apple Music", hosts: ["music.apple.com"] },
  { key: "soundcloud", label: "SoundCloud", hosts: ["soundcloud.com"] },
] as const;

// İl plaka kodu sırasıyla (profiles.city = index + 1)
export const CITIES = [
  "Adana", "Adıyaman", "Afyonkarahisar", "Ağrı", "Amasya", "Ankara", "Antalya", "Artvin", "Aydın", "Balıkesir",
  "Bilecik", "Bingöl", "Bitlis", "Bolu", "Burdur", "Bursa", "Çanakkale", "Çankırı", "Çorum", "Denizli",
  "Diyarbakır", "Edirne", "Elazığ", "Erzincan", "Erzurum", "Eskişehir", "Gaziantep", "Giresun", "Gümüşhane", "Hakkari",
  "Hatay", "Isparta", "Mersin", "İstanbul", "İzmir", "Kars", "Kastamonu", "Kayseri", "Kırklareli", "Kırşehir",
  "Kocaeli", "Konya", "Kütahya", "Malatya", "Manisa", "Kahramanmaraş", "Mardin", "Muğla", "Muş", "Nevşehir",
  "Niğde", "Ordu", "Rize", "Sakarya", "Samsun", "Siirt", "Sinop", "Sivas", "Tekirdağ", "Tokat",
  "Trabzon", "Tunceli", "Şanlıurfa", "Uşak", "Van", "Yozgat", "Zonguldak", "Aksaray", "Bayburt", "Karaman",
  "Kırıkkale", "Batman", "Şırnak", "Bartın", "Ardahan", "Iğdır", "Yalova", "Karabük", "Kilis", "Osmaniye",
  "Düzce",
] as const;

export function cityName(code: number | null) {
  return code ? (CITIES[code - 1] ?? null) : null;
}

export function labelOf(list: readonly { value: string; label: string }[], value: string) {
  return list.find((x) => x.value === value)?.label ?? value;
}

// "1:24" veya "84" → 84 saniye; geçersizse null
export function parseTime(text: string) {
  const t = text.trim();
  if (!t) return 0;
  const m = /^(?:(\d{1,2}):)?(\d{1,4})$/.exec(t);
  if (!m) return null;
  const sec = Number(m[1] ?? 0) * 60 + Number(m[2]);
  return m[1] && Number(m[2]) > 59 ? null : sec;
}
