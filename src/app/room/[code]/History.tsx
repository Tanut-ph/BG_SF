"use client";

import type { PublicRoom } from "@/shared/contracts";

const MEDAL = ["🥇", "🥈", "🥉"];

export default function History({
  room,
  playerId,
  onBack,
}: {
  room: PublicRoom;
  playerId: string;
  onBack: () => void;
}) {
  const ranked = [...room.players].sort((a, b) => b.score - a.score);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-6 pb-8 pt-12">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-sm text-mist-dim">
          ← กลับ
        </button>
        <span className="font-display text-sm text-mist">
          ประวัติ · {room.history.length} รอบ
        </span>
      </div>

      <h1 className="font-display mt-3 text-2xl font-semibold text-foam">
        ตารางคะแนนสะสม
      </h1>
      <p className="text-sm text-mist">รวมทุกรอบในเกมนี้</p>

      <ul className="mt-3 flex flex-col gap-2">
        {ranked.map((p, i) => (
          <li
            key={p.id}
            className={`flex items-center gap-3 rounded-xl border bg-surface px-4 py-3 ${
              p.id === playerId ? "border-bluefish/60" : "border-kelp"
            }`}
          >
            <span className="font-display w-6 text-center text-mist-dim">
              {MEDAL[i] ?? i + 1}
            </span>
            <span className="grid h-9 w-9 place-items-center rounded-full border border-kelp bg-abyss-2 text-lg">
              {p.avatar}
            </span>
            <span className="font-medium text-foam">{p.name}</span>
            <span className="font-display ml-auto font-semibold tabular-nums text-good">
              {p.score} แต้ม
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-6 text-xs uppercase tracking-widest text-mist-dim">
        รอบที่ผ่านมา
      </p>
      {room.history.length === 0 ? (
        <p className="mt-2 rounded-xl border border-kelp bg-surface px-4 py-3 text-sm text-mist-dim">
          ยังไม่มีรอบที่จบ
        </p>
      ) : (
        <ul className="mt-2 flex flex-col gap-2">
          {room.history.map((h) => (
            <li
              key={h.round}
              className="flex items-center gap-3 rounded-xl border border-kelp bg-surface px-4 py-3"
            >
              <span className="font-display shrink-0 font-semibold text-foam">
                รอบ {h.round}
              </span>
              <span className="text-sm text-mist">
                {h.outcome === "bust"
                  ? `โป๊ะแตก — จับได้ ${h.caughtCount} · ปลาฟ้า ${h.blueName}`
                  : `${h.fishermanName} จบเอง · จับได้ ${h.caughtCount}`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
