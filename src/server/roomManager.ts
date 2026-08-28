/**
 * RoomManager — state ของห้องทั้งหมดในหน่วยความจำ (authoritative)
 * เก็บเฉพาะช่วง M1: ผู้เล่น + roster + host
 * ข้อมูลลับ (บทบาท/คำตอบ) จะเพิ่มใน M2
 */
import { randomUUID, randomBytes } from "node:crypto";
import {
  AVATARS,
  DISCUSSION_MAX,
  DISCUSSION_MIN,
  MIN_PLAYERS,
  NAME_MAX,
  READING_MAX,
  READING_MIN,
  type Phase,
  type PublicRoom,
  type Question,
  type RevealResult,
  type Role,
  type RolePayload,
  type RoomSettings,
  type RoundSummary,
} from "../shared/contracts";
import { pickRandom, QUESTIONS } from "./questions";

export const DEFAULT_READING_SECONDS = 40;
export const DEFAULT_DISCUSSION_SECONDS = 90;

function defaultSettings(): RoomSettings {
  return {
    readingSeconds: DEFAULT_READING_SECONDS,
    discussionSeconds: DEFAULT_DISCUSSION_SECONDS,
    allowFinish: true,
    hideQuestionFromFisherman: false,
  };
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(n)));

export interface Player {
  id: string;
  token: string;
  name: string;
  avatar: string;
  connected: boolean;
  ready: boolean;
  score: number;
  socketId: string | null;
}

export interface Round {
  roles: Map<string, Role>; // playerId -> Role
  prompt: string;
  answer: string; // ความลับ — เปิดให้เฉพาะปลาฟ้า
  caught: string[]; // playerId ปลาแดงที่ถูกจับ (เรียงลำดับ)
}

export interface Room {
  code: string;
  hostId: string;
  phase: Phase;
  players: Map<string, Player>;
  round: Round | null;
  deadline: number | null;
  reveal: RevealResult | null;
  settings: RoomSettings;
  questions: Question[];
  history: RoundSummary[];
  scoreboard: Map<string, number>; // name -> คะแนนสะสมข้ามเกม
  roundNo: number;
  createdAt: number;
}

const rooms = new Map<string, Room>();
/** socketId -> ตำแหน่งผู้เล่น เพื่อหาเร็วตอน disconnect */
const socketIndex = new Map<string, { code: string; playerId: string }>();

// ---- validation ----
export function sanitizeName(name: unknown): string {
  return typeof name === "string" ? name.trim().slice(0, NAME_MAX) : "";
}
export function isValidAvatar(avatar: unknown): avatar is string {
  return typeof avatar === "string" && (AVATARS as readonly string[]).includes(avatar);
}
export function isValidCode(code: unknown): code is string {
  return typeof code === "string" && /^\d{4}$/.test(code);
}

// ---- helpers ----
function genCode(): string {
  let code: string;
  do {
    code = String(Math.floor(1000 + Math.random() * 9000));
  } while (rooms.has(code));
  return code;
}

export function toPublicRoom(room: Room): PublicRoom {
  return {
    code: room.code,
    hostId: room.hostId,
    phase: room.phase,
    deadline: room.deadline,
    caughtIds: room.round?.caught ?? [],
    reveal: room.reveal,
    fishermanId: room.round ? playerIdByRole(room.round, "FISHERMAN") || null : null,
    settings: room.settings,
    questionCount: room.questions.length,
    history: room.history,
    scoreboard: [...room.scoreboard.entries()]
      .map(([name, score]) => ({ name, score }))
      .sort((a, b) => b.score - a.score),
    players: [...room.players.values()].map((p) => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      isHost: p.id === room.hostId,
      connected: p.connected,
      ready: p.ready,
      score: p.score,
    })),
  };
}

export function getRoom(code: string): Room | undefined {
  return rooms.get(code);
}

// ---- actions ----
export function createRoom(name: string, avatar: string, socketId: string) {
  const player: Player = {
    id: randomUUID(),
    token: randomBytes(16).toString("hex"),
    name,
    avatar,
    connected: true,
    ready: false,
    score: 0,
    socketId,
  };
  const room: Room = {
    code: genCode(),
    hostId: player.id,
    phase: "LOBBY",
    players: new Map([[player.id, player]]),
    round: null,
    deadline: null,
    reveal: null,
    settings: defaultSettings(),
    questions: [...QUESTIONS],
    history: [],
    scoreboard: new Map(),
    roundNo: 0,
    createdAt: Date.now(),
  };
  rooms.set(room.code, room);
  socketIndex.set(socketId, { code: room.code, playerId: player.id });
  return { room, player };
}

