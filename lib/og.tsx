import { readFile } from "node:fs/promises";
import { join } from "node:path";

// ImageResponse CSS değişkeni okuyamaz: değerler app/globals.css :root token'larının kopyası.
// Token değişirse burayı da güncelle.
export const OG = {
  bg: "#0b0b0c", // --bg
  surface2: "#1c1c1f", // --surface-2
  text: "#f5f5f4", // --text
  muted: "#9a9aa3", // --text-muted
  accent: "#ff6a2b", // --accent
  accentSoft: "rgba(255, 106, 43, 0.12)", // --accent-soft (accent %12)
};

// Türkçe karakterli fontlar (Google Fonts TTF; ImageResponse woff2 okuyamaz).
const fontsDir = join(process.cwd(), "app/fonts");
const [bricolage, inter] = await Promise.all([
  readFile(join(fontsDir, "BricolageGrotesque-ExtraBold.ttf")),
  readFile(join(fontsDir, "Inter-Regular.ttf")),
]);
export const ogFonts = [
  { name: "Bricolage", data: bricolage, weight: 800 as const, style: "normal" as const },
  { name: "Inter", data: inter, weight: 400 as const, style: "normal" as const },
];

// Yazı logo "vitrin." (Bricolage, turuncu nokta); short: ikon için "v."
export function OgLogo({ size, short = false }: { size: number; short?: boolean }) {
  return (
    <div style={{ display: "flex", fontFamily: "Bricolage", fontSize: size, letterSpacing: "-0.04em", color: OG.text }}>
      {short ? "v" : "vitrin"}
      <span style={{ color: OG.accent }}>.</span>
    </div>
  );
}

// İndirilen PNG: tarayıcı kaydetsin (Content-Disposition).
export const downloadHeaders = (filename: string) => ({
  "Content-Disposition": `attachment; filename="${filename}"`,
  "Cache-Control": "private, no-store",
});
