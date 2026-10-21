import { ImageResponse } from "next/og";
import { genreLabel } from "@/app/components/track-row";
import { OG, OgLogo, downloadHeaders, ogFonts } from "@/lib/og";
import { createClient } from "@/lib/supabase/server";
import { storageUrl } from "@/lib/tracks";

// Instagram hikâyesi (1080×1920): kapak, parça, sanatçı, tür, en iyi derece.
export async function GET(request: Request, { params }: RouteContext<"/p/[id]/hikaye">) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: track }, { data: best }] = await Promise.all([
    supabase
      .from("tracks")
      .select("id, title, genre, cover_path, status, profiles!artist_id(username, display_name)")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("ranking_snapshots")
      .select("rank_genre, genre, period")
      .eq("track_id", id)
      .order("rank_genre")
      .limit(1)
      .maybeSingle(),
  ]);
  // Sahibi gizli parçasını görebilir (RLS); hikâye yalnız yayındaki parçaya. Askıdaki hesap → 'suspended'.
  if (!track?.profiles || track.status !== "active") return new Response("Parça bulunamadı", { status: 404 });
  const artist = track.profiles.display_name || track.profiles.username;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "120px 96px 110px",
          background: OG.bg,
          backgroundImage: `radial-gradient(circle at 50% 38%, ${OG.accentSoft}, transparent 60%)`,
          color: OG.text,
          fontFamily: "Inter",
        }}
      >
        <OgLogo size={72} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "100%" }}>
          {track.cover_path ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={storageUrl("covers", track.cover_path)} alt="" width={800} height={800} style={{ borderRadius: 40, objectFit: "cover" }} />
          ) : (
            <div style={{ width: 800, height: 800, borderRadius: 40, background: OG.surface2, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <OgLogo size={240} short />
            </div>
          )}
          <div style={{ marginTop: 64, fontSize: 40, color: OG.muted }}>{genreLabel(track.genre)}</div>
          <div
            style={{
              marginTop: 16,
              fontFamily: "Bricolage",
              fontSize: 104,
              lineHeight: 1,
              letterSpacing: "-0.04em",
              textAlign: "center",
              display: "block",
              lineClamp: 2,
            }}
          >
            {track.title}
          </div>
          <div style={{ marginTop: 28, fontSize: 52 }}>{artist}</div>
          {best && (
            <div style={{ marginTop: 48, display: "flex", padding: "16px 36px", borderRadius: 999, background: OG.accentSoft, color: OG.accent, fontSize: 38 }}>
              {`En iyi: ${genreLabel(best.genre)} ${best.period === "week" ? "haftalık" : "aylık"} #${best.rank_genre}`}
            </div>
          )}
        </div>
        <div style={{ fontSize: 40, color: OG.muted }}>{new URL(request.url).host}</div>
      </div>
    ),
    { width: 1080, height: 1920, fonts: ogFonts, headers: downloadHeaders(`vitrin-${track.id.slice(0, 8)}.png`) },
  );
}