export function joinRoom(
  code: string,
  name: string,
  avatar: string,
  socketId: string
): { room: Room; player: Player } | { error: string } {
  const room = rooms.get(code);
  if (!room) return { error: "ไม่พบห้องนี้" };
  if (room.phase !== "LOBBY") return { error: "เกมเริ่มไปแล้ว เข้าไม่ได้" };

  const player: Player = {
    id: randomUUID(),
    token: randomBytes(16).toString("hex"),
    name,
    avatar,
    connected: true,
    ready: false,
    score: 0,
    socketId,
  };
  room.players.set(player.id, player);
  socketIndex.set(socketId, { code, playerId: player.id });
  return { room, player };
}

export function rejoin(
  code: string,
  token: string,
  socketId: string
): { room: Room; player: Player } | { error: string } {
  const room = rooms.get(code);
  if (!room) return { error: "ห้องนี้ปิดไปแล้ว" };
  const player = [...room.players.values()].find((p) => p.token === token);
  if (!player) return { error: "ไม่พบผู้เล่นในห้อง" };

  // ปลด index เก่าของ socket เดิม (ถ้ามี) แล้วผูกใหม่
  if (player.socketId) socketIndex.delete(player.socketId);
  player.socketId = socketId;
  player.connected = true;
  socketIndex.set(socketId, { code, playerId: player.id });
  return { room, player };
}

/** ตั้งสถานะพร้อมของผู้เล่น (ใช้ในห้องรอ) */
export function setReady(socketId: string, ready: boolean): Room | null {
  const at = socketIndex.get(socketId);
  if (!at) return null;
  const room = rooms.get(at.code);
  if (!room) return null;
  const player = room.players.get(at.playerId);
  if (!player) return null;
  player.ready = ready;
  return room;
}

/** ออกจากห้องถาวร (กดออกเอง) — ย้าย host ถ้าจำเป็น, ลบห้องถ้าว่าง */
export function leaveRoom(socketId: string): Room | null {
  const at = socketIndex.get(socketId);
  if (!at) return null;
  socketIndex.delete(socketId);
  const room = rooms.get(at.code);
  if (!room) return null;

  room.players.delete(at.playerId);

  if (room.players.size === 0) {
    rooms.delete(room.code);
    return null;
  }
  if (room.hostId === at.playerId) {
    // ย้าย host ให้คนแรกที่ยังเชื่อมต่ออยู่ (ไม่มีก็คนแรกที่เหลือ)
    const next =
      [...room.players.values()].find((p) => p.connected) ??
      [...room.players.values()][0];
    room.hostId = next.id;
  }
  return room;
}

/** หลุดการเชื่อมต่อ (จอล็อก/เน็ตหลุด) — คงที่นั่งไว้ก่อน (ให้ rejoin/ลบทีหลังด้วย grace) */
export function markDisconnected(socketId: string): Room | null {
  const at = socketIndex.get(socketId);
  if (!at) return null;
  socketIndex.delete(socketId);
  const room = rooms.get(at.code);
  if (!room) return null;
  const player = room.players.get(at.playerId);
  if (player) {
    player.connected = false;
    player.socketId = null;
  }
  return room;
}

/** โฮสต์เตะผู้เล่นออก — คืน socketId ของคนที่ถูกเตะ (เพื่อแจ้ง/ตัดการเชื่อมต่อ) */
export function kickPlayer(
  room: Room,
  targetId: string
): { room: Room; kickedSocketId: string | null } | { error: string } {
  if (targetId === room.hostId) return { error: "เตะโฮสต์ไม่ได้" };
  const target = room.players.get(targetId);
  if (!target) return { error: "ไม่พบผู้เล่น" };
  const kickedSocketId = target.socketId;
  room.players.delete(targetId);
  if (kickedSocketId) socketIndex.delete(kickedSocketId);
  return { room, kickedSocketId };
}

/** ลบผู้เล่นที่หลุดออกถาวร (หลังหมด grace แล้วยังไม่กลับ) — คืนห้อง (null ถ้าห้องถูกลบ) */
export function removeIfStillDisconnected(code: string, playerId: string): Room | null {
  const room = rooms.get(code);
  if (!room) return null;
  const player = room.players.get(playerId);
  if (!player || player.connected) return null; // กลับมาแล้ว — ไม่ลบ
  room.players.delete(playerId);
  if (room.players.size === 0) {
    rooms.delete(code);
    return null;
  }
  if (room.hostId === playerId) {
    const next =
      [...room.players.values()].find((p) => p.connected) ??
      [...room.players.values()][0];
    room.hostId = next.id;
  }
  return room;
}

// ---- game flow (M2) ----

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** เช็คว่าเริ่มเกมได้ไหม: อยู่ใน LOBBY, ผู้เล่นครบ, และทุกคนที่ไม่ใช่โฮสต์กดพร้อม */
export function canStartGame(room: Room): boolean {
  if (room.phase !== "LOBBY") return false;
  if (room.players.size < MIN_PLAYERS) return false;
  const others = [...room.players.values()].filter((p) => p.id !== room.hostId);
  return others.length > 0 && others.every((p) => p.ready);
}

