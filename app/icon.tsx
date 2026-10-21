import { ImageResponse } from "next/og";
import { OG, OgLogo, ogFonts } from "@/lib/og";

// İkon (sekme, ana ekran, manifest): koyu zemin, "v." yazı logo.
export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: OG.bg }}>
        <OgLogo size={320} short />
      </div>
    ),
    { ...size, fonts: ogFonts },
  );
}
