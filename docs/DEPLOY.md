# คู่มือ Deploy — โป๊ะแตก

## ข้อกำหนดสำคัญ

เกมนี้ใช้ **custom server (Next.js + Socket.IO) รวมกัน** และเก็บ state ของห้อง **ในหน่วยความจำ** จึงต้อง:

1. **โฮสต์ที่รัน process ค้างได้ + รองรับ WebSocket** — เช่น Railway / Render / Fly.io
   ❌ ใช้ Vercel/Netlify serverless functions ไม่ได้ (ตัด WebSocket + ไม่มี process ค้าง)
2. **รันแค่ 1 instance** — เพราะ state อยู่ในหน่วยความจำ ถ้าหลาย instance ผู้เล่นจะกระจายคนละห้อง
   (จะ scale หลาย instance ได้ต้องเพิ่ม Redis adapter ของ Socket.IO — ดูหัวข้อ "อนาคต")

Production build + server ทดสอบผ่านแล้ว (`npm run build` + `npm run start` เสิร์ฟหน้าเว็บ 200 และ `/socket.io/` handshake 200)

---

## ตัวเลือก A — Railway (ง่ายสุด)

1. push โปรเจกต์ขึ้น GitHub
2. ที่ [railway.app](https://railway.app) → **New Project → Deploy from GitHub repo**
3. Railway จะเจอ `Dockerfile` และ build ให้อัตโนมัติ (หรือใช้ Nixpacks: build `npm run build`, start `npm run start`)
4. Railway ตั้ง `PORT` ให้เอง — server อ่านจาก `process.env.PORT` อยู่แล้ว ไม่ต้องตั้งเพิ่ม
5. เปิด **Settings → Networking → Generate Domain** เพื่อได้ URL สาธารณะ
6. ตั้งจำนวน replica = **1**

## ตัวเลือก B — Render

1. push ขึ้น GitHub
2. ที่ [render.com](https://render.com) → **New → Blueprint** แล้วชี้ไปที่ repo (มี `render.yaml` ให้แล้ว)
   หรือ **New → Web Service** ตั้งเอง: Build `npm ci && npm run build`, Start `npm run start`
3. Render ตั้ง `PORT` ให้เอง · Health check path = `/`
4. instance count = 1

## ตัวเลือก C — Fly.io

```bash
flyctl launch --no-deploy   # ครั้งแรก (มี fly.toml ให้แล้ว — ตอบ no ถ้าถามจะเขียนทับ)
flyctl deploy
```
- `fly.toml` ตั้ง `internal_port = 3000`, `min_machines_running = 1`, `auto_stop_machines = false` (กันเครื่องดับกลางเกม)
- เปลี่ยน `primary_region` ได้ (ค่าเริ่มต้น `sin` = สิงคโปร์)

---

## ตัวแปรสภาพแวดล้อม (env)

| ตัวแปร | ค่า | หมายเหตุ |
|---|---|---|
| `PORT` | แพลตฟอร์มตั้งให้เอง | server อ่านอัตโนมัติ (default 3000) |
| `NODE_ENV` | `production` | ตั้งใน Dockerfile/config แล้ว |
| `HOST` | (ไม่ต้องตั้ง) | server bind `0.0.0.0` อยู่แล้ว |

## ทดสอบหลัง deploy

1. เปิด URL ที่ได้ → ต้องเห็นหน้าแรก "โป๊ะแตก"
2. เปิดอีกเครื่อง/แท็บ สร้างห้อง + เข้าห้องด้วยรหัส → รายชื่อต้องอัปเดตแบบ realtime (ยืนยันว่า WebSocket ผ่าน)

## รัน production ในเครื่องตัวเอง (ตรวจก่อน deploy)

```bash
npm run build
npm run start
```

---

## อนาคต (ถ้าต้องรองรับคนเยอะ/หลาย instance)

- **Redis adapter** (`@socket.io/redis-adapter`) — ให้หลาย instance แชร์ event กัน + ย้าย room state ไป Redis
- **ฐานข้อมูล** (Postgres/Supabase) — เก็บประวัติคะแนน/คลังคำถามถาวร (ตอนนี้อยู่ในหน่วยความจำ หายเมื่อ restart)
- โครงสร้างพวกนี้วางไว้ใน `docs/architecture.md` แล้ว
