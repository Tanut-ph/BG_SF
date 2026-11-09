# คู่มือครบวงจร: จากโค้ด → เว็บออนไลน์ → APK แจกเพื่อน

คู่มือนี้พาทำทีละขั้นจนได้ไฟล์ APK ที่เพื่อนติดตั้งเล่นได้ พร้อมเรื่องความปลอดภัยที่ต้องทำก่อน

> ภาพรวม 4 ด่าน:
> 1. 🔐 เก็บความปลอดภัย (เปลี่ยนรหัส DB) → 2. 🚀 deploy เว็บเป็น HTTPS → 3. ✅ เช็ค PWA → 4. 📱 แปลงเป็น APK

---

## ด่าน 1 — ความปลอดภัย (ทำก่อนเลย)

เหตุผล: username + host ของ MongoDB เคยหลุดอยู่ใน git history เก่า (รหัสผ่านจริงไม่หลุด) วิธีปิดจบคือ**เปลี่ยน credential ใหม่** ของเก่าจะกลายเป็นขยะทันที

### 1.1 เปลี่ยน Database User ใน Atlas
1. เข้า [cloud.mongodb.com](https://cloud.mongodb.com) → เลือก project → **SECURITY → Database Access**
2. ลบ user เดิม `oam23636_db_user` (ไอคอนถังขยะ)
3. **+ ADD NEW DATABASE USER**
   - Authentication: **Password**
   - Username: ตั้งใหม่ เช่น `popbaek_app`
   - Password: กด **Autogenerate** แล้ว **Copy** เก็บไว้ (หรือพิมพ์เองแบบ**ไม่มีอักขระพิเศษ** `@ : / # ? %`)
   - Database User Privileges: **Read and write to any database**
   - **Add User**
4. รอ ~30 วิ ให้ status เป็น Active

### 1.2 ยืนยัน Network Access
- **SECURITY → Network Access** → ต้องมี `0.0.0.0/0` (Allow from anywhere) เพราะ IP ของโฮสต์ไม่คงที่
- (เข้มกว่านี้: หลัง deploy แล้วค่อยเปลี่ยนเป็น IP ของโฮสต์จริง)

### 1.3 สร้างสตริงเชื่อมต่อใหม่
Atlas → **Database → Connect → Drivers → Node.js** จะได้สตริงหน้าตา:
```
mongodb+srv://popbaek_app:<password>@soundfish.xxxxx.mongodb.net/?appName=Soundfish
```
แทน `<password>` ด้วยรหัสใหม่ (ถ้ารหัสมีอักขระพิเศษต้อง URL-encode: `@`→`%40`, `#`→`%23`)

---

## ด่าน 2 — Deploy เว็บเป็น HTTPS

APK ของเราเป็นแบบ "หุ้มเว็บ" (TWA) จึง**ต้องมีเว็บออนไลน์ HTTPS ก่อน** เลือกโฮสต์ฟรีได้ 2 ตัว

### ทางเลือก A — Render (ฟรี ไม่ต้องผูกบัตร · แนะนำ)
1. [render.com](https://render.com) → Sign up ด้วย GitHub
2. **New → Blueprint** → เลือก repo `Tanut-ph/BG_SF` → Render อ่าน `render.yaml` เอง
3. ตอน deploy จะถาม **Environment Variable** `MONGODB_URI` → วางสตริงจากข้อ 1.3
   - `MONGODB_DB` = `popbaek` (ตั้งใน render.yaml แล้ว)
4. กด **Apply** → รอ build ~3-5 นาที → ได้ URL เช่น `https://popbaek.onrender.com`

> ⚠️ Free plan: ถ้าไม่มีคนเข้า ~15 นาที เครื่องจะหลับ คนเข้าครั้งถัดไปรอ ~50 วิ แล้วใช้ได้ปกติ

### ทางเลือก B — Fly.io (ไม่หลับ แต่ต้องผูกบัตร)
```bash
# ติดตั้ง flyctl ก่อน (ครั้งเดียว): https://fly.io/docs/flyctl/install
flyctl auth login
cd D:\Work\SF_Game
flyctl launch --no-deploy          # มี fly.toml แล้ว ตอบ no ถ้าถามเขียนทับ
flyctl secrets set MONGODB_URI="mongodb+srv://..." MONGODB_DB=popbaek
flyctl deploy
```
ได้ URL เช่น `https://popbaek.fly.dev`

### รันในเครื่องตัวเอง (ถ้าอยากทดสอบก่อน)
สร้างไฟล์ `.env` ที่โฟลเดอร์โปรเจกต์ (ไฟล์นี้ถูก gitignore ไม่หลุด GitHub):
```
HOST=localhost
PORT=3000
MONGODB_URI=mongodb+srv://popbaek_app:<password>@soundfish.xxxxx.mongodb.net/?appName=Soundfish
MONGODB_DB=popbaek
```
แล้ว `npm install && npm run dev` → เปิด http://localhost:3000

---

## ด่าน 3 — เช็คว่า PWA พร้อม (ก่อนทำ APK)

เปิดเว็บที่ deploy แล้วบน **Chrome เดสก์ท็อป** → กด **F12** → แท็บ **Application**
- **Manifest**: ต้องเห็นชื่อ "โป๊ะแตก", ไอคอน, display = standalone
- **Service Workers**: ต้องขึ้น "activated and is running"
- มุมขวาบน address bar จะมี**ไอคอนติดตั้ง** (⊕) = ผ่านเกณฑ์ PWA แล้ว

> ถ้า Service Worker ไม่ขึ้น: hard refresh (Ctrl+Shift+R) แล้วเช็คว่า `https://<url>/sw.js` เปิดแล้วเห็นโค้ด

---

## ด่าน 4 — แปลงเป็น APK

### วิธีที่ 1 — PWABuilder (ง่ายสุด ไม่ต้องเขียนโค้ด · แนะนำ)
1. ไป [pwabuilder.com](https://www.pwabuilder.com)
2. ใส่ URL เว็บที่ deploy → **Start**
3. มันจะวิเคราะห์ manifest + SW (ที่เราทำไว้แล้ว) → ให้คะแนน
4. กด **Package For Stores → Android**
5. ตั้งค่า:
   - **Package ID**: `com.popbaek.app` (ห้ามซ้ำใครบน Play Store ถ้าจะขึ้นสโตร์)
   - **App name**: โป๊ะแตก
   - **Signing key**: เลือก **Create new** (PWABuilder สร้าง key ให้ — **เก็บไฟล์ key + รหัสไว้ให้ดี** ใช้ตอนอัปเดตแอป)
6. **Download** → ได้ไฟล์ .zip ข้างในมี:
   - `app-release-signed.apk` ← **ไฟล์นี้แหละ แจกเพื่อนติดตั้งได้เลย**
   - `app-release.aab` ← สำหรับขึ้น Play Store
   - `assetlinks.json` + คู่มือ
   - ไฟล์ signing key (`signing.keystore` + รหัส) ← **เก็บไว้ อย่าทำหาย**

### 4.1 (สำคัญ) ซ่อนแถบ URL ในแอป — Digital Asset Links
ถ้าไม่ทำขั้นนี้ แอปจะโผล่แถบ address bar ของ Chrome ด้านบน (ดูไม่เหมือนแอปจริง)
1. เปิด `assetlinks.json` ที่ได้จาก PWABuilder
2. เอาไปวางที่โปรเจกต์: สร้างไฟล์ `public/.well-known/assetlinks.json` แล้ววางเนื้อหานั้น
3. commit + push + deploy ใหม่ → เช็คว่าเปิด `https://<url>/.well-known/assetlinks.json` ได้
4. ติดตั้ง APK ใหม่ → แถบ URL จะหายไป เป็นแอปเต็มจอ

### วิธีที่ 2 — Capacitor (คุมได้มากกว่า เช่น กันจอดับ/แจ้งเตือน)
เหมาะถ้าอยากใส่ฟีเจอร์ native เพิ่ม ต้องมี **Android Studio** ติดตั้งไว้
```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init "โป๊ะแตก" com.popbaek.app
# ตั้งให้ชี้ไปที่เว็บ deploy (แก้ capacitor.config.ts):
#   server: { url: "https://<your-url>", cleartext: false }
npx cap add android
npx cap open android      # เปิด Android Studio → Build → Build APK(s)
```
> บอกผมได้ถ้าจะใช้ทางนี้ เดี๋ยวตั้ง `capacitor.config.ts` + กันจอดับให้

---

## ด่าน 5 — แจก APK / ขึ้นสโตร์

### แจกไฟล์ตรง ๆ (ง่ายสุด ฟรี)
- ส่งไฟล์ `app-release-signed.apk` ให้เพื่อน (Line/Drive/แฟลชไดรฟ์)
- เพื่อนต้องเปิด **Settings → อนุญาตติดตั้งจากแหล่งที่ไม่รู้จัก** (Unknown sources) ตอนกดติดตั้ง
- เปิดแอป → เล่นได้เลย (แอปจะโหลดเว็บที่ deploy ไว้)

### ขึ้น Google Play Store (ถ้าอยากเป็นทางการ)
- สมัคร [Google Play Console](https://play.google.com/console) — เสีย **$25 ครั้งเดียวตลอดชีพ**
- อัปโหลดไฟล์ **.aab** (ไม่ใช่ apk) → กรอกข้อมูล + ภาพ → ส่งรีวิว (รอ 1-3 วัน)

---

## ปัญหาที่พบบ่อย

| อาการ | สาเหตุ / วิธีแก้ |
|-------|-----------------|
| แอปเปิดมาจอขาว/โหลดไม่ขึ้น | เว็บ deploy หลับ (Render free) — รอ ~50 วิ หรือย้ายไป Fly.io |
| แอปมีแถบ URL ด้านบน | ยังไม่ได้วาง `assetlinks.json` (ดูข้อ 4.1) หรือ fingerprint ไม่ตรง |
| เล่นแล้วห้องหาย/รีเซ็ต | เซิร์ฟเวอร์ restart (state อยู่ใน RAM) — ต้องรัน **1 instance** เท่านั้น |
| คำถามซ้ำข้ามเครื่องไม่ทำงาน | `MONGODB_URI` ไม่ได้ตั้งบนโฮสต์ หรือ Network Access ไม่ใช่ `0.0.0.0/0` |
| PWABuilder ฟ้อง manifest ไม่ผ่าน | เว็บยังไม่ HTTPS หรือ SW ไม่ทำงาน — เช็คด่าน 3 ก่อน |

---

## เช็กลิสต์สั้น ๆ
- [ ] เปลี่ยนรหัส DB user ใน Atlas (ด่าน 1)
- [ ] Deploy เว็บเป็น HTTPS + ตั้ง `MONGODB_URI` (ด่าน 2)
- [ ] เช็ค Manifest + Service Worker ผ่านใน Chrome (ด่าน 3)
- [ ] PWABuilder → download APK (ด่าน 4)
- [ ] วาง `assetlinks.json` ซ่อนแถบ URL (ด่าน 4.1)
- [ ] ส่ง `app-release-signed.apk` ให้เพื่อน (ด่าน 5)
