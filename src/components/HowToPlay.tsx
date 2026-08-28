"use client";

import { useState } from "react";

const SECTIONS: { title: string; body: React.ReactNode }[] = [
  {
    title: "🎣 เกมนี้เล่นยังไง",
    body: (
      <>
        เกมจับโกหกที่เล่น <b>ต่อหน้ากัน</b> — มือถือใช้แจกบทบาทลับให้แต่ละคน
        ส่วนการพูดคุยเกิดขึ้นจริงในวง เล่นได้ <b>3–10 คน</b>
      </>
    ),
  },
  {
    title: "🐟 บทบาทมีอะไรบ้าง",
    body: (
      <ul className="flex flex-col gap-2">
        <li>
          <b className="text-lantern">🎣 ชาวประมง</b> (1 คน) — ไม่รู้คำตอบ
          ต้องฟังแล้วจับ “คนโกหก” (ปลาแดง) ให้ได้ และเลี่ยง “คนพูดจริง” (ปลาฟ้า)
        </li>
        <li>
          <b className="text-bluefish">🐟 ปลาฟ้า</b> (1 คน) — รู้คำตอบจริง และต้อง
          <b> พูดความจริง</b> เนียน ๆ อย่าให้โดนจับ
        </li>
        <li>
          <b className="text-redfish">🐡 ปลาแดง</b> (ที่เหลือ) — รู้คำตอบจริง แต่ต้อง
          <b> โกหก</b> ให้เหมือนพูดจริง
        </li>
      </ul>
    ),
  },
  {
    title: "▶️ ลำดับการเล่น",
    body: (
      <ol className="flex list-decimal flex-col gap-1.5 pl-4">
        <li>โฮสต์สร้างห้อง แชร์รหัสห้องให้เพื่อนเข้า</li>
        <li>ทุกคนกด “พร้อม” แล้วโฮสต์เริ่มเกม</li>
        <li>ดูบทบาท + คำถาม + คำตอบในการ์ดของตัวเอง</li>
        <li>วางมือถือ คุยกันต่อหน้า — หาว่าใครพูดจริง ใครโกหก</li>
        <li>เข้าช่วงทาย: ชาวประมงไล่จับทีละคน</li>
        <li>เฉลย + คิดคะแนน แล้วเริ่มรอบใหม่</li>
      </ol>
    ),
  },
  {
    title: "🏆 คิดคะแนนยังไง",
    body: (
      <ul className="flex flex-col gap-1.5">
        <li>จับ <b className="text-redfish">ปลาแดง</b> ได้ → ชาวประมง +1 ต่อตัว (สะสมไปเรื่อย ๆ)</li>
        <li>เผลอจับ <b className="text-bluefish">ปลาฟ้า</b> ตอนยังมีปลาแดงเหลือ → <b>โป๊ะแตก</b> ชาวประมงเสียแต้มทั้งรอบ, ปลาที่รอดได้แต้ม</li>
        <li>จับปลาแดงครบแล้วปิดท้ายด้วยปลาฟ้า → <b>กวาดเรียบ</b> ชาวประมงได้แต้มคนเดียว</li>
        <li>กด “จบการจับ” เอง → เก็บแต้มที่สะสมไว้, ปลาที่รอดได้แต้ม</li>
        <li>ปลาที่รอด (ไม่ถูกจับ) ได้คนละ = จำนวนตัวที่รอด · ปลาที่ถูกจับ = 0</li>
      </ul>
    ),
  },
];

function Card({ title, body }: { title: string; body: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-kelp bg-surface">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left font-display font-semibold text-foam"
      >
        <span>{title}</span>
        <span className="text-mist-dim">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="border-t border-kelp px-4 py-3 text-sm leading-relaxed text-mist">
          {body}
        </div>
      )}
    </div>
  );
}

export function HowToPlay({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-center overflow-y-auto bg-abyss/85 p-6 backdrop-blur-sm">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-foam">วิธีเล่น</h2>
          <button
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full border border-kelp text-mist"
            aria-label="ปิด"
          >
            ✕
          </button>
        </div>
        <p className="mt-1 text-sm text-mist-dim">แตะแต่ละหัวข้อเพื่อเปิด/ปิด</p>
        <div className="mt-4 flex flex-col gap-2 pb-10">
          {SECTIONS.map((s) => (
            <Card key={s.title} title={s.title} body={s.body} />
          ))}
        </div>
      </div>
    </div>
  );
}
