# คู่มือ Deploy — โป๊ะแตก

## ข้อกำหนดสำคัญ

เกมนี้ใช้ **custom server (Next.js + Socket.IO) รวมกัน** และเก็บ state ของห้อง **ในหน่วยความจำ** จึงต้อง:

1. **โฮสต์ที่รัน process ค้างได้ + รองรับ WebSocket** — เช่น Render / Fly.io (ฟรี) หรือ Railway
   ❌ ใช้ Vercel/Netlify serverless functions ไม่ได้ (ตัด WebSocket + ไม่มี process ค้าง)
2. **รันแค่ 1 instance** — เพราะ state อยู่ในหน่วยความจำ ถ้าหลาย instance ผู้เล่นจะกระจายคนละห้อง
   (จะ scale หลาย instance ได้ต้องเพิ่ม Redis adapter ของ Socket.IO — ดูหัวข้อ "อนาคต")

Production build + server ทดสอบผ่านแล้ว (`npm run build` + `npm run start` เสิร์ฟหน้าเว็บ 200 และ `/socket.io/` handshake 200)

---

## ตัวเลือก A — Render (แนะนำ · ฟรีจริง ไม่ต้องผูกบัตร)

1. push ขึ้น GitHub (ทำแล้ว)
2. ที่ [render.com](https://render.com) → สมัคร/ล็อกอิน (ใช้ GitHub ได้)
3. **New → Blueprint** → เลือก repo `Tanut-ph/BG_SF` → Render อ่าน `render.yaml` อัตโนมัติ
   (หรือ **New → Web Service** ตั้งเอง: Runtime Node, Build `npm ci --include=dev && npm run build`, Start `npm run start`, Plan Free)
4. ตอน deploy จะให้กรอก **Environment Variable** ที่ตั้ง `sync: false` ไว้:
   - `MONGODB_URI` = สตริงจาก Atlas — บน Render ใช้แบบ `mongodb+srv://...` ได้เลย (DNS ปกติ):
     `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/?appName=<app>`
     (เอาค่าจริงจาก Atlas → Connect → Drivers; อย่า commit ค่าจริงลง repo)
   - `MONGODB_DB` = `popbaek` (ตั้งไว้ใน render.yaml แล้ว)
   - ถ้าไม่ใส่ `MONGODB_URI` แอปยังรันได้ (in-memory) แค่ไม่กันซ้ำข้ามเครื่อง
5. **Atlas Network Access** ต้องเปิด `0.0.0.0/0` (อนุญาตทุก IP) เพราะ IP ของ Render ไม่คงที่
6. Render ตั้ง `PORT` ให้เอง · Health check = `/` · free plan = 1 instance อยู่แล้ว (ตรงกับที่เกมต้องการ)

> ⚠️ **ข้อจำกัด free plan:** ถ้าไม่มีคนเข้าเว็บ ~15 นาที Render จะพักเครื่อง (sleep)
> คนเข้าครั้งถัดไปจะรอ cold start ~50 วินาทีให้เครื่องตื่น แล้วใช้ได้ปกติ
> (สำหรับเกมปาร์ตี้ที่เล่นเป็นรอบ ๆ ยอมรับได้ — หัวห้องเปิดรอแป๊บเดียว)

## ตัวเลือก B — Fly.io (ไม่หลับ แต่ต้องผูกบัตร)

- ข้อดี: `min_machines_running = 1` + `auto_stop_machines = false` → ไม่พักเครื่อง, WebSocket ลื่นกว่า, เซิร์ฟเวอร์สิงคโปร์ใกล้ไทย
- ข้อเสีย: ต้องใส่บัตรเครดิตตอนสมัคร (ใช้น้อยยังฟรี แต่เกินโดนชาร์จ)

```bash
flyctl launch --no-deploy   # ครั้งแรก (มี fly.toml ให้แล้ว — ตอบ no ถ้าถามจะเขียนทับ)
flyctl secrets set MONGODB_URI="mongodb+srv://..." MONGODB_DB=popbaek
flyctl deploy
```
- `fly.toml` ตั้ง `internal_port = 3000`, `min_machines_running = 1`, `auto_stop_machines = false` (กันเครื่องดับกลางเกม)
- เปลี่ยน `primary_region` ได้ (ค่าเริ่มต้น `sin` = สิงคโปร์)

> Railway ก็ deploy ได้ (เจอ `Dockerfile` อัตโนมัติ, ตั้ง replica = 1, ใส่ env `MONGODB_URI`)
> แต่ตอนนี้ให้แค่เครดิตทดลอง ไม่ฟรีถาวร จึงแนะนำ Render/Fly.io แทน

---

## ตัวแปรสภาพแวดล้อม (env)

| ตัวแปร | ค่า | หมายเหตุ |
|---|---|---|
| `PORT` | แพลตฟอร์มตั้งให้เอง | server อ่านอัตโนมัติ (default 3000) |
| `NODE_ENV` | `production` | ตั้งใน render.yaml/Dockerfile แล้ว |
| `HOST` | (ไม่ต้องตั้ง) | server bind `0.0.0.0` อยู่แล้ว |
| `MONGODB_URI` | สตริงจาก Atlas | ไม่บังคับ · ใส่เพื่อกันคำถามซ้ำข้ามเครื่อง · ไม่ใส่ = in-memory |
| `MONGODB_DB` | `popbaek` | ชื่อ database (ตั้ง default แล้ว) |

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
