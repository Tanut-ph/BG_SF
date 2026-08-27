"use client";

import { useState } from "react";
import { MIN_PLAYERS, type PublicRoom } from "@/shared/contracts";
import { getSocket } from "@/lib/socket";

export default function Lobby({
  room,
  playerId,
  onLeave,
  onOpenSettings,
  onOpenHistory,
}: {
  room: PublicRoom;
  playerId: string;
  onLeave: () => void;
  onOpenSettings: () => void;
  onOpenHistory: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const isHost = room.hostId === playerId;
  const me = room.players.find((p) => p.id === playerId);
  const others = room.players.filter((p) => !p.isHost);
  const readyCount = others.filter((p) => p.ready).length;
  const allReady = others.length > 0 && readyCount === others.length;
  const canStart = room.players.length >= MIN_PLAYERS && allReady;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(room.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* noop */
    }
  };

  const toggleReady = () => getSocket().emit("player:ready", { ready: !me?.ready });

  const start = () => {
    setError("");
    getSocket().emit("game:start", (res) => {
      if (!res.ok) setError(res.error);
    });
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-6 pb-8 pt-12">
      <div className="flex items-center justify-between">
        <span className="font-display text-sm text-mist">ห้องรอ</span>
        <div className="flex items-center gap-3 text-sm text-mist-dim">
          <button onClick={onOpenHistory}>🏆 ประวัติ</button>
          <button onClick={onLeave}>ออกจากห้อง</button>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-kelp bg-surface/70 p-5 text-center">
        <p className="text-xs uppercase tracking-widest text-mist-dim">
          บอกรหัสนี้ให้เพื่อนพิมพ์เข้าห้อง
        </p>
        <div className="font-display mt-1 text-5xl font-bold tracking-[0.28em] text-foam">
          {room.code}
        </div>
        <button
          onClick={copy}
          className="font-display mt-3 rounded-xl border border-kelp px-4 py-2 text-sm text-foam"
        >
          {copied ? "คัดลอกแล้ว ✓" : "📋 คัดลอกรหัส"}
        </button>
      </div>

      <p className="mt-5 text-center text-sm text-mist">
        ผู้เล่นในห้อง · {room.players.length} คน
      </p>
      <ul className="mt-2 flex flex-col gap-2">
        {room.players.map((p) => (
          <li
            key={p.id}
            className={`flex items-center gap-3 rounded-xl border bg-surface px-4 py-3 ${
              p.id === playerId ? "border-bluefish/60" : "border-kelp"
            } ${p.connected ? "" : "opacity-50"}`}
          >
            <span className="grid h-9 w-9 place-items-center rounded-full border border-kelp bg-abyss-2 text-lg">
              {p.avatar}
            </span>
            <span className="font-medium text-foam">{p.name}</span>
            <span className="ml-auto font-display text-xs">
              {p.isHost ? (
                <span className="text-lantern">โฮสต์</span>
              ) : !p.connected ? (
                <span className="text-mist-dim">หลุด</span>
              ) : p.ready ? (
                <span className="text-good">พร้อม ✓</span>
              ) : (
                <span className="text-mist-dim">ยังไม่พร้อม</span>
              )}
            </span>
          </li>
        ))}
      </ul>

      <div className="flex-1" />

      {error && <p className="mb-3 text-center text-sm text-redfish">{error}</p>}

      {isHost ? (
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <button
              onClick={onOpenSettings}
              className="font-display shrink-0 rounded-2xl border border-kelp px-4 py-4 font-semibold text-foam"
            >
              ⚙︎ ตั้งค่า
            </button>
            <button
              onClick={start}
              disabled={!canStart}
              className="font-display flex-1 rounded-2xl bg-lantern px-4 py-4 text-lg font-semibold text-abyss shadow-lg shadow-lantern/30 transition active:scale-[.99] disabled:opacity-40"
            >
              เริ่มเกม 🎣
            </button>
          </div>
          <p className="text-center text-xs text-mist-dim">
            {room.players.length < MIN_PLAYERS
              ? `ต้องมีผู้เล่นอย่างน้อย ${MIN_PLAYERS} คนถึงจะเริ่มได้`
              : allReady
                ? "ทุกคนพร้อมแล้ว — เริ่มได้เลย!"
                : `รอผู้เล่นกดพร้อม · ${readyCount}/${others.length}`}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <button
            onClick={toggleReady}
            className={`font-display w-full rounded-2xl px-4 py-4 text-lg font-semibold shadow-lg transition active:scale-[.99] ${
              me?.ready
                ? "bg-good text-abyss shadow-good/30"
                : "bg-bluefish text-abyss shadow-bluefish/30"
            }`}
          >
            {me?.ready ? "พร้อมแล้ว ✓ · กดเพื่อยกเลิก" : "กดเมื่อพร้อม ✋"}
          </button>
          <p className="text-center text-xs text-mist-dim">
            รอโฮสต์เริ่มเกมเมื่อทุกคนพร้อม
          </p>
        </div>
      )}
    </main>
  );
}
