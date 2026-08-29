"use client";

import { useState } from "react";
import type { PublicRoom, RolePayload } from "@/shared/contracts";
import { getSocket } from "@/lib/socket";
import { Countdown } from "@/components/Countdown";
import { RoleCard } from "./RoleCard";
import { YouBadge } from "./YouBadge";

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
  const [reviewOpen, setReviewOpen] = useState(false);

  if (!role) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md items-center justify-center px-6 text-mist">
        กำลังรับบทบาท…
      </main>
    );
  }

  const skipReading = () => getSocket().emit("game:skipReading");
  const skipDiscussion = () => getSocket().emit("game:skipDiscussion");
  const fishermanName =
    room.players.find((p) => p.id === room.fishermanId)?.name ?? "";

  const FishermanLine = fishermanName ? (
    <p className="mt-3 text-center text-sm text-mist">
      🎣 ชาวประมงรอบนี้คือ{" "}
      <span className="font-display font-semibold text-lantern">{fishermanName}</span>
    </p>
  ) : null;

  // ---------- READING: โชว์การ์ดบทบาท ----------
  if (room.phase === "READING") {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col px-6 pb-8 pt-12">
        <div className="flex items-center justify-between">
          <YouBadge room={room} playerId={playerId} />
          <div className="grid h-14 w-14 place-items-center rounded-full border-4 border-lantern bg-abyss-2 font-display text-base font-semibold">
            <Countdown deadline={room.deadline} />
          </div>
        </div>

        {FishermanLine}

        <div className="mt-4">
          <RoleCard role={role} />
        </div>

        <div className="flex-1" />

        {isHost ? (
          <button
            onClick={skipReading}
            className="font-display mt-6 w-full rounded-2xl bg-lantern px-4 py-3 font-semibold text-abyss"
          >
            ทุกคนพร้อม → เริ่มคุยกัน
          </button>
        ) : (
          <p className="mt-6 text-center text-xs text-mist-dim">
            จำบทบาทให้ดี เดี๋ยววางมือถือแล้วคุยกัน
          </p>
        )}
      </main>
    );
  }

  // ---------- DISCUSSION: โชว์คำถามใหญ่ค้างไว้ · ซ่อนบทบาท · ชาวประมงคุมการข้าม ----------
  const isFisherman = role.role === "FISHERMAN";
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-6 pb-8 pt-12">
      <div className="flex items-center justify-between">
        <YouBadge room={room} playerId={playerId} />
        <span className="font-display text-sm text-mist">🗣️ คุยกัน</span>
      </div>

      {FishermanLine}

      {/* คำถามใหญ่ ค้างไว้ให้ทุกคนเห็น */}
      <div className="mt-4 rounded-2xl border-2 border-bluefish/40 bg-surface p-6 text-center">
        <p className="text-xs uppercase tracking-widest text-mist-dim">คำถามประจำรอบ</p>
        {role.prompt ? (
          <p className="font-display mt-3 text-2xl font-bold leading-snug text-foam text-balance">
            {role.prompt}
          </p>
        ) : (
          <p className="mt-3 text-lg font-medium text-mist">🔒 คำถามถูกซ่อนจากชาวประมง</p>
        )}
      </div>

      <div className="mt-4 rounded-xl border border-kelp bg-surface px-4 py-3 text-center text-sm text-mist">
        วางมือถือ คุยกันต่อหน้า — หาว่าใครพูดจริง ใครโกหก
        <div className="mt-1 text-xs text-mist-dim">
          🐟 ปลาฟ้า = พูดจริง · 🐡 ปลาแดง = โกหก
        </div>
      </div>

      <button
        onClick={() => setReviewOpen(true)}
        className="font-display mt-3 self-center rounded-xl border border-kelp bg-surface px-4 py-2.5 text-sm text-foam"
      >
        🔍 ย้อนดูบทบาท/คำตอบของฉัน
      </button>

      <div className="flex-1" />

      {isFisherman ? (
        <button
          onClick={skipDiscussion}
          className="font-display w-full rounded-2xl bg-lantern px-4 py-4 text-lg font-semibold text-abyss"
        >
          พร้อมแล้ว เริ่มไล่จับ 🎣 →
        </button>
      ) : (
        <p className="text-center text-xs text-mist-dim">
          รอ<b className="text-lantern">ชาวประมง ({fishermanName})</b> เริ่มช่วงทาย
        </p>
      )}

      {/* overlay ย้อนดูโรล */}
      {reviewOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-abyss/80 p-6 backdrop-blur-sm"
          onClick={() => setReviewOpen(false)}
        >
          <div className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <RoleCard role={role} onClose={() => setReviewOpen(false)} />
          </div>
        </div>
      )}
    </main>
  );
}
