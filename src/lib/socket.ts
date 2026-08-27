"use client";

import { io, type Socket } from "socket.io-client";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "@/shared/contracts";

export type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: GameSocket | null = null;

/**
 * คืน singleton socket (ต่อกลับไปยัง origin เดียวกับที่เสิร์ฟหน้าเว็บ)
 * เรียกจาก client component เท่านั้น
 */
export function getSocket(): GameSocket {
  if (!socket) {
    socket = io({
      autoConnect: true,
      // path เริ่มต้น /socket.io ตรงกับ server
    });
  }
  return socket;
}
