/**
 * เชื่อมต่อ MongoDB (Atlas) — เก็บ "คำถามที่เล่นแล้ว" เพื่อกันซ้ำแบบ global
 *
 * ถ้าไม่ตั้ง env MONGODB_URI → ทำงานแบบ in-memory เหมือนเดิม (ไม่พังของเดิม)
 * ทุกฟังก์ชันจะ no-op / คืนค่าว่าง ถ้ายังไม่ได้เชื่อมต่อ
 */
import { MongoClient, type Db } from "mongodb";

let db: Db | null = null;
let connecting: Promise<void> | null = null;

export function dbEnabled(): boolean {
  return !!db;
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
      db = database;
      console.log("✅ เชื่อมต่อ MongoDB สำเร็จ (เก็บกันซ้ำแบบ global)");
    } catch (e) {
      console.error("❌ เชื่อมต่อ MongoDB ไม่สำเร็จ — ใช้ in-memory ต่อ:", (e as Error).message);
      db = null;
    } finally {
      connecting = null;
    }
  })();
  return connecting;
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
