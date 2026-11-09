/* โป๊ะแตก service worker — ให้ติดตั้งเป็นแอป/APK ได้ + เปิดออฟไลน์ได้บางส่วน
 * หมายเหตุ: ไม่แตะ /socket.io (realtime) ปล่อยผ่านตรง ๆ กันเกมพัง */
const CACHE = "popbaek-v1";
const SHELL = ["/"];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(SHELL))
      .catch(() => {})
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/socket.io")) return; // realtime — ปล่อยผ่าน

  // หน้าเว็บ (navigation): เอาของสดก่อน ออฟไลน์ค่อย fallback หน้าแรก
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          return await fetch(request);
        } catch {
          return (await caches.match("/")) || Response.error();
        }
      })()
    );
    return;
  }

  // ไฟล์ static (chunk มี hash อยู่แล้ว): เอาจาก cache ก่อน
  event.respondWith(
    (async () => {
      const cached = await caches.match(request);
      if (cached) return cached;
      try {
        const res = await fetch(request);
        if (res.ok && res.type === "basic") {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
        }
        return res;
      } catch {
        return cached || Response.error();
      }
    })()
  );
});
