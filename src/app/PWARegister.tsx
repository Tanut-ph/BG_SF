"use client";

import { useEffect } from "react";

/** ลงทะเบียน service worker ฝั่ง client (ทำให้แอปติดตั้งได้ + ออฟไลน์ได้บางส่วน) */
export default function PWARegister() {
  useEffect(() => {
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* เงียบไว้ — ไม่มี SW ก็เล่นได้ปกติ */
      });
    }
  }, []);
  return null;
}
