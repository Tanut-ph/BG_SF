import type { MetadataRoute } from "next";

/** PWA manifest — เสิร์ฟที่ /manifest.webmanifest (ให้แอปติดตั้งได้ + แปลงเป็น APK) */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "โป๊ะแตก — เกมจับโกหกวงเพื่อน",
    short_name: "โป๊ะแตก",
    description: "เกมบลัฟเล่นต่อหน้ากัน ใช้มือถือเป็นตัวช่วย",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#081521",
    theme_color: "#081521",
    lang: "th",
    dir: "ltr",
    categories: ["games", "entertainment"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
