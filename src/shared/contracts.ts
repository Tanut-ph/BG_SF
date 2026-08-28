/**
 * สัญญาการสื่อสารร่วมระหว่าง client และ server (single source of truth)
 * อ้างอิงจาก docs/architecture.md
 *
 * M1: room create / join / rejoin / leave + roster realtime
 */

// ---- โดเมนหลัก ----
export type Phase = "LOBBY" | "READING" | "DISCUSSION" | "GUESSING" | "REVEAL";

/** ชาวประมง / ปลาฟ้า (รู้คำตอบจริง) / ปลาแดง (ต้องแต่งคำตอบเอง) */
export type Role = "FISHERMAN" | "BLUE" | "RED";

/** ตัวปลาที่เลือกได้ (แหล่งเดียว ใช้ทั้ง client และ server) */
export const AVATARS = ["🐟", "🐠", "🐡", "🦈", "🐬", "🦑", "🐙", "🦀"] as const;
export type Avatar = (typeof AVATARS)[number];

export const NAME_MAX = 16;
export const MIN_PLAYERS = 3;

// ขอบเขตการตั้งเวลา (วินาที)
export const READING_MIN = 10;
export const READING_MAX = 120;
export const DISCUSSION_MIN = 30;
export const DISCUSSION_MAX = 300;

export interface Question {
  prompt: string;
  answer: string;
}

export interface RoomSettings {
  readingSeconds: number;
  discussionSeconds: number;
  allowFinish: boolean; // เปิดปุ่ม "จบการจับ" ให้ชาวประมงหรือไม่
  hideQuestionFromFisherman: boolean; // ซ่อนคำถามจากชาวประมง (โหมดยาก)
}

/** สรุปผลแต่ละรอบ (สำหรับหน้าประวัติ) */
export interface RoundSummary {
  round: number;
  outcome: "bust" | "bank" | "sweep";
  caughtCount: number;
  fishermanName: string;
  blueName: string;
}

// ---- shape ที่ส่งออกไปให้ client (ไม่มีข้อมูลลับ) ----
export interface PublicPlayer {
  id: string;
  name: string;
  avatar: string;
  isHost: boolean;
  connected: boolean;
  ready: boolean;
  score: number; // คะแนนสะสมข้ามรอบ
}

export interface PublicRoom {
  code: string;
  hostId: string;
  phase: Phase;
  players: PublicPlayer[];
  /** เวลาสิ้นสุด timer ของ phase ปัจจุบัน (absolute ms) — null ถ้าไม่มีจับเวลา */
  deadline: number | null;
  /** playerId ของปลาแดงที่ถูกจับแล้วในช่วงทาย (เปิดเผยได้ ไม่ใช่ความลับ) */
  caughtIds: string[];
  /** ผลเฉลย — มีค่าเฉพาะ phase REVEAL */
  reveal: RevealResult | null;
  /** playerId ของชาวประมงรอบปัจจุบัน (เปิดเผยให้ทุกคนรู้) — null ตอนอยู่ห้องรอ */
  fishermanId: string | null;
  settings: RoomSettings;
  questionCount: number; // จำนวนคำถามในคลัง (ตัวคำถามจริงส่งเฉพาะโฮสต์)
  history: RoundSummary[];
  /** คะแนนสะสมต่อชื่อ (ข้ามหลายเกม) เรียงมาก→น้อย */
  scoreboard: { name: string; score: number }[];
}

/** ผลเฉลยตอนจบรอบ (เปิดเผยทั้งหมด — round จบแล้ว) */
export interface RevealResult {
  // โดนปลาฟ้า(ยังมีแดงเหลือ) / กดจบเอง / จับปลาฟ้าเป็นตัวสุดท้าย(กวาดเรียบ)
  outcome: "bust" | "bank" | "sweep";
  fishermanId: string;
  blueId: string;
  answer: string;
  roles: Record<string, Role>; // playerId -> Role
  caughtIds: string[]; // ปลาแดงที่ถูกจับ (เรียงลำดับ)
  roundPoints: Record<string, number>; // playerId -> คะแนนที่ได้รอบนี้
}

/** ข้อมูลบทบาทที่ส่งให้ผู้เล่นแต่ละคน (ข้อมูลลับ — ส่งแยกรายคน) */
export interface RolePayload {
  role: Role;
  /** คำถาม — null ถ้าถูกซ่อน (เช่น ซ่อนจากชาวประมง) */
  prompt: string | null;
  /** คำตอบจริง — ส่งเฉพาะปลาฟ้าเท่านั้น (คนอื่นเป็น null) */
  answer: string | null;
}

