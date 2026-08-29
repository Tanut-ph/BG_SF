"use client";

import type { PublicRoom } from "@/shared/contracts";

/** ป้ายบอกว่า "คุณคือใคร" (ตัวปลา + ชื่อ) + เลขห้อง — โชว์มุมบนของทุกหน้าในเกม */
export function YouBadge({ room, playerId }: { room: PublicRoom; playerId: string }) {
  const me = room.players.find((p) => p.id === playerId);
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-kelp bg-surface px-3 py-1 text-xs text-mist">
      {me && (
        <>
          <span className="text-sm">{me.avatar}</span>
          <b className="text-foam">{me.name}</b>
          <span className="text-mist-dim">·</span>
        </>
      )}
      ห้อง <b className="text-foam">{room.code}</b>
    </span>
  );
}
