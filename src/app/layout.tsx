import type { Metadata, Viewport } from "next";
import { Mitr, IBM_Plex_Sans_Thai } from "next/font/google";
import "./globals.css";

const mitr = Mitr({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-mitr",
  display: "swap",
});

const plexThai = IBM_Plex_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-thai",
  display: "swap",
});

export const metadata: Metadata = {
  title: "โป๊ะแตก",
  description: "เกมจับโกหกวงเพื่อน — เล่นต่อหน้ากัน ใช้มือถือเป็นตัวช่วย",
};

export const viewport: Viewport = {
  themeColor: "#081521",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th" className={`${mitr.variable} ${plexThai.variable}`}>
      <body>{children}</body>
    </html>
  );
}
