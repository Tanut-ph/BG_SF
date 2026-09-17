/**
 * Gateway — ผูก event ของ socket แต่ละตัวเข้ากับ RoomManager
 * เรียกจาก index.ts ตอน io.on("connection")
 */
import type { Server, Socket } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
} from "../shared/contracts";
import {
  abortRound,
  addQuestion,
  canStartGame,
  connectedCount,
  createRoom,
  endDiscussion,
  endReading,
  finishRound,
  getRoom,
  isFisherman,
  isInRound,
  isValidAvatar,
  isValidCode,
  joinRoom,
  kickPlayer,
  leaveRoom,
  markDisconnected,
  MIN_PLAYERS,
  pickGuess,
  rejoin,
  removeQuestion,
  resetToLobby,
  rolePayloadFor,
  sanitizeName,
  setReady,
  startRound,
  toPublicRoom,
  updateSettings,
  type Room,
} from "./roomManager";

/** timer ของ phase ต่อห้อง (server เป็นเจ้าของเวลา กัน drift/โกง) */
const phaseTimers = new Map<string, NodeJS.Timeout>();

type IO = Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;
type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;

function bindSocket(socket: GameSocket, code: string, playerId: string) {
  socket.data.roomCode = code;
  socket.data.playerId = playerId;
  socket.join(code);
}

function broadcastRoom(io: IO, room: Room) {
  io.to(room.code).emit("room:updated", toPublicRoom(room));
}

/** ส่งบทบาท+คำถามให้ผู้เล่นแต่ละคนแบบแยกรายคน (ข้อมูลลับ ไม่ broadcast) */
function dealRoles(io: IO, room: Room) {
  for (const player of room.players.values()) {
    if (!player.socketId) continue;
    const payload = rolePayloadFor(room, player.id);
    if (payload) io.to(player.socketId).emit("role:assigned", payload);
  }
}

function clearPhaseTimer(code: string) {
  const t = phaseTimers.get(code);
  if (t) {
    clearTimeout(t);
    phaseTimers.delete(code);
  }
}

/**
 * ตั้งเวลาให้ phase ปัจจุบันจบเองเมื่อถึง deadline แล้วเลื่อน phase ต่อ:
 * READING → DISCUSSION (ตั้ง timer ต่อ) ; DISCUSSION → GUESSING (ไม่มี timer)
 */
function schedulePhaseEnd(io: IO, code: string, deadline: number) {
  clearPhaseTimer(code);
  const ms = Math.max(0, deadline - Date.now());
  const t = setTimeout(() => {
    phaseTimers.delete(code);
    const room = getRoom(code);
    if (!room) return;
    if (room.phase === "READING") {
      if (endReading(room)) {
        broadcastRoom(io, room);
        if (room.deadline) schedulePhaseEnd(io, code, room.deadline);
      }
    } else if (room.phase === "DISCUSSION") {
      if (endDiscussion(room)) broadcastRoom(io, room);
    }
  }, ms);
  phaseTimers.set(code, t);
}

/** เริ่มรอบ: สุ่มบทบาท + แจกคำถามลับ + เข้าสู่ READING พร้อม timer */
function beginRound(io: IO, room: Room) {
  startRound(room);
  dealRoles(io, room);
  broadcastRoom(io, room);
  if (room.deadline) schedulePhaseEnd(io, room.code, room.deadline);
}

function requireHost(socket: GameSocket): Room | null {
  const code = socket.data.roomCode;
  if (!code) return null;
  const room = getRoom(code);
  if (!room || room.hostId !== socket.data.playerId) return null;
  return room;
}

