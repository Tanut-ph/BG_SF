"use client";

import { useEffect } from "react";
import type { PublicRoom, Role } from "@/shared/contracts";
import { getSocket } from "@/lib/socket";
import { addGameRecord } from "@/lib/history";
import { recordPlayed, excludeFor } from "@/lib/playedQuestions";
import { YouBadge } from "./YouBadge";

const ROLE_TAG: Record<Role, { label: string; cls: string }> = {
  FISHERMAN: { label: "ชาวประมง", cls: "text-lantern bg-lantern/15" },
  BLUE: { label: "ปลาฟ้า", cls: "text-bluefish bg-bluefish/15" },
  RED: { label: "ปลาแดง", cls: "text-redfish bg-redfish/15" },
};

export default function RevealScreen({
  room,
  playerId,
}: {
  room: PublicRoom;
  playerId: string;
}) {
  const reveal = room.reveal;

  // บันทึกผลรอบนี้ลงเครื่อง (ครั้งเดียวต่อรอบ) เพื่อโชว์ที่หน้าหลัก
  useEffect(() => {
    if (!reveal) return;
    // จำคำถามที่เล่นแล้วลงเครื่องนี้ (ทุกคน รวมผู้ชม) เพื่อกันซ้ำเมื่อเป็นหัวห้องรอบหน้า
    recordPlayed(reveal.prompt);
    if (!reveal.roles[playerId]) return; // ผู้ชมรอบนี้ ไม่บันทึกสถิติคะแนน
    const me = room.players.find((p) => p.id === playerId);
    if (!me) return;
    addGameRecord({
      at: Date.now(),
      code: room.code,
      name: me.name,
      role: ROLE_TAG[reveal.roles[playerId]]?.label ?? "-",
      points: reveal.roundPoints[playerId] ?? 0,
    });
    // เก็บครั้งเดียวตอนเข้า REVEAL — deps ว่างเพื่อไม่บันทึกซ้ำตอน re-render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!reveal) return null;

  const isHost = room.hostId === playerId;
  const bust = reveal.outcome === "bust";
  const sweep = reveal.outcome === "sweep";
  const caughtCount = reveal.caughtIds.length;

  const byId = new Map(room.players.map((p) => [p.id, p]));
  const blue = byId.get(reveal.blueId);
  const survivors = room.players.filter(
    (p) =>
      reveal.roles[p.id] !== "FISHERMAN" &&
      !reveal.caughtIds.includes(p.id) &&
      !(sweep && p.id === reveal.blueId)
  );

  const statusOf = (id: string): string => {
    const role = reveal.roles[id];
    if (role === "FISHERMAN")
      return bust ? "โป๊ะแตก" : sweep ? "กวาดเรียบ · จับครบทุกตัว" : `จับได้ ${caughtCount}`;
    if (sweep && id === reveal.blueId) return "ถูกจับ (ปิดท้าย)";
    if (reveal.caughtIds.includes(id)) return "ถูกจับ";
    return "รอด";
  };

  const rows = room.players
    .filter((p) => reveal.roles[p.id]) // ตัดผู้ชมที่เข้ามากลางรอบออก
    .sort((a, b) => (reveal.roundPoints[b.id] ?? 0) - (reveal.roundPoints[a.id] ?? 0));

  const nextRound = () =>
    getSocket().emit("game:nextRound", { excludePrompts: excludeFor(room) });
  const reset = () => getSocket().emit("game:reset");

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-6 pb-8 pt-12">
      <div className="flex items-center justify-between">
        <YouBadge room={room} playerId={playerId} />
        <span className="font-display text-sm text-mist">เฉลย · รอบจบแล้ว</span>
      </div>

      {/* verdict */}
      <div
        className={`mt-3 rounded-2xl border p-5 text-center ${
          bust ? "border-bluefish/40 bg-bluefish/10" : "border-lantern/40 bg-lantern/10"
        }`}
      >
        <div className="text-3xl">{bust ? "🫧" : sweep ? "🏆" : "🎣"}</div>
        <p
          className={`font-display mt-1 text-xl font-bold ${
            bust ? "text-bluefish" : "text-lantern"
          }`}
        >
          {bust ? "โป๊ะแตก! ปลาฟ้าเอาคืน" : sweep ? "กวาดเรียบ! ชาวประมงได้คนเดียว" : "จบการจับ!"}
        </p>
        <p className="mt-1 text-sm text-mist">
          {bust ? (
            <>
              ชาวประมงจับปลาแดงได้ <b className="text-foam">{caughtCount}</b> ตัว แล้วไปโดน{" "}
              <b className="text-bluefish">ปลาฟ้า “{blue?.name}”</b> — เสียแต้มทั้งรอบเหลือ 0
            </>
          ) : sweep ? (
            <>
              จับปลาแดงครบแล้วปิดท้ายด้วย <b className="text-bluefish">ปลาฟ้า “{blue?.name}”</b> —
              ชาวประมงได้ <b className="text-foam">+{caughtCount + 1}</b> คนเดียว (จับครบทุกตัว)
            </>
          ) : (
            <>
              ชาวประมงเก็บ <b className="text-foam">+{caughtCount}</b> · ปลาฟ้าคือ{" "}
              <b className="text-bluefish">{blue?.name}</b>
            </>
          )}
        </p>
      </div>

      {/* answer */}
      <p className="mt-4 text-xs uppercase tracking-widest text-mist-dim">คำตอบจริงคือ</p>
      <div className="mt-1 rounded-xl border border-kelp bg-surface p-4">
        <p className="text-base font-medium text-foam">{reveal.answer}</p>
      </div>

      {/* scoreboard */}
      <p className="mt-4 text-xs uppercase tracking-widest text-mist-dim">
        คะแนนรอบนี้ · ปลารอด {survivors.length} ตัว → คนละ {survivors.length}
      </p>
      <ul className="mt-2 flex flex-col gap-2">
        {rows.map((p) => {
          const role = reveal.roles[p.id];
          const pts = reveal.roundPoints[p.id] ?? 0;
          const tag = ROLE_TAG[role];
          return (
            <li
              key={p.id}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
                p.id === playerId ? "border-bluefish/60" : "border-kelp"
              } bg-surface`}
            >
              <span className="grid h-9 w-9 place-items-center rounded-full border border-kelp bg-abyss-2 text-lg">
                {p.avatar}
              </span>
              <span className="font-medium text-foam">{p.name}</span>
              <span
                className={`font-display rounded-full px-2.5 py-1 text-[0.7rem] ${tag.cls}`}
              >
                {tag.label} · {statusOf(p.id)}
              </span>
              <span
                className={`font-display ml-auto w-12 text-right font-semibold tabular-nums ${
                  pts > 0 ? "text-good" : "text-mist-dim"
                }`}
              >
                {pts > 0 ? `+${pts}` : "0"}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="flex-1" />

      {isHost ? (
        <div className="mt-4 flex gap-2">
          <button
            onClick={reset}
            className="font-display flex-[0.7] rounded-2xl border border-kelp px-4 py-4 text-foam"
          >
            จบเกม
          </button>
          <button
            onClick={nextRound}
            className="font-display flex-[1.3] rounded-2xl bg-lantern px-4 py-4 text-lg font-semibold text-abyss"
          >
            รอบใหม่ →
          </button>
        </div>
      ) : (
        <p className="mt-4 text-center text-sm text-mist-dim">รอโฮสต์เริ่มรอบใหม่…</p>
      )}
    </main>
  );
}
