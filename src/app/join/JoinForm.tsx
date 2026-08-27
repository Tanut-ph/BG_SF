"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AVATARS, NAME_MAX, type JoinedRoom, type Result } from "@/shared/contracts";
import { getSocket } from "@/lib/socket";
import { saveIdentity } from "@/lib/identity";

export default function JoinForm() {
  const router = useRouter();
  const params = useSearchParams();

  const codeParam = params.get("code");
  const isCreate = params.get("mode") === "create" || !codeParam;

  const [avatar, setAvatar] = useState<string>(AVATARS[0]);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handleResult = (n: string) => (res: Result<JoinedRoom>) => {
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    saveIdentity({
      code: res.data.room.code,
      playerId: res.data.playerId,
      token: res.data.token,
      name: n,
      avatar,
    });
    router.replace(`/room/${res.data.room.code}`);
  };

  const submit = () => {
    const n = name.trim();
    if (!n) {
      setError("ใส่ชื่อก่อนนะ");
      return;
    }
    setBusy(true);
    setError("");
    const socket = getSocket();
    if (isCreate) {
      socket.emit("room:create", { name: n, avatar }, handleResult(n));
    } else {
      socket.emit("room:join", { code: codeParam!, name: n, avatar }, handleResult(n));
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-6 pb-10 pt-14">
      <button
        onClick={() => router.back()}
        className="self-start text-sm text-mist-dim"
      >
        ← กลับ
      </button>

      <div className="mt-4 text-center">
        <div className="text-4xl">🐟</div>
        <h1 className="font-display mt-2 text-2xl font-semibold text-foam">
          ตั้งชื่อของคุณ
        </h1>
        <p className="mt-1 text-sm text-mist">
          {isCreate ? "สร้างห้องใหม่" : `กำลังเข้าห้อง ${codeParam}`}
        </p>
      </div>

      <p className="mt-8 mb-2 text-xs uppercase tracking-widest text-mist-dim">
        เลือกตัวปลา
      </p>
      <div className="grid grid-cols-4 gap-3">
        {AVATARS.map((a) => (
          <button
            key={a}
            onClick={() => setAvatar(a)}
            className={`grid aspect-square place-items-center rounded-xl border text-2xl transition ${
              avatar === a
                ? "border-bluefish bg-bluefish/15 ring-2 ring-bluefish/40"
                : "border-kelp bg-surface"
            }`}
          >
            {a}
          </button>
        ))}
      </div>

      <p className="mt-6 mb-2 text-xs uppercase tracking-widest text-mist-dim">
        ชื่อในเกม
      </p>
      <input
        value={name}
        maxLength={NAME_MAX}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder="เช่น มิ้นท์"
        className="w-full rounded-2xl border border-kelp bg-surface px-4 py-4 text-lg text-foam placeholder:text-mist-dim focus:border-bluefish focus:outline-none"
      />

      {error && <p className="mt-3 text-sm text-redfish">{error}</p>}

      <div className="flex-1" />

      <button
        onClick={submit}
        disabled={busy}
        className="font-display mt-8 w-full rounded-2xl bg-bluefish px-4 py-4 text-lg font-semibold text-abyss shadow-lg shadow-bluefish/30 transition active:scale-[.99] disabled:opacity-50"
      >
        {busy ? "กำลังเข้าห้อง…" : isCreate ? "สร้างห้อง →" : "เข้าห้อง →"}
      </button>
    </main>
  );
}
