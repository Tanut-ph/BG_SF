"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const canJoin = /^\d{4}$/.test(code);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-6 pb-10 pt-16">
      <div className="text-center">
        <div className="text-5xl">🎣</div>
        <h1 className="font-display mt-2 text-4xl font-bold text-foam">โป๊ะแตก</h1>
        <p className="mt-1 text-sm text-mist">จับปลาโกหกในวงเพื่อน 3–10 คน</p>
      </div>

      <div className="mt-10 flex flex-col gap-4">
        <button
          onClick={() => router.push("/join?mode=create")}
          className="font-display w-full rounded-2xl bg-bluefish px-4 py-4 text-lg font-semibold text-abyss shadow-lg shadow-bluefish/30 transition active:scale-[.99]"
        >
          ＋ สร้างห้องใหม่
        </button>

        <div className="flex items-center gap-3 text-xs text-mist-dim">
          <div className="h-px flex-1 bg-kelp" />
          หรือเข้าห้อง
          <div className="h-px flex-1 bg-kelp" />
        </div>

        <input
          inputMode="numeric"
          maxLength={4}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          placeholder="ใส่รหัสห้อง 4 หลัก"
          className="w-full rounded-2xl border border-kelp bg-surface px-4 py-4 text-center text-lg tracking-[0.3em] text-foam placeholder:tracking-normal placeholder:text-mist-dim focus:border-bluefish focus:outline-none"
        />
        <button
          onClick={() => canJoin && router.push(`/join?code=${code}`)}
          disabled={!canJoin}
          className="font-display w-full rounded-2xl border border-kelp px-4 py-4 font-semibold text-foam transition disabled:opacity-40"
        >
          เข้าห้อง
        </button>
      </div>
    </main>
  );
}
