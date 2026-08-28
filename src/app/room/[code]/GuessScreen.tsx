"use client";

import { useState } from "react";
import type { PublicRoom, RolePayload } from "@/shared/contracts";
import { getSocket } from "@/lib/socket";

export default function GuessScreen({
  room,
  playerId,
  role,
}: {
  room: PublicRoom;
  playerId: string;
  role: RolePayload | null;
}) {
  const [error, setError] = useState("");
  const isFisherman = role?.role === "FISHERMAN";
  const caught = room.caughtIds;

  const isHost = room.hostId === playerId;
  const pick = (targetId: string) => {
    setError("");
    getSocket().emit("guess:pick", { targetId }, (res) => {
      if (!res.ok) setError(res.error);
    });
  };
  const finish = () => getSocket().emit("guess:finish");
  const abort = () => getSocket().emit("game:abort");

  if (!isFisherman) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-kelp border-t-lantern" />
        <h1 className="font-display text-2xl font-semibold text-foam">
          ชาวประมงกำลังไล่จับ…
        </h1>
        <p className="text-sm text-mist">
          🎣 ชาวประมงคือ{" "}
          <span className="font-display font-semibold text-lantern">
            {room.players.find((p) => p.id === room.fishermanId)?.name ?? "?"}
          </span>
        </p>
        <p className="max-w-[260px] text-sm text-mist">
          {role?.role === "BLUE"
            ? "คุณคือปลาฟ้า — ถ้าชาวประมงเผลอเลือกคุณ เขาเสียแต้มทั้งรอบ!"
            : "ลุ้นให้รอด — ปลาที่รอดได้แต้ม = จำนวนตัวที่รอด (ถูกจับแล้ว = 0)"}
        </p>
        <p className="rounded-lg border border-kelp bg-surface px-3 py-2 text-xs text-mist-dim">
          จับปลาแดงได้แล้ว {caught.length} ตัว
        </p>
        {isHost && (
          <button
            onClick={abort}
            className="font-display mt-2 rounded-xl border border-kelp px-4 py-2 text-sm text-mist-dim"
          >
            ยกเลิกรอบ (ถ้าค้าง)
          </button>
        )}
      </main>
    );
  }

  const candidates = room.players.filter((p) => p.id !== playerId);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-6 pb-8 pt-12">
      <div className="flex items-center justify-between">
        <span className="font-display inline-flex items-center gap-2 rounded-full border border-lantern px-3 py-1.5 text-sm font-semibold text-lantern">
          🎣 ชาวประมง
        </span>
        <span className="font-display rounded-full border border-kelp bg-surface px-3 py-1 text-xs text-mist">
          ห้อง <b className="text-foam">{room.code}</b>
        </span>
      </div>

      <div className="mt-4 flex items-center gap-3 rounded-2xl border border-lantern/40 bg-lantern/10 px-4 py-3">
        <span className="font-display text-3xl font-bold leading-none text-lantern">
          {caught.length}
        </span>
        <span className="text-sm leading-snug text-mist">
          เก็บสะสม <b className="text-foam">+{caught.length}</b> (ยังไม่ปลอดภัย!) · โดน
          <b className="text-bluefish">ปลาฟ้า</b> ={" "}
          <b className="text-redfish">เสียหมด เหลือ 0</b>
        </span>
      </div>

      <ul className="mt-4 flex flex-col gap-2">
        {candidates.map((p) => {
          const isCaught = caught.includes(p.id);
          return (
            <li key={p.id}>
              <button
                onClick={() => !isCaught && pick(p.id)}
                disabled={isCaught}
                className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${
                  isCaught
                    ? "border-redfish/30 bg-redfish/5 opacity-60"
                    : "border-kelp bg-surface hover:border-lantern hover:translate-x-0.5"
                }`}
              >
                <span className="grid h-9 w-9 place-items-center rounded-full border border-kelp bg-abyss-2 text-lg">
                  {p.avatar}
                </span>
                <span
                  className={`font-medium ${isCaught ? "text-mist line-through" : "text-foam"}`}
                >
                  {p.name}
                </span>
                <span className="ml-auto font-display text-xs">
                  {isCaught ? (
                    <span className="rounded-full bg-redfish/15 px-2.5 py-1 text-redfish">
                      🎣 ปลาแดง
                    </span>
                  ) : (
                    <span className="text-mist-dim">›</span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {error && <p className="mt-3 text-center text-sm text-redfish">{error}</p>}

      <div className="flex-1" />

      <div className="mb-3 flex items-start gap-2 rounded-xl border border-lantern/30 bg-lantern/10 px-4 py-3 text-sm text-mist">
        <span>🎲</span>
        <span>
          เลือกต่อเพื่อเก็บแดงเพิ่ม — แต่ถ้าโดนปลาฟ้า{" "}
          <b className="text-redfish">เสียแต้มทั้งรอบ</b>
        </span>
      </div>
      {room.settings.allowFinish ? (
        <button
          onClick={finish}
          className="font-display w-full rounded-2xl border border-kelp px-4 py-4 text-lg font-semibold text-foam"
        >
          ✓ จบการจับ — เก็บ +{caught.length} ไว้
        </button>
      ) : (
        <p className="text-center text-xs text-mist-dim">
          โหมดนี้ต้องไล่จับต่อจนกว่าจะเจอปลาฟ้า
        </p>
      )}
    </main>
  );
}
