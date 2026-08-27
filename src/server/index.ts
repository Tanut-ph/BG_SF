/**
 * Custom server: รัน Next.js (App Router) + Socket.IO ในบริการเดียว
 * - Next จัดการหน้าเว็บ (และ HMR ในโหมด dev)
 * - Socket.IO จัดการ realtime ที่ path /socket.io
 *
 * หมายเหตุ: ในไฟล์ฝั่ง server ใช้ import แบบ relative (../shared/...)
 * เพราะ tsx ไม่ได้ผูก path alias "@/*" ของ tsconfig
 */
import { createServer } from "node:http";
import next from "next";
import { Server as SocketIOServer } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
} from "../shared/contracts";
import { registerRoomHandlers } from "./gateway";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOST ?? "localhost";
const port = Number(process.env.PORT ?? 3000);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

async function main() {
  await app.prepare();

  const httpServer = createServer((req, res) => {
    handle(req, res);
  });

  const io = new SocketIOServer<
    ClientToServerEvents,
    ServerToClientEvents,
    Record<string, never>,
    SocketData
  >(httpServer, {
    cors: { origin: dev ? "*" : false },
  });

  io.on("connection", (socket) => {
    console.log(`🔌 connected: ${socket.id}`);
    registerRoomHandlers(io, socket);
  });

  httpServer.listen(port, () => {
    console.log(`\n🎣 โป๊ะแตก — ready on http://${hostname}:${port}\n`);
  });
}

main().catch((err) => {
  console.error("server failed to start:", err);
  process.exit(1);
});
