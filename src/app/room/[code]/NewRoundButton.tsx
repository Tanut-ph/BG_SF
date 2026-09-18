"use client";

import type { PublicRoom } from "@/shared/contracts";
import { getSocket } from "@/lib/socket";
import { excludeFor } from "@/lib/playedQuestions";

/** ปุ่มหัวห้อง "เริ่มรอบใหม่" — โชว์เฉพาะโฮสต์ ใช้ได้ทุกช่วงของเกม */
export function NewRoundButton({
  room,
  playerId,
}: {
  room: PublicRoom;
  playerId: string;
}) {
  if (room.hostId !== playerId) return null;
  return (
    <button
      onClick={() =>
        getSocket().emit("game:nextRound", { excludePrompts: excludeFor(room) })
      }
      className="font-display mt-2 w-full rounded-xl border border-kelp px-4 py-2.5 text-sm text-mist-dim transition hover:border-lantern hover:text-foam"
    >
      🔄 สุ่มรอบใหม่ (หัวห้อง)
    </button>
  );
}