export function registerRoomHandlers(io: IO, socket: GameSocket) {
  socket.on("room:create", ({ name, avatar }, ack) => {
    const cleanName = sanitizeName(name);
    if (!cleanName) return ack({ ok: false, error: "กรุณาใส่ชื่อ" });
    if (!isValidAvatar(avatar)) return ack({ ok: false, error: "ตัวปลาไม่ถูกต้อง" });

    const { room, player } = createRoom(cleanName, avatar, socket.id);
    bindSocket(socket, room.code, player.id);
    ack({
      ok: true,
      data: { playerId: player.id, token: player.token, room: toPublicRoom(room) },
    });
  });

  socket.on("room:join", ({ code, name, avatar }, ack) => {
    if (!isValidCode(code)) return ack({ ok: false, error: "รหัสห้องต้องเป็นเลข 4 หลัก" });
    const cleanName = sanitizeName(name);
    if (!cleanName) return ack({ ok: false, error: "กรุณาใส่ชื่อ" });
    if (!isValidAvatar(avatar)) return ack({ ok: false, error: "ตัวปลาไม่ถูกต้อง" });

    const result = joinRoom(code, cleanName, avatar, socket.id);
    if ("error" in result) return ack({ ok: false, error: result.error });

    bindSocket(socket, code, result.player.id);
    ack({
      ok: true,
      data: { playerId: result.player.id, token: result.player.token, room: toPublicRoom(result.room) },
    });
    broadcastRoom(io, result.room);
  });

  socket.on("room:rejoin", ({ code, token }, ack) => {
    if (!isValidCode(code)) return ack({ ok: false, error: "รหัสห้องไม่ถูกต้อง" });
    const result = rejoin(code, token, socket.id);
    if ("error" in result) return ack({ ok: false, error: result.error });

    bindSocket(socket, code, result.player.id);
    ack({ ok: true, data: { playerId: result.player.id, room: toPublicRoom(result.room) } });
    broadcastRoom(io, result.room);

    // ถ้ากำลังอยู่ในรอบ ส่งบทบาทลับให้คนที่เพิ่ง rejoin อีกครั้ง
    const payload = rolePayloadFor(result.room, result.player.id);
    if (payload) socket.emit("role:assigned", payload);
  });

  socket.on("player:ready", ({ ready }, ack) => {
    const room = setReady(socket.id, Boolean(ready));
    if (!room) return ack?.({ ok: false, error: "ไม่พบผู้เล่นในห้อง" });
    ack?.({ ok: true, data: null });
    broadcastRoom(io, room);
  });

  socket.on("game:start", (ack) => {
    const room = requireHost(socket);
    if (!room) return ack?.({ ok: false, error: "เฉพาะโฮสต์เท่านั้น" });
    if (!canStartGame(room)) return ack?.({ ok: false, error: "ยังเริ่มไม่ได้ (ต้องครบคน + ทุกคนพร้อม)" });
    beginRound(io, room);
    ack?.({ ok: true, data: null });
  });

  socket.on("game:nextRound", (ack) => {
    const room = requireHost(socket);
    if (!room) return ack?.({ ok: false, error: "เฉพาะโฮสต์เท่านั้น" });
    // หัวห้องเริ่มรอบใหม่ได้ทุกช่วง (ยกเว้นในห้องรอ — ใช้ปุ่มเริ่มเกม)
    if (room.phase === "LOBBY") return ack?.({ ok: false, error: "อยู่ในห้องรอ ใช้ปุ่มเริ่มเกม" });
    if (connectedCount(room) < MIN_PLAYERS) {
      resetToLobby(room);
      io.to(room.code).emit("room:notice", "ผู้เล่นออนไลน์ไม่พอ กลับสู่ห้องรอ");
      broadcastRoom(io, room);
      return ack?.({ ok: false, error: "ผู้เล่นออนไลน์ไม่พอ" });
    }
    beginRound(io, room);
    ack?.({ ok: true, data: null });
  });

  socket.on("game:skipReading", (ack) => {
    const room = requireHost(socket);
    if (!room) return ack?.({ ok: false, error: "เฉพาะโฮสต์เท่านั้น" });
    if (endReading(room)) {
      broadcastRoom(io, room);
      if (room.deadline) schedulePhaseEnd(io, room.code, room.deadline);
    }
    ack?.({ ok: true, data: null });
  });

  socket.on("game:skipDiscussion", (ack) => {
    // ชาวประมงเป็นคนคุมการเริ่มช่วงทาย (โฮสต์กดได้ด้วยเป็นตัวสำรอง)
    const code = socket.data.roomCode;
    const room = code ? getRoom(code) : undefined;
    if (!room) return ack?.({ ok: false, error: "ไม่พบห้อง" });
    const pid = socket.data.playerId ?? "";
    if (room.hostId !== pid && !isFisherman(room, pid)) {
      return ack?.({ ok: false, error: "เฉพาะชาวประมงเท่านั้น" });
    }
    clearPhaseTimer(room.code);
    if (endDiscussion(room)) broadcastRoom(io, room);
    ack?.({ ok: true, data: null });
  });

  socket.on("guess:pick", ({ targetId }, ack) => {
    const code = socket.data.roomCode;
    const room = code ? getRoom(code) : undefined;
    if (!room) return ack?.({ ok: false, error: "ไม่พบห้อง" });
    if (!isFisherman(room, socket.data.playerId ?? "")) {
      return ack?.({ ok: false, error: "เฉพาะชาวประมงเท่านั้น" });
    }
    const result = pickGuess(room, targetId);
    if ("error" in result) return ack?.({ ok: false, error: result.error });

    if (result.role === "BLUE") {
      // จับปลาฟ้า: ถ้ายังมีปลาแดงเหลือ = โป๊ะแตก(bust); ถ้าจับแดงครบแล้ว = กวาดเรียบ(sweep)
      const round = room.round!;
      const anyRedUncaught = [...round.roles].some(
        ([id, r]) => r === "RED" && !round.caught.includes(id)
      );
      finishRound(room, anyRedUncaught ? "bust" : "sweep");
    }
    broadcastRoom(io, room);
    ack?.({ ok: true, data: null });
  });

  socket.on("guess:finish", (ack) => {
    const code = socket.data.roomCode;
    const room = code ? getRoom(code) : undefined;
    if (!room) return ack?.({ ok: false, error: "ไม่พบห้อง" });
    if (!isFisherman(room, socket.data.playerId ?? "")) {
      return ack?.({ ok: false, error: "เฉพาะชาวประมงเท่านั้น" });
    }
    if (room.phase !== "GUESSING") return ack?.({ ok: false, error: "ยังไม่ถึงช่วงทาย" });
    finishRound(room, "bank"); // กดจบเอง
    broadcastRoom(io, room);
    ack?.({ ok: true, data: null });
  });

  socket.on("game:reset", (ack) => {
    const room = requireHost(socket);
    if (!room) return ack?.({ ok: false, error: "เฉพาะโฮสต์เท่านั้น" });
    clearPhaseTimer(room.code);
    resetToLobby(room);
    broadcastRoom(io, room);
    ack?.({ ok: true, data: null });
  });

  socket.on("game:abort", (ack) => {
    const room = requireHost(socket);
    if (!room) return ack?.({ ok: false, error: "เฉพาะโฮสต์เท่านั้น" });
    clearPhaseTimer(room.code);
    if (abortRound(room)) {
      io.to(room.code).emit("room:notice", "โฮสต์ยกเลิกรอบ กลับสู่ห้องรอ");
      broadcastRoom(io, room);
    }
    ack?.({ ok: true, data: null });
  });

  socket.on("settings:update", (partial, ack) => {
    const room = requireHost(socket);
    if (!room) return ack?.({ ok: false, error: "เฉพาะโฮสต์เท่านั้น" });
    if (room.phase !== "LOBBY") return ack?.({ ok: false, error: "ปรับตั้งค่าได้เฉพาะในห้องรอ" });
    updateSettings(room, partial);
    broadcastRoom(io, room);
    ack?.({ ok: true, data: null });
  });

  socket.on("questions:list", (ack) => {
    const room = requireHost(socket);
    if (!room) return ack({ ok: false, error: "เฉพาะโฮสต์เท่านั้น" });
    ack({ ok: true, data: room.questions });
  });

  socket.on("question:add", ({ prompt, answer }, ack) => {
    const room = requireHost(socket);
    if (!room) return ack?.({ ok: false, error: "เฉพาะโฮสต์เท่านั้น" });
    const result = addQuestion(room, prompt, answer);
    if ("error" in result) return ack?.({ ok: false, error: result.error });
    broadcastRoom(io, room);
    ack?.({ ok: true, data: result });
  });

  socket.on("question:remove", ({ index }, ack) => {
    const room = requireHost(socket);
    if (!room) return ack?.({ ok: false, error: "เฉพาะโฮสต์เท่านั้น" });
    const result = removeQuestion(room, index);
    if ("error" in result) return ack?.({ ok: false, error: result.error });
    broadcastRoom(io, room);
    ack?.({ ok: true, data: result });
  });

  socket.on("room:leave", (ack) => {
    const code = socket.data.roomCode;
    const room0 = code ? getRoom(code) : undefined;
    const wasInRound = room0 ? isInRound(room0, socket.data.playerId ?? "") : false;
    const room = leaveRoom(socket.id);
    if (code) socket.leave(code);
    socket.data.roomCode = undefined;
    socket.data.playerId = undefined;
    ack?.({ ok: true, data: null });
    if (room) {
      // ยกเลิกรอบเฉพาะเมื่อคนที่ออกมีบทบาทในรอบ (ผู้ชมออกไม่กระทบ)
      if (wasInRound) {
        clearPhaseTimer(room.code);
        if (abortRound(room)) {
          io.to(room.code).emit("room:notice", "รอบถูกยกเลิก: มีผู้เล่นออกกลางเกม");
        }
      }
      broadcastRoom(io, room);
    }
  });

  socket.on("player:kick", ({ targetId }, ack) => {
    const room = requireHost(socket);
    if (!room) return ack?.({ ok: false, error: "เฉพาะโฮสต์เท่านั้น" });
    const wasInRound = isInRound(room, targetId);
    const result = kickPlayer(room, targetId);
    if ("error" in result) return ack?.({ ok: false, error: result.error });

    // แจ้งคนที่ถูกเตะ + ดันออกจาก socket room
    if (result.kickedSocketId) {
      io.to(result.kickedSocketId).emit("room:kicked", "โฮสต์เตะคุณออกจากห้อง");
      io.sockets.sockets.get(result.kickedSocketId)?.leave(room.code);
    }
    // ยกเลิกรอบเฉพาะเมื่อคนที่ถูกเตะมีบทบาทในรอบ
    if (wasInRound) {
      clearPhaseTimer(room.code);
      if (abortRound(room)) {
        io.to(room.code).emit("room:notice", "รอบถูกยกเลิก: โฮสต์เตะผู้เล่นออก");
      }
    }
    broadcastRoom(io, room);
    ack?.({ ok: true, data: null });
  });

  socket.on("disconnect", (reason) => {
    // แค่ทำเครื่องหมาย "หลุด" — ไม่ลบ ไม่ยกเลิกรอบ ให้คนที่เหลือเล่นต่อได้
    // (คนหลุดกลับเข้ามาด้วย token ได้, หรือจะถูกตัดออกตอนขึ้นรอบใหม่)
    const room = markDisconnected(socket.id);
    if (room) broadcastRoom(io, room);
    console.log(`❌ disconnected: ${socket.id} (${reason})`);
  });
}
