# โป๊ะแตก — custom server (Next.js + Socket.IO) ในอิมเมจเดียว
# ต้องรันเป็น process ค้าง (รองรับ WebSocket) — ใช้ไม่ได้บน serverless เช่น Vercel functions
FROM node:22-slim

WORKDIR /app

# ติดตั้ง dependencies ทั้งหมด (รวม dev — จำเป็นตอน build: tailwind/postcss/tsx)
COPY package*.json ./
RUN npm ci

# build แอป
COPY . .
RUN npm run build

# รันแบบ production (server รันผ่าน tsx)
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
CMD ["npm", "run", "start"]
