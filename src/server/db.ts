/**
 * เชื่อมต่อ MongoDB (Atlas) — เก็บ "คำถามที่เล่นแล้ว" เพื่อกันซ้ำแบบ global
 *
 * ถ้าไม่ตั้ง env MONGODB_URI → ทำงานแบบ in-memory เหมือนเดิม (ไม่พังของเดิม)
 * ทุกฟังก์ชันจะ no-op / คืนค่าว่าง ถ้ายังไม่ได้เชื่อมต่อ
 */
import { MongoClient, type Db } from "mongodb";
import type { Question } from "../shared/contracts";
import { QUESTIONS } from "./questions";

let db: Db | null = null;
let connecting: Promise<void> | null = null;

/**
 * คลังคำถามกลางใน RAM — เริ่มจากคำถามในโค้ด (fallback) ถ้ามี DB จะถูกแทนที่ด้วยของใน DB
 * ทุกห้องหยิบคำถามจากตัวนี้ → แก้ทีเดียวมีผลทุกห้อง
 */
let questionCache: Question[] = [...QUESTIONS];

export function dbEnabled(): boolean {
  return !!db;
}

/** คลังคำถามปัจจุบัน (global) — ใช้ทั้ง draw และแสดงใน Settings */
export function getQuestions(): Question[] {
  return questionCache;
}

/** เชื่อมต่อครั้งเดียวตอน server เริ่ม (ไม่ throw — ล้มก็ใช้ in-memory ต่อ) */
export async function connectDb(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.log("ℹ️  ไม่มี MONGODB_URI — โหมด in-memory (ไม่เก็บคำถามที่เล่นแล้วถาวร)");
    return;
  }
  if (db) return;
  if (connecting) return connecting;
  connecting = (async () => {
    try {
      const client = new MongoClient(uri);
      await client.connect();
      const database = client.db(process.env.MONGODB_DB || "popbaek");
      await database.collection("played").createIndex({ prompt: 1 }, { unique: true });
      await database.collection("played").createIndex({ at: 1 });
      await database.collection("questions").createIndex({ prompt: 1 }, { unique: true });
      db = database;
      await loadQuestions(); // seed ครั้งแรก + โหลดคลังคำถามกลางลง cache
      console.log(`✅ เชื่อมต่อ MongoDB สำเร็จ (คลังคำถามกลาง ${questionCache.length} ข้อ, กันซ้ำ global)`);
    } catch (e) {
      console.error("❌ เชื่อมต่อ MongoDB ไม่สำเร็จ — ใช้ in-memory ต่อ:", (e as Error).message);
      db = null;
    } finally {
      connecting = null;
    }
  })();
  return connecting;
}

/**
 * โหลดคลังคำถามจาก DB ลง cache — ถ้า collection ว่าง seed จากคำถามในโค้ดก่อน
 * (เรียกครั้งเดียวตอนเชื่อม DB สำเร็จ ก่อนสร้างห้องแรก)
 */
async function loadQuestions(): Promise<void> {
  if (!db) return;
  const col = db.collection("questions");
  if ((await col.countDocuments()) === 0) {
    const now = new Date();
    await col.insertMany(QUESTIONS.map((q) => ({ prompt: q.prompt, answer: q.answer, at: now })));
  }
  const docs = await col.find().project({ _id: 0, prompt: 1, answer: 1 }).toArray();
  questionCache = docs.map((d) => ({ prompt: d.prompt as string, answer: d.answer as string }));
}

/** เพิ่มคำถามเข้าคลังกลาง (persist ลง DB ถ้ามี) — คืน false ถ้าซ้ำ prompt เดิม */
export async function addQuestion(prompt: string, answer: string): Promise<boolean> {
  if (questionCache.some((q) => q.prompt === prompt)) return false;
  questionCache.push({ prompt, answer });
  if (db) {
    try {
      await db
        .collection("questions")
        .updateOne({ prompt }, { $set: { prompt, answer, at: new Date() } }, { upsert: true });
    } catch {
      /* noop — cache อัปเดตแล้ว */
    }
  }
  return true;
}

/** ลบคำถามออกจากคลังกลางด้วยข้อความ prompt (persist ลง DB ถ้ามี) */
export async function removeQuestion(prompt: string): Promise<void> {
  questionCache = questionCache.filter((q) => q.prompt !== prompt);
  if (db) {
    try {
      await db.collection("questions").deleteOne({ prompt });
    } catch {
      /* noop */
    }
  }
}

/** บันทึกว่าคำถามนี้ถูกเล่นแล้ว (อัปเดตเวลาเป็นล่าสุด) */
export async function recordPlayedQuestion(prompt: string): Promise<void> {
  if (!db || !prompt) return;
  try {
    await db
      .collection("played")
      .updateOne({ prompt }, { $set: { prompt, at: new Date() } }, { upsert: true });
  } catch {
    /* noop */
  }
}

/** คืนรายการ prompt ที่เล่นภายใน N วัน (ไว้กันซ้ำ) */
export async function getRecentlyPlayed(days = 90): Promise<string[]> {
  if (!db) return [];
  try {
    const cutoff = new Date(Date.now() - days * 86400000);
    const docs = await db
      .collection("played")
      .find({ at: { $gte: cutoff } })
      .project({ prompt: 1, _id: 0 })
      .toArray();
    return docs.map((d) => d.prompt as string);
  } catch {
    return [];
  }
}