/** สุ่มบทบาท (ชาวประมง 1 / ปลาฟ้า 1 / ปลาแดงที่เหลือ) + แจกคำถาม + เข้าสู่ READING */
export function startRound(room: Room): Round {
  const ids = shuffle([...room.players.keys()]);
  const roles = new Map<string, Role>();
  roles.set(ids[0], "FISHERMAN");
  roles.set(ids[1], "BLUE");
  for (let i = 2; i < ids.length; i++) roles.set(ids[i], "RED");

  const pool = room.questions.length > 0 ? room.questions : QUESTIONS;
  const q = pickRandom(pool);
  room.round = { roles, prompt: q.prompt, answer: q.answer, caught: [] };
  room.reveal = null;
  room.roundNo += 1;
  room.phase = "READING";
  room.deadline = Date.now() + room.settings.readingSeconds * 1000;
  return room.round;
}

/** payload บทบาทของผู้เล่นคนหนึ่ง (คำตอบจริงเฉพาะปลาฟ้า) */
export function rolePayloadFor(room: Room, playerId: string): RolePayload | null {
  if (!room.round) return null;
  const role = room.round.roles.get(playerId);
  if (!role) return null;
  const hideFromFisherman =
    role === "FISHERMAN" && room.settings.hideQuestionFromFisherman;
  return {
    role,
    prompt: hideFromFisherman ? null : room.round.prompt,
    // ปลาทุกตัว (ฟ้า+แดง) เห็นคำตอบจริง — ชาวประมงไม่เห็น
    answer: role === "FISHERMAN" ? null : room.round.answer,
  };
}

/** หมดเวลาอ่านโจทย์ → เข้าสู่ช่วงคุยกัน (ไม่จับเวลา — โฮสต์คุมจังหวะเอง) */
export function endReading(room: Room): boolean {
  if (room.phase !== "READING") return false;
  room.phase = "DISCUSSION";
  room.deadline = null;
  return true;
}

/** หมดเวลาคุยกัน → เข้าสู่ช่วงทาย (ไม่มี timer — ชาวประมงเป็นคนคุมจังหวะ) */
export function endDiscussion(room: Room): boolean {
  if (room.phase !== "DISCUSSION") return false;
  room.phase = "GUESSING";
  room.deadline = null;
  return true;
}

function roleOf(round: Round, id: string): Role | undefined {
  return round.roles.get(id);
}

function playerIdByRole(round: Round, role: Role): string {
  for (const [id, r] of round.roles) if (r === role) return id;
  return "";
}

/**
 * ชาวประมงจับผู้เล่นหนึ่งคน
 * - จับปลาแดง → เก็บไว้ใน caught, ยังไม่จบ
 * - จับปลาฟ้า → "โป๊ะแตก" (bust) จบรอบ
 */
export function pickGuess(
  room: Room,
  targetId: string
): { role: Role; bust: boolean } | { error: string } {
  const round = room.round;
  if (room.phase !== "GUESSING" || !round) return { error: "ยังไม่ถึงช่วงทาย" };
  const role = roleOf(round, targetId);
  if (!role || role === "FISHERMAN") return { error: "เลือกผู้เล่นไม่ถูกต้อง" };
  if (round.caught.includes(targetId)) return { error: "คนนี้ถูกจับไปแล้ว" };

  if (role === "RED") {
    round.caught.push(targetId);
    return { role: "RED", bust: false };
  }
  return { role: "BLUE", bust: true };
}

/**
 * จบรอบและคิดคะแนน (หลัก "ปลาที่รอดได้คนละ = จำนวนตัวที่รอด")
 * - bank: กดจบเอง → ชาวประมง +1/ปลาแดงที่จับได้ · ปลาฟ้ารอด
 * - bust: โดนปลาฟ้าทั้งที่ยังมีปลาแดงเหลือ → ชาวประมง 0 · ปลาฟ้ารอด
 * - sweep: จับปลาฟ้าเป็นตัวสุดท้าย (จับแดงครบแล้ว) → ชาวประมง +1/ปลาแดง · ไม่มีใครรอด (ปลาฟ้าไม่ได้แต้ม)
 * - ปลาที่รอด (ที่ยังไม่ถูกจับ) ได้คนละ = จำนวนปลาที่รอด · ปลาแดงที่ถูกจับ = 0
 */
