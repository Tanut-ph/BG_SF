"use client";

/** ข้อมูลยืนยันตัวตนของผู้เล่นต่อห้อง เก็บใน localStorage เพื่อ rejoin หลังรีเฟรช/จอล็อก */
export interface Identity {
  code: string;
  playerId: string;
  token: string;
  name: string;
  avatar: string;
}

const key = (code: string) => `popbaek:room:${code}`;

export function saveIdentity(id: Identity): void {
  try {
    localStorage.setItem(key(id.code), JSON.stringify(id));
  } catch {
    /* localStorage ใช้ไม่ได้ — ข้ามไป */
  }
}

export function loadIdentity(code: string): Identity | null {
  try {
    const raw = localStorage.getItem(key(code));
    return raw ? (JSON.parse(raw) as Identity) : null;
  } catch {
    return null;
  }
}

export function clearIdentity(code: string): void {
  try {
    localStorage.removeItem(key(code));
  } catch {
    /* noop */
  }
}
