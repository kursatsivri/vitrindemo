import { ImageResponse } from "next/og";
import { periodLabel, rankingFilters, withTracks } from "@/app/components/ranking";
import { OG, OgLogo, downloadHeaders, ogFonts } from "@/lib/og";
import { createClient } from "@/lib/supabase/server";
import { storageUrl } from "@/lib/tracks";

// Instagram hikâyesi (1080×1920): /siralama'daki listenin ilk 5'i, aynı filtrelerle.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const supabase = await createClient();
  const { period, genre, city, starts, start, title } = rankingFilters(Object.fromEntries(url.searchParams), new Date());
  const ranking = await supabase
    .rpc("ranking", { p_period: period, p_start: start, p_genre: genre ?? undefined, p_city: city ?? undefined })
    .limit(5);
  if (ranking.error) throw new Error(`Sıralama yüklenemedi: ${ranking.error.message}`);
  const rows = (await withTracks(supabase, ranking.data)).filter((r) => r.track.status === "active");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "120px 80px 110px",
          background: OG.bg,
          backgroundImage: `radial-gradient(circle at 50% 0%, ${OG.accentSoft}, transparent 55%)`,
          color: OG.text,
          fontFamily: "Inter",
        }}
      >
        <div style={{ display: "flex", justifyContent: "center" }}>
          <OgLogo size={72} />
        </div>
        <div style={{ marginTop: 80, fontSize: 40, color: OG.muted }}>{periodLabel(period, start, starts.indexOf(start))}</div>
        <div style={{ marginTop: 12, fontFamily: "Bricolage", fontSize: 80, lineHeight: 1.05, letterSpacing: "-0.04em" }}>{title}</div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 36, paddingTop: 40, paddingBottom: 40 }}>
          {rows.length === 0 && <div style={{ fontSize: 44, color: OG.muted }}>Bu listede henüz oy yok.</div>}
          {rows.map((r) => (
            <div key={r.track.id} style={{ display: "flex", alignItems: "center", gap: 36 }}>
              <div style={{ width: 110, fontFamily: "Bricolage", fontSize: 80, color: OG.accent }}>{String(r.rank).padStart(2, "0")}</div>
              {r.track.cover_path ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={storageUrl("covers", r.track.cover_path)} alt="" width={160} height={160} style={{ borderRadius: 20, objectFit: "cover" }} />
              ) : (
                <div style={{ width: 160, height: 160, borderRadius: 20, background: OG.surface2, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <OgLogo size={64} short />
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ fontFamily: "Bricolage", fontSize: 52, letterSpacing: "-0.03em", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                  {r.track.title}
                </div>
                <div style={{ fontSize: 38, color: OG.muted, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{r.artist.name}</div>
              </div>
              <div style={{ fontSize: 36, color: OG.muted }}>{`${r.score} oy`}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "center", fontSize: 40, color: OG.muted }}>{`${url.host}/siralama`}</div>
      </div>
    ),
    { width: 1080, height: 1920, fonts: ogFonts, headers: downloadHeaders(`vitrin-siralama-${period}-${start}.png`) },
  );
}
