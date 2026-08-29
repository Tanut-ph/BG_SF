"use client";

import type { PublicRoom } from "@/shared/contracts";
import { YouBadge } from "./YouBadge";

export default function SpectatorScreen({
  room,
  playerId,
}: {
  room: PublicRoom;
  playerId: string;
}) {
  const fishermanName =
    room.players.find((p) => p.id === room.fishermanId)?.name ?? "";
  const phaseText =
    room.phase === "READING"
      ? "กำลังอ่านโจทย์…"
      : room.phase === "DISCUSSION"
        ? "กำลังคุยกัน…"
        : room.phase === "GUESSING"
          ? "ชาวประมงกำลังไล่จับ…"
          : "กำลังเล่น…";

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-6 pb-8 pt-12">
      <div className="flex items-center justify-between">
        <YouBadge room={room} playerId={playerId} />
        <span className="font-display rounded-full border border-mist-dim/40 bg-surface px-3 py-1 text-xs text-mist">
          👀 ผู้ชม
        </span>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <div className="text-5xl">👀</div>
        <h1 className="font-display text-2xl font-semibold text-foam">คุณเป็นผู้ชมรอบนี้</h1>
        <p className="max-w-[280px] text-sm text-mist">
          คุณเข้ามาระหว่างเกม — นั่งดูไปก่อน เดี๋ยว<b className="text-foam">รอบถัดไป</b>จะได้เล่นด้วยอัตโนมัติ
        </p>
        <div className="rounded-xl border border-kelp bg-surface px-4 py-2.5 text-sm text-mist">
          {phaseText}
          {fishermanName && (
            <div className="mt-1 text-xs text-mist-dim">
              🎣 ชาวประมงรอบนี้: <span className="text-lantern">{fishermanName}</span>
            </div>
          )}
        </div>
      </div>

      <p className="text-center text-xs text-mist-dim">
        รอโฮสต์เริ่มรอบใหม่ แล้วคุณจะได้รับบทบาท
      </p>
    </main>
  );
}
