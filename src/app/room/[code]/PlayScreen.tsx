"use client";

import type { PublicRoom, RolePayload, Role } from "@/shared/contracts";
import { getSocket } from "@/lib/socket";
import { Countdown } from "@/components/Countdown";

const ROLE_META: Record<Role, { label: string; emoji: string; color: string; ring: string }> = {
  FISHERMAN: { label: "ชาวประมง", emoji: "🎣", color: "text-lantern", ring: "border-lantern" },
  BLUE: { label: "ปลาฟ้า", emoji: "🐟", color: "text-bluefish", ring: "border-bluefish" },
  RED: { label: "ปลาแดง", emoji: "🐡", color: "text-redfish", ring: "border-redfish" },
};

export default function PlayScreen({
  room,
  playerId,
  role,
}: {
  room: PublicRoom;
  playerId: string;
  role: RolePayload | null;
}) {
  const isHost = room.hostId === playerId;

  // ยังไม่ได้รับบทบาท (เช่น เพิ่งเข้าจังหวะเปลี่ยน phase)
  if (!role) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md items-center justify-center px-6 text-mist">
        กำลังรับบทบาท…
      </main>
    );
  }

  const meta = ROLE_META[role.role];
  const skipReading = () => getSocket().emit("game:skipReading");
  const skipDiscussion = () => getSocket().emit("game:skipDiscussion");

  const RoleBadge = (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-display text-sm font-semibold ${meta.color} ${meta.ring}`}
    >
      {meta.emoji} {meta.label}
    </span>
  );

  if (room.phase === "READING") {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col px-6 pb-8 pt-12">
        <div className="flex items-center justify-between">
          {RoleBadge}
          <div
            className={`grid h-16 w-16 place-items-center rounded-full border-4 ${meta.ring} bg-abyss-2 font-display text-lg font-semibold`}
          >
            <Countdown deadline={room.deadline} />
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-kelp bg-surface p-5">
          <p className="text-xs uppercase tracking-widest text-mist-dim">คำถามประจำรอบ</p>
          {role.prompt ? (
            <p className="mt-2 text-lg font-medium leading-relaxed text-foam">{role.prompt}</p>
          ) : (
            <p className="mt-2 text-lg font-medium leading-relaxed text-mist">
              🔒 คำถามถูกซ่อน — เดาจากคำตอบและท่าทีของแต่ละคน
            </p>
          )}

          {role.role === "BLUE" && role.answer && (
            <div className="mt-4 rounded-xl border border-dashed border-bluefish/60 bg-bluefish/10 p-4">
              <p className="text-xs uppercase tracking-widest text-bluefish">
                คำตอบจริง — เห็นเฉพาะคุณ
              </p>
              <p className="font-display mt-1 text-lg font-semibold text-bluefish">
                {role.answer}
              </p>
            </div>
          )}
        </div>

        <div className="mt-4 rounded-xl border border-kelp bg-white/5 p-4 text-sm leading-relaxed text-mist">
          {role.role === "BLUE"
            ? "🤫 คุณรู้คำตอบจริง! เนียน ๆ ไว้ อย่าให้ชาวประมงจับได้ว่าคุณคือปลาฟ้า"
            : role.role === "RED"
              ? "🎭 คุณไม่รู้คำตอบจริง — แต่งคำตอบปลอมให้เนียน แล้วทำเป็นมั่นใจ"
              : "👀 มีปลาฟ้าซ่อนอยู่ 1 ตัวที่รู้คำตอบจริง จับตาดูให้ดี"}
        </div>

        <div className="flex-1" />

        {isHost ? (
          <button
            onClick={skipReading}
            className="font-display w-full rounded-2xl bg-lantern px-4 py-3 font-semibold text-abyss"
          >
            ข้ามเวลา →
          </button>
        ) : (
          <p className="text-center text-xs text-mist-dim">
            หมดเวลาแล้ววางมือถือ เริ่มคุยกันได้เลย
          </p>
        )}
      </main>
    );
  }

  // DISCUSSION — ช่วงคุยกัน (มี timer) ก่อนเข้าช่วงทาย
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-6 pb-8 pt-12">
      <div className="flex items-center justify-between">
        {RoleBadge}
        <div
          className={`grid h-16 w-16 place-items-center rounded-full border-4 ${meta.ring} bg-abyss-2 font-display text-lg font-semibold`}
        >
          <Countdown deadline={room.deadline} />
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <div className="text-5xl">🗣️</div>
        <h1 className="font-display text-2xl font-semibold text-foam">
          วางมือถือ แล้วคุยกัน!
        </h1>
        <p className="max-w-[260px] text-sm text-mist">
          ถามตอบกันต่อหน้า หาให้เจอว่าใครคือปลาฟ้าตัวจริง
        </p>
      </div>

      {isHost ? (
        <button
          onClick={skipDiscussion}
          className="font-display w-full rounded-2xl bg-lantern px-4 py-4 text-lg font-semibold text-abyss"
        >
          เริ่มช่วงทาย 🎣 →
        </button>
      ) : (
        <p className="text-center text-xs text-mist-dim">
          หมดเวลาคุยแล้ว ชาวประมงจะเริ่มไล่จับ
        </p>
      )}
    </main>
  );
}
