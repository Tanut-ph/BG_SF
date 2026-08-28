"use client";

import { useState } from "react";
import type { Role, RolePayload } from "@/shared/contracts";

const RULE: Record<
  Role,
  { label: string; emoji: string; color: string; ring: string; bg: string; must: string; tip: string }
> = {
  FISHERMAN: {
    label: "ชาวประมง",
    emoji: "🎣",
    color: "text-lantern",
    ring: "border-lantern",
    bg: "bg-lantern/10",
    must: "จับ “คนโกหก” (ปลาแดง) ให้ได้เยอะ — เลี่ยง “คนพูดจริง” (ปลาฟ้า)",
    tip: "ฟังให้ออกว่าใครโกหก แล้วไล่จับปลาแดง · ถ้าเผลอจับปลาฟ้าตอนยังมีปลาแดงเหลือ = โป๊ะแตก เสียแต้มทั้งรอบ · ถ้าจับปลาแดงครบแล้วปิดท้ายด้วยปลาฟ้า = กวาดเรียบ ได้แต้มคนเดียว",
  },
  BLUE: {
    label: "ปลาฟ้า",
    emoji: "🐟",
    color: "text-bluefish",
    ring: "border-bluefish",
    bg: "bg-bluefish/10",
    must: "พูด “ความจริง” เท่านั้น (ตอบตามคำตอบจริง)",
    tip: "คุณรู้คำตอบจริงและต้องพูดจริง — แต่เนียน ๆ อย่าให้ชาวประมงจับได้ว่าคุณคือปลาฟ้า (โดนจับตอนมีแดงเหลือ = ชาวประมงโป๊ะแตก คุณรอด)",
  },
  RED: {
    label: "ปลาแดง",
    emoji: "🐡",
    color: "text-redfish",
    ring: "border-redfish",
    bg: "bg-redfish/10",
    must: "ต้อง “โกหก” (ตอบให้ผิดจากคำตอบจริง)",
    tip: "คุณรู้คำตอบจริง แต่ต้องโกหกให้เนียนเหมือนพูดจริง อย่าให้ชาวประมงจับได้ (ถูกจับ = 0 แต้ม)",
  },
};

export function RoleCard({ role, onClose }: { role: RolePayload; onClose?: () => void }) {
  const [showHow, setShowHow] = useState(false);
  const r = RULE[role.role];

  return (
    <div className={`rounded-2xl border-2 ${r.ring} ${r.bg} p-5`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-3xl">{r.emoji}</span>
          <div>
            <div className="text-xs uppercase tracking-widest text-mist-dim">บทบาทของคุณ</div>
            <div className={`font-display text-2xl font-bold ${r.color}`}>{r.label}</div>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full border border-kelp text-mist"
            aria-label="ปิด"
          >
            ✕
          </button>
        )}
      </div>

      {/* กติกาสำคัญ: พูดจริง / โกหก */}
      <div className="mt-4 rounded-xl border border-kelp bg-abyss-2/60 p-3">
        <div className="text-xs uppercase tracking-widest text-mist-dim">คุณต้อง</div>
        <div className={`mt-0.5 font-display text-base font-semibold ${r.color}`}>{r.must}</div>
      </div>

      {/* คำถาม */}
      <div className="mt-3">
        <div className="text-xs uppercase tracking-widest text-mist-dim">คำถามประจำรอบ</div>
        {role.prompt ? (
          <p className="mt-1 text-lg font-medium leading-relaxed text-foam">{role.prompt}</p>
        ) : (
          <p className="mt-1 text-base font-medium text-mist">
            🔒 คำถามถูกซ่อน — เดาจากคำตอบและท่าทีของแต่ละคน
          </p>
        )}
      </div>

      {/* คำตอบจริง (เฉพาะปลา) */}
      {role.answer && (
        <div className="mt-3 rounded-xl border border-dashed border-bluefish/60 bg-bluefish/10 p-3">
          <div className="text-xs uppercase tracking-widest text-bluefish">
            คำตอบจริง — ชาวประมงไม่เห็น
          </div>
          <p className="font-display mt-0.5 text-lg font-semibold text-bluefish">{role.answer}</p>
        </div>
      )}

      {/* วิธีเล่น (เปิด/ปิดได้) */}
      <button
        onClick={() => setShowHow((v) => !v)}
        className="mt-4 flex w-full items-center justify-between rounded-xl border border-kelp bg-surface px-3 py-2.5 text-sm text-foam"
      >
        <span>💡 วิธีเล่นของบทบาทนี้</span>
        <span className="text-mist-dim">{showHow ? "▲" : "▼"}</span>
      </button>
      {showHow && (
        <p className="mt-2 rounded-xl border border-kelp bg-abyss-2/60 p-3 text-sm leading-relaxed text-mist">
          {r.tip}
        </p>
      )}
    </div>
  );
}
