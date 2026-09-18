"use client";

/**
 * ข้อมูลยืนยันตัวตนของผู้เล่นต่อห้อง — เก็บแบบ hybrid
 * - sessionStorage = ตัวหลัก (แยกตามแท็บ) → รีเฟรชในแท็บเดิมไม่ชนกับแท็บอื่น
 * - localStorage   = ตัวสำรอง → ปิดแท็บ/สลับแอปแล้วเปิดใหม่ ยัง rejoin เป็นตัวเองได้
 * ตอนอ่าน: เอา sessionStorage ก่อน ถ้าไม่มี (ปิดแท็บไป) ค่อยตกไป localStorage
 */
export interface Identity {
  code: string;
  playerId: string;
  token: string;
  name: string;
  avatar: string;
}

const key = (code: string) => `popbaek:room:${code}`;

export function saveIdentity(id: Identity): void {
  const raw = JSON.stringify(id);
  try {
    sessionStorage.setItem(key(id.code), raw);
  } catch {
    /* sessionStorage ใช้ไม่ได้ */
  }
  try {
    localStorage.setItem(key(id.code), raw);
  } catch {
    /* localStorage ใช้ไม่ได้ */
  }
}

export function loadIdentity(code: string): Identity | null {
  try {
    // แท็บเดิม (รีเฟรช) → sessionStorage ; เปิดใหม่หลังปิดแท็บ → localStorage สำรอง
    const raw = sessionStorage.getItem(key(code)) ?? localStorage.getItem(key(code));
    return raw ? (JSON.parse(raw) as Identity) : null;
  } catch {
    return null;
  }
}

/** ห้องที่เคยเข้า (มี identity สำรองใน localStorage) — เอาไว้โชว์ปุ่ม "กลับเข้าห้อง" ที่หน้าแรก */
export function getSavedIdentities(): Identity[] {
  const out: Identity[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("popbaek:room:")) {
        const raw = localStorage.getItem(k);
        if (raw) out.push(JSON.parse(raw) as Identity);
      }
    }
  } catch {
    /* noop */
  }
  return out;
}

export function clearIdentity(code: string): void {
  try {
    sessionStorage.removeItem(key(code));
  } catch {
    /* noop */
  }
  try {
    localStorage.removeItem(key(code));
  } catch {
    /* noop */
  }
}
