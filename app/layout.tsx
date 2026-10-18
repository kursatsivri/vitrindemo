import type { Metadata } from "next";
import { Bricolage_Grotesque, Inter } from "next/font/google";
import { Header } from "./components/header";
import { PlayerProvider } from "./components/player";
import "./globals.css";

// Metin ve arayüz
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"],
});

// Logo, başlıklar ve büyük sayılar
const display = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: "Vitrin",
  description: "Bağımsız rap ve beat keşif platformu",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="tr" className={`${inter.variable} ${display.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {/* Oynatıcı layout'ta: sayfa değişince müzik durmaz (SPEC §3.3) */}
        <PlayerProvider>
          <Header />
          {children}
        </PlayerProvider>
      </body>
    </html>
  );
}
