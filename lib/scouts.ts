// Keşifçi başvurusu ve fırsat ilanı formları — DB check'leriyle aynı (migration 20261022120000).
// DB asıl kontrol; bunlar anlaşılır hata mesajı için.
import { CITIES, GENRES } from "./music.ts";

export const SCOUT_KINDS = [
  { value: "producer", label: "Yapımcı" },
  { value: "label", label: "Plak şirketi" },
  { value: "manager", label: "Menajer" },
] as const;

export const SEEKING = [
  { value: "rapper", label: "Rapçi" },
  { value: "vocal", label: "Vokal / şarkıcı" },
  { value: "beatmaker", label: "Beatmaker" },
  { value: "stage", label: "Sahne sanatçısı" },
  { value: "other", label: "Diğer" },
] as const;

export const MAX_OPEN_OPPORTUNITIES = 5;
export const MAX_DEADLINE_DAYS = 90;

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const has = (list: readonly { value: string }[], v: string) => list.some((x) => x.value === v);
const text = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

export type ScoutApplication = {
  kind: string;
  org_name: string;
  website: string | null;
  contact_person: string;
  contact_email: string;
  about: string;
};

export function readApplication(f: FormData): ScoutApplication | { error: string } {
  const a = {
    kind: text(f, "kind"),
    org_name: text(f, "org_name"),
    website: text(f, "website") || null,
    contact_person: text(f, "contact_person"),
    contact_email: text(f, "contact_email"),
    about: text(f, "about"),
  };
  if (!has(SCOUT_KINDS, a.kind)) return { error: "Keşifçi türünü seç." };
  if (a.org_name.length < 2 || a.org_name.length > 80) return { error: "Ad / şirket 2–80 karakter olmalı." };
  if (a.website && (!/^https:\/\/\S+$/.test(a.website) || a.website.length > 200)) {
    return { error: "Web sitesi https:// ile başlamalı." };
  }
  if (a.contact_person.length < 2 || a.contact_person.length > 80) return { error: "Yetkili kişi 2–80 karakter olmalı." };
  if (!EMAIL_RE.test(a.contact_email) || a.contact_email.length > 254) return { error: "Geçerli bir iletişim e-postası yaz." };
  if (a.about.length < 10 || a.about.length > 500) return { error: "Açıklama 10–500 karakter olmalı." };
  return a;
}

export type Opportunity = {
  title: string;
  seeking: string;
  genre: string | null;
  city: number | null;
  deadline: string;
  body: string;
};

// YYYY-MM-DD'ye gün ekler (takvim günü; saat dilimi yok).
export function addDays(day: string, n: number) {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// today: Türkiye takvimiyle bugün (YYYY-MM-DD)
export function readOpportunity(f: FormData, today: string): Opportunity | { error: string } {
  const genre = text(f, "genre");
  const o = {
    title: text(f, "title"),
    seeking: text(f, "seeking"),
    genre: genre || null,
    city: Number(text(f, "city")) || null,
    deadline: text(f, "deadline"),
    body: text(f, "body"),
  };
  if (o.title.length < 3 || o.title.length > 80) return { error: "Başlık 3–80 karakter olmalı." };
  if (!has(SEEKING, o.seeking)) return { error: "Ne aradığını seç." };
  if (o.genre && !has(GENRES, o.genre)) return { error: "Geçersiz tür." };
  if (o.city !== null && (!Number.isInteger(o.city) || o.city < 1 || o.city > CITIES.length)) return { error: "Geçersiz şehir." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(o.deadline) || o.deadline < today || o.deadline > addDays(today, MAX_DEADLINE_DAYS)) {
    return { error: `Son tarih bugün ile ${MAX_DEADLINE_DAYS} gün sonrası arasında olmalı.` };
  }
  if (o.body.length < 10 || o.body.length > 1000) return { error: "Açıklama 10–1000 karakter olmalı." };
  return o;
}

// Türkiye takvimiyle bugün (YYYY-MM-DD)
export function trToday(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(now);
}

// DB kural hataları (P0001) Türkçe mesaj taşır; diğerleri genel mesaja düşer.
export function dbMessage(error: { code?: string; message: string }, fallback = "İşlem yapılamadı. Lütfen tekrar dene.") {
  if (error.code === "P0001") return error.message;
  if (error.code === "23505") return "Bunu zaten yaptın.";
  return fallback;
}
