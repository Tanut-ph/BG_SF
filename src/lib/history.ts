"use client";

/**
 * ประวัติการเล่น + คะแนนสะสม เก็บในเครื่อง (localStorage) เพื่อโชว์ที่หน้าหลัก
 * เก็บต่ออุปกรณ์ ไม่ขึ้นกับ server (server เก็บเฉพาะระหว่างห้องยังเปิดอยู่)
 */
export interface GameRecord {
  at: number; // timestamp
  code: string; // รหัสห้อง
  name: string; // ชื่อที่ใช้เล่น
  role: string; // บทบาท (ไทย)
  points: number; // แต้มที่ได้รอบนั้น
}

const KEY = "popbaek:mystats";
const CAP = 200;

export function addGameRecord(rec: GameRecord): void {
  try {
    const list = getRecords();
    list.unshift(rec);
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, CAP)));
  } catch {
    /* localStorage ใช้ไม่ได้ */
  }
}

export function getRecords(): GameRecord[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as GameRecord[]) : [];
  } catch {
    return [];
  }
}

/** รวมคะแนนต่อชื่อ เรียงมาก→น้อย */
export function getLeaderboard(): { name: string; total: number; games: number }[] {
  const map = new Map<string, { total: number; games: number }>();
  for (const r of getRecords()) {
    const cur = map.get(r.name) ?? { total: 0, games: 0 };
    cur.total += r.points;
    cur.games += 1;
    map.set(r.name, cur);
  }
  return [...map.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.total - a.total);
}

export function clearRecords(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
}
