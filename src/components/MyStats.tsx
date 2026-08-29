"use client";

import { useState } from "react";
import {
  clearRecords,
  getLeaderboard,
  getRecords,
  type GameRecord,
} from "@/lib/history";

const MEDAL = ["🥇", "🥈", "🥉"];

function fmt(at: number): string {
  try {
    return new Date(at).toLocaleString("th-TH", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export function MyStats({ onClose }: { onClose: () => void }) {
  const [board, setBoard] = useState(() => getLeaderboard());
  const [recent, setRecent] = useState<GameRecord[]>(() => getRecords().slice(0, 25));
  const [confirming, setConfirming] = useState(false);

  const doClear = () => {
    clearRecords();
    setBoard([]);
    setRecent([]);
    setConfirming(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-center overflow-y-auto bg-abyss/85 p-6 backdrop-blur-sm">
      <div className="w-full max-w-md pb-10">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-foam">สถิติของฉัน</h2>
          <button
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full border border-kelp text-mist"
            aria-label="ปิด"
          >
            ✕
          </button>
        </div>
        <p className="mt-1 text-sm text-mist-dim">คะแนนสะสมในเครื่องนี้ (ทุกห้องที่เคยเล่น)</p>

        {board.length === 0 ? (
          <p className="mt-6 rounded-xl border border-kelp bg-surface px-4 py-6 text-center text-sm text-mist-dim">
            ยังไม่มีประวัติ — เล่นจบสักรอบแล้วคะแนนจะมาโชว์ที่นี่
          </p>
        ) : (
          <>
            <p className="mt-5 text-xs uppercase tracking-widest text-mist-dim">คะแนนรวมต่อชื่อ</p>
            <ul className="mt-2 flex flex-col gap-2">
              {board.map((b, i) => (
                <li
                  key={b.name}
                  className="flex items-center gap-3 rounded-xl border border-kelp bg-surface px-4 py-3"
                >
                  <span className="font-display w-6 text-center text-mist-dim">
                    {MEDAL[i] ?? i + 1}
                  </span>
                  <span className="font-medium text-foam">{b.name}</span>
                  <span className="text-xs text-mist-dim">{b.games} รอบ</span>
                  <span className="font-display ml-auto font-semibold tabular-nums text-good">
                    {b.total} แต้ม
                  </span>
                </li>
              ))}
            </ul>

            <p className="mt-6 text-xs uppercase tracking-widest text-mist-dim">รอบล่าสุด</p>
            <ul className="mt-2 flex flex-col gap-2">
              {recent.map((r, i) => (
                <li
                  key={`${r.at}-${i}`}
                  className="flex items-center gap-3 rounded-xl border border-kelp bg-surface px-4 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm text-foam">
                      {r.name} · <span className="text-mist">{r.role}</span>
                    </div>
                    <div className="text-xs text-mist-dim">
                      ห้อง {r.code} · {fmt(r.at)}
                    </div>
                  </div>
                  <span
                    className={`font-display shrink-0 font-semibold tabular-nums ${
                      r.points > 0 ? "text-good" : "text-mist-dim"
                    }`}
                  >
                    {r.points > 0 ? `+${r.points}` : "0"}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-6 text-center">
              {confirming ? (
                <div className="flex items-center justify-center gap-2 text-sm">
                  <span className="text-mist">ล้างประวัติทั้งหมด?</span>
                  <button onClick={doClear} className="font-display rounded-lg bg-redfish px-3 py-1.5 text-abyss">
                    ล้าง
                  </button>
                  <button onClick={() => setConfirming(false)} className="rounded-lg border border-kelp px-3 py-1.5 text-mist">
                    ยกเลิก
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirming(true)}
                  className="text-sm text-mist-dim underline"
                >
                  ล้างประวัติในเครื่อง
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
