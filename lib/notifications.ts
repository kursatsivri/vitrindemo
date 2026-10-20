// Bildirim türü → Türkçe metin + link (veritabanı tetikleyicileri: migration 20261023120000/130000).
import { GENRES, labelOf } from "./music.ts";

export type NotificationRow = {
  type: string;
  data: Record<string, unknown>;
  entity_id: string | null;
  actor: { username: string; display_name: string | null } | null;
  track: { id: string; title: string } | null;
};

const q = (s: string) => `“${s}”`;

// viewerRole: eşleşme linki keşifçide panele, sanatçıda sanatçı paneline gider.
export function describe(n: NotificationRow, viewerRole: string): { text: string; href: string } {
  const who = n.actor ? n.actor.display_name || n.actor.username : "Biri";
  const actorHref = n.actor ? `/${n.actor.username}` : "/";
  const title = n.track ? q(n.track.title) : "bir parça";
  const trackHref = n.track ? `/p/${n.track.id}` : "/";
  const d = n.data;
  const opp = `/firsatlar/${n.entity_id}`;

  switch (n.type) {
    case "follow":
      return { text: `${who} seni takip etmeye başladı`, href: actorHref };
    case "like":
      return { text: `${who} ${title} parçanı beğendi`, href: trackHref };
    case "comment":
      return { text: `${who} ${title} parçana yorum yaptı: ${q(String(d.body ?? ""))}`, href: trackHref };
    case "interest":
      return { text: `${who} sana ilgi gönderdi`, href: "/profil/panel" };
    case "match":
      return { text: `${who} ile eşleştiniz, iletişim bilgileri açıldı`, href: viewerRole === "scout" ? "/kesifci" : "/profil/panel" };
    case "application":
      return { text: `${who} ${q(String(d.title ?? ""))} ilanına başvurdu`, href: opp };
    case "application_status":
      return d.status === "shortlisted"
        ? { text: `${q(String(d.title ?? ""))} ilanında kısa listeye alındın`, href: opp }
        : { text: `${q(String(d.title ?? ""))} ilanına başvurun bu sefer olmadı`, href: opp };
    case "scout_decision":
      return { text: d.status === "approved" ? "Keşifçi başvurun onaylandı" : "Keşifçi başvurun onaylanmadı", href: "/kesifci" };
    case "new_track":
      return { text: `${who} yeni parça yükledi: ${title}`, href: trackHref };
    case "vote_milestone":
      return { text: `${title} ${d.votes} oya ulaştı`, href: trackHref };
    case "top10":
      return {
        text: `${title} ${d.period === "month" ? "aylık" : "haftalık"} ${labelOf(GENRES, String(d.genre ?? ""))} listesinde ${d.rank}. oldu`,
        href: "/siralama",
      };
    case "alert":
      return { text: `Yetenek alarmı: ${who} bu hafta yükseliyor (${d.score} oy)`, href: actorHref };
    case "challenge_beat":
      return { text: `Beat'in ${title} haftanın challenge'ı seçildi`, href: "/challenge" };
    case "challenge_win":
      return d.role === "beatmaker"
        ? { text: `Beat'inle yapılan challenge'ı ${who} kazandı`, href: "/challenge" }
        : { text: `${title} challenge'ı kazandı!`, href: "/challenge" };
    default:
      return { text: "Yeni bildirim", href: "/" };
  }
}
