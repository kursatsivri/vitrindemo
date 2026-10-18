// Formdaki link alanlarını doğrular: sadece https ve listedeki alan adları (DB check'iyle aynı kural).
// Profil sosyal linkleri ve parça dış linkleri için ortak.
export function readLinks(
  formData: FormData,
  list: readonly { key: string; label: string; hosts: readonly string[] }[],
): { links: Record<string, string> } | { error: string } {
  const links: Record<string, string> = {};
  for (const s of list) {
    const value = String(formData.get(s.key) ?? "").trim().slice(0, 300);
    if (!value) continue;
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      return { error: `${s.label} linki geçersiz.` };
    }
    const hostOk = s.hosts.some((h) => url.hostname === h || url.hostname.endsWith(`.${h}`));
    if (url.protocol !== "https:" || !hostOk) {
      return { error: `${s.label} linki https://${s.hosts[0]}/… ile başlamalı.` };
    }
    links[s.key] = url.toString();
  }
  return { links };
}
