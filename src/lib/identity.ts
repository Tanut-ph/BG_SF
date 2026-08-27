"use client";

/**
 * ข้อมูลยืนยันตัวตนของผู้เล่นต่อห้อง — เก็บใน sessionStorage (แยกตามแท็บ)
 * ใช้ sessionStorage ไม่ใช่ localStorage เพราะ localStorage แชร์กันทุกแท็บในเบราว์เซอร์เดียว
 * ทำให้เปิดหลายแท็บแล้ว identity ทับกัน (คนละคนกลายเป็นคนเดียวกัน / โดนเตะ)
 * sessionStorage อยู่รอดตอนรีเฟรช/จอล็อกในแท็บเดิม แต่แยกอิสระต่อแท็บ
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
  try {
    sessionStorage.setItem(key(id.code), JSON.stringify(id));
  } catch {
    /* sessionStorage ใช้ไม่ได้ — ข้ามไป */
  }
}

export function loadIdentity(code: string): Identity | null {
  try {
    const raw = sessionStorage.getItem(key(code));
    return raw ? (JSON.parse(raw) as Identity) : null;
  } catch {
    return null;
  }
}

export function clearIdentity(code: string): void {
  try {
    sessionStorage.removeItem(key(code));
  } catch {
    /* noop */
  }
}
