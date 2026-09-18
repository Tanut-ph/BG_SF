"use client";

import type { PublicRoom } from "@/shared/contracts";

/**
 * จำคำถามที่ "เครื่องนี้" (หัวห้อง) เคยเล่นไปแล้ว + เวลาที่เล่น
 * ใช้กันคำถามซ้ำข้ามเกม/ข้ามวัน (ค่าเริ่มต้นมองย้อน 90 วัน)
 */
const KEY = "popbaek:played";
const DEFAULT_DAYS = 90;

type Played = Record<string, number>; // prompt -> last played timestamp

function load(): Played {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Played) : {};
  } catch {
    return {};
  }
}

export function recordPlayed(prompt: string): void {
  if (!prompt) return;
  try {
    const m = load();
    m[prompt] = Date.now();
    localStorage.setItem(KEY, JSON.stringify(m));
  } catch {
    /* noop */
  }
}

/** คำถามที่เล่นไปภายใน N วัน (สำหรับส่งให้ server กันซ้ำ) */
export function getRecentPrompts(days = DEFAULT_DAYS): string[] {
  const cutoff = Date.now() - days * 86400000;
  return Object.entries(load())
    .filter(([, ts]) => ts >= cutoff)
    .map(([prompt]) => prompt);
}

/** รายการ exclude ที่จะส่งตอนเริ่มเกม/รอบใหม่ (ว่างถ้าปิดโหมดกันซ้ำ) */
export function excludeFor(room: PublicRoom): string[] {
  return room.settings.avoidRepeat ? getRecentPrompts() : [];
}