export function finishRound(
  room: Room,
  outcome: "bust" | "bank" | "sweep"
): RevealResult | null {
  const round = room.round;
  if (!round) return null;

  const players = [...room.players.values()];
  const fishermanId = playerIdByRole(round, "FISHERMAN");
  const blueId = playerIdByRole(round, "BLUE");

  const fishIds = players
    .map((p) => p.id)
    .filter((id) => roleOf(round, id) !== "FISHERMAN");
  const uncaught = fishIds.filter((id) => !round.caught.includes(id));
  // sweep: ปลาฟ้าถูกจับปิดท้าย → ไม่นับเป็นรอด
  const blueSurvives = outcome !== "sweep";
  const aliveFish = uncaught.filter((id) => blueSurvives || id !== blueId);
  const A = aliveFish.length;

  const roundPoints: Record<string, number> = {};
  for (const p of players) roundPoints[p.id] = 0;
  for (const id of aliveFish) roundPoints[id] = A;
  roundPoints[fishermanId] = outcome === "bust" ? 0 : round.caught.length;

  // สะสมคะแนน: ต่อผู้เล่น (session) + ต่อชื่อ (ข้ามเกม)
  for (const p of players) {
    const gained = roundPoints[p.id] ?? 0;
    p.score += gained;
    room.scoreboard.set(p.name, (room.scoreboard.get(p.name) ?? 0) + gained);
  }

  const roles: Record<string, Role> = {};
  for (const [id, r] of round.roles) roles[id] = r;

  const reveal: RevealResult = {
    outcome,
    fishermanId,
    blueId,
    answer: round.answer,
    roles,
    caughtIds: [...round.caught],
    roundPoints,
  };
  room.reveal = reveal;
  room.phase = "REVEAL";
  room.deadline = null;

  // บันทึกสรุปรอบไว้ในประวัติ
  room.history.unshift({
    round: room.roundNo,
    outcome,
    caughtCount: round.caught.length,
    fishermanName: room.players.get(fishermanId)?.name ?? "?",
    blueName: room.players.get(blueId)?.name ?? "?",
  });
  return reveal;
}

// ---- settings + คลังคำถาม (M4) ----
export function updateSettings(room: Room, partial: Partial<RoomSettings>): void {
  if (typeof partial.readingSeconds === "number") {
    room.settings.readingSeconds = clamp(partial.readingSeconds, READING_MIN, READING_MAX);
  }
  if (typeof partial.discussionSeconds === "number") {
    room.settings.discussionSeconds = clamp(partial.discussionSeconds, DISCUSSION_MIN, DISCUSSION_MAX);
  }
  if (typeof partial.allowFinish === "boolean") {
    room.settings.allowFinish = partial.allowFinish;
  }
  if (typeof partial.hideQuestionFromFisherman === "boolean") {
    room.settings.hideQuestionFromFisherman = partial.hideQuestionFromFisherman;
  }
}

export function addQuestion(room: Room, prompt: unknown, answer: unknown): Question[] | { error: string } {
  const p = typeof prompt === "string" ? prompt.trim() : "";
  const a = typeof answer === "string" ? answer.trim() : "";
  if (!p || !a) return { error: "ต้องมีทั้งคำถามและคำตอบ" };
  room.questions.push({ prompt: p.slice(0, 200), answer: a.slice(0, 200) });
  return room.questions;
}

export function removeQuestion(room: Room, index: number): Question[] | { error: string } {
  if (index < 0 || index >= room.questions.length) return { error: "ไม่พบคำถาม" };
  if (room.questions.length <= 1) return { error: "ต้องมีคำถามอย่างน้อย 1 ข้อ" };
  room.questions.splice(index, 1);
  return room.questions;
}

/** ผู้เล่นคนนี้เป็นชาวประมงของรอบปัจจุบันหรือไม่ */
export function isFisherman(room: Room, playerId: string): boolean {
  return !!room.round && roleOf(room.round, playerId) === "FISHERMAN";
}

/** ยกเลิกรอบที่กำลังเล่นอยู่ กลับห้องรอ — คงคะแนน/ประวัติ/ตั้งค่าไว้ (ใช้ตอนมีคนออกกลางเกม) */
export function abortRound(room: Room): boolean {
  if (room.phase === "LOBBY" || room.phase === "REVEAL") return false;
  room.phase = "LOBBY";
  room.round = null;
  room.deadline = null;
  room.reveal = null;
  for (const p of room.players.values()) p.ready = false;
  return true;
}

/** รีเซ็ตกลับห้องรอ (จบเกม — เคลียร์รอบ+ประวัติ+คะแนน แต่คงตั้งค่า+คลังคำถามไว้) */
export function resetToLobby(room: Room): void {
  room.phase = "LOBBY";
  room.round = null;
  room.deadline = null;
  room.reveal = null;
  room.history = [];
  room.roundNo = 0;
  for (const p of room.players.values()) {
    p.ready = false;
    p.score = 0;
  }
}

export { MIN_PLAYERS };
