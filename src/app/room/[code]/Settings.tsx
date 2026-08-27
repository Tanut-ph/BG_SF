"use client";

import { useEffect, useState } from "react";
import {
  DISCUSSION_MAX,
  DISCUSSION_MIN,
  READING_MAX,
  READING_MIN,
  type PublicRoom,
  type Question,
  type RoomSettings,
} from "@/shared/contracts";
import { getSocket } from "@/lib/socket";

function Stepper({
  value,
  onDelta,
  suffix = "วิ",
}: {
  value: number;
  onDelta: (d: number) => void;
  suffix?: string;
}) {
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onDelta(-1)}
        className="font-display grid h-9 w-9 place-items-center rounded-lg border border-kelp bg-surface text-lg text-foam hover:border-lantern"
      >
        −
      </button>
      <span className="font-display w-16 text-center font-semibold tabular-nums">
        {value} {suffix}
      </span>
      <button
        onClick={() => onDelta(1)}
        className="font-display grid h-9 w-9 place-items-center rounded-lg border border-kelp bg-surface text-lg text-foam hover:border-lantern"
      >
        ＋
      </button>
    </div>
  );
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      className={`relative h-7 w-12 shrink-0 rounded-full border transition ${
        on ? "border-lantern bg-lantern/30" : "border-kelp bg-surface"
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full transition-all ${
          on ? "left-[22px] bg-lantern" : "left-0.5 bg-mist"
        }`}
      />
    </button>
  );
}

export default function Settings({
  room,
  onBack,
}: {
  room: PublicRoom;
  onBack: () => void;
}) {
  const s = room.settings;
  const [questions, setQuestions] = useState<Question[]>([]);
  const [newPrompt, setNewPrompt] = useState("");
  const [newAnswer, setNewAnswer] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    getSocket().emit("questions:list", (res) => {
      if (res.ok) setQuestions(res.data);
    });
  }, []);

  const update = (partial: Partial<RoomSettings>) =>
    getSocket().emit("settings:update", partial);

  const addQ = () => {
    setError("");
    getSocket().emit("question:add", { prompt: newPrompt, answer: newAnswer }, (res) => {
      if (!res.ok) return setError(res.error);
      setQuestions(res.data);
      setNewPrompt("");
      setNewAnswer("");
    });
  };
  const removeQ = (index: number) => {
    getSocket().emit("question:remove", { index }, (res) => {
      if (!res.ok) return setError(res.error);
      setQuestions(res.data);
    });
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-6 pb-8 pt-12">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-sm text-mist-dim">
          ← กลับ
        </button>
        <span className="font-display text-sm text-mist">ตั้งค่าเกม</span>
      </div>

      {/* timers + toggle */}
      <div className="mt-4 flex flex-col divide-y divide-kelp rounded-2xl border border-kelp bg-surface/60 px-4">
        <div className="flex items-center gap-3 py-4">
          <div className="flex-1">
            <div className="font-medium">เวลาอ่านโจทย์</div>
            <div className="text-xs text-mist-dim">ให้ปลาอ่านบทบาท/คิดคำตอบปลอม</div>
          </div>
          <Stepper
            value={s.readingSeconds}
            onDelta={(d) => update({ readingSeconds: s.readingSeconds + d * 5 })}
          />
        </div>
        <div className="flex items-center gap-3 py-4">
          <div className="flex-1">
            <div className="font-medium">เวลาคุยกัน</div>
            <div className="text-xs text-mist-dim">ช่วงพูดคุยก่อนชาวประมงทาย</div>
          </div>
          <Stepper
            value={s.discussionSeconds}
            onDelta={(d) => update({ discussionSeconds: s.discussionSeconds + d * 10 })}
          />
        </div>
        <div className="flex items-center gap-3 py-4">
          <div className="flex-1">
            <div className="font-medium">ให้ชาวประมงกดจบเองได้</div>
            <div className="text-xs text-mist-dim">หยุดไล่จับเมื่อไรก็ได้</div>
          </div>
          <Toggle on={s.allowFinish} onClick={() => update({ allowFinish: !s.allowFinish })} />
        </div>
        <div className="flex items-center gap-3 py-4">
          <div className="flex-1">
            <div className="font-medium">ซ่อนคำถามจากชาวประมง</div>
            <div className="text-xs text-mist-dim">โหมดยาก — ชาวประมงเดาจากคำตอบ/ท่าทีล้วน ๆ</div>
          </div>
          <Toggle
            on={s.hideQuestionFromFisherman}
            onClick={() =>
              update({ hideQuestionFromFisherman: !s.hideQuestionFromFisherman })
            }
          />
        </div>
      </div>

      {/* question bank */}
      <p className="mt-6 text-xs uppercase tracking-widest text-mist-dim">
        คลังคำถาม · {questions.length} ข้อ
      </p>
      <div className="mt-2 flex flex-col gap-2">
        <input
          value={newPrompt}
          onChange={(e) => setNewPrompt(e.target.value)}
          placeholder="คำถามใหม่…"
          className="w-full rounded-xl border border-kelp bg-surface px-3 py-2.5 text-sm text-foam placeholder:text-mist-dim focus:border-bluefish focus:outline-none"
        />
        <div className="flex gap-2">
          <input
            value={newAnswer}
            onChange={(e) => setNewAnswer(e.target.value)}
            placeholder="คำตอบจริง…"
            className="flex-1 rounded-xl border border-kelp bg-surface px-3 py-2.5 text-sm text-foam placeholder:text-mist-dim focus:border-bluefish focus:outline-none"
          />
          <button
            onClick={addQ}
            disabled={!newPrompt.trim() || !newAnswer.trim()}
            className="font-display rounded-xl bg-bluefish px-4 text-sm font-semibold text-abyss disabled:opacity-40"
          >
            เพิ่ม
          </button>
        </div>
      </div>
      {error && <p className="mt-2 text-sm text-redfish">{error}</p>}

      <ul className="mt-3 flex flex-col gap-2">
        {questions.map((q, i) => (
          <li
            key={i}
            className="flex items-start gap-2 rounded-xl border border-kelp bg-surface px-3 py-2.5"
          >
            <div className="flex-1">
              <div className="text-sm text-foam">{q.prompt}</div>
              <div className="text-xs text-bluefish">{q.answer}</div>
            </div>
            <button
              onClick={() => removeQ(i)}
              className="shrink-0 rounded-lg px-2 py-1 text-sm text-redfish hover:bg-redfish/10"
              aria-label="ลบ"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}
