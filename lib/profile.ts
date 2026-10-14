// Kayıt ve profil formlarında ortak kurallar (DB check'leriyle aynı).
export const USERNAME_RE = /^(?!\.)(?!.*\.\.)(?!.*\.$)[a-z0-9_.]{3,20}$/;

export const ROLE_LABELS: Record<string, string> = {
  listener: "Dinleyici",
  artist: "Sanatçı",
  label: "Plak şirketi",
  admin: "Yönetici",
};

export const GENRES = [
  { value: "rap", label: "Rap" },
  { value: "beat", label: "Beat" },
] as const;

export const SOCIALS = [
  { key: "instagram", label: "Instagram", hosts: ["instagram.com"] },
  { key: "youtube", label: "YouTube", hosts: ["youtube.com", "youtu.be"] },
  { key: "spotify", label: "Spotify", hosts: ["spotify.com"] },
  { key: "soundcloud", label: "SoundCloud", hosts: ["soundcloud.com"] },
] as const;