// ---- ผลลัพธ์แบบ ok/error สำหรับ ack ----
export type Result<T> = { ok: true; data: T } | { ok: false; error: string };

export interface JoinedRoom {
  playerId: string;
  token: string;
  room: PublicRoom;
}

export interface RejoinedRoom {
  playerId: string;
  room: PublicRoom;
}

// ---- แผนที่ event แบบมี type (ใช้กับ socket.io generics) ----

/** event ที่ client ส่งไปหา server */
export interface ClientToServerEvents {
  "room:create": (
    payload: { name: string; avatar: string },
    ack: (res: Result<JoinedRoom>) => void
  ) => void;
  "room:join": (
    payload: { code: string; name: string; avatar: string },
    ack: (res: Result<JoinedRoom>) => void
  ) => void;
  "room:rejoin": (
    payload: { code: string; token: string },
    ack: (res: Result<RejoinedRoom>) => void
  ) => void;
  "room:leave": (ack?: (res: Result<null>) => void) => void;
  "player:ready": (
    payload: { ready: boolean },
    ack?: (res: Result<null>) => void
  ) => void;
  /** โฮสต์เริ่มเกม (สุ่มบทบาท + แจกคำถาม) */
  "game:start": (ack?: (res: Result<null>) => void) => void;
  /** โฮสต์ข้ามเวลาอ่านโจทย์ */
  "game:skipReading": (ack?: (res: Result<null>) => void) => void;
  /** โฮสต์ข้ามเวลาคุยกัน → เข้าช่วงทาย */
  "game:skipDiscussion": (ack?: (res: Result<null>) => void) => void;
  /** โฮสต์เริ่มรอบใหม่ (จากหน้าเฉลย) */
  "game:nextRound": (ack?: (res: Result<null>) => void) => void;
  /** โฮสต์รีเซ็ตกลับห้องรอ (จบเกม) */
  "game:reset": (ack?: (res: Result<null>) => void) => void;
  /** ชาวประมงเลือกจับผู้เล่นทีละคน (เรียกซ้ำได้) */
  "guess:pick": (
    payload: { targetId: string },
    ack?: (res: Result<null>) => void
  ) => void;
  /** ชาวประมงกดจบการจับเอง (เก็บแต้ม) */
  "guess:finish": (ack?: (res: Result<null>) => void) => void;
  /** โฮสต์ปรับตั้งค่าห้อง */
  "settings:update": (
    payload: Partial<RoomSettings>,
    ack?: (res: Result<null>) => void
  ) => void;
  /** โฮสต์ขอรายการคำถามในคลัง (มีคำตอบ — ส่งให้โฮสต์เท่านั้น) */
  "questions:list": (ack: (res: Result<Question[]>) => void) => void;
  /** โฮสต์เพิ่มคำถาม */
  "question:add": (
    payload: Question,
    ack?: (res: Result<Question[]>) => void
  ) => void;
  /** โฮสต์ลบคำถามตาม index */
  "question:remove": (
    payload: { index: number },
    ack?: (res: Result<Question[]>) => void
  ) => void;
  /** โฮสต์ยกเลิกรอบปัจจุบัน กลับห้องรอ (คงคะแนน/ประวัติไว้) */
  "game:abort": (ack?: (res: Result<null>) => void) => void;
  /** โฮสต์เตะผู้เล่นออกจากห้อง */
  "player:kick": (
    payload: { targetId: string },
    ack?: (res: Result<null>) => void
  ) => void;
}

/** event ที่ server ส่งมาหา client */
export interface ServerToClientEvents {
  "room:updated": (room: PublicRoom) => void;
  /** ส่งบทบาท+คำถามให้ผู้เล่นรายคน (ข้อมูลลับ) */
  "role:assigned": (payload: RolePayload) => void;
  /** ข้อความแจ้งเตือนชั่วคราว (เช่น รอบถูกยกเลิก) */
  "room:notice": (message: string) => void;
  /** ผู้เล่นถูกเตะออก — client เด้งกลับหน้าแรก */
  "room:kicked": (reason: string) => void;
}

/** ข้อมูลที่ผูกกับแต่ละ socket ฝั่ง server (เก็บใน socket.data) */
export interface SocketData {
  playerId?: string;
  roomCode?: string;
}
