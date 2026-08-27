"use client";

import { useEffect, useState } from "react";

/** นับถอยหลังจาก deadline (absolute ms) ที่ server กำหนด — client คำนวณเองทุกวินาที */
export function Countdown({ deadline }: { deadline: number | null }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (deadline == null) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [deadline]);

  if (deadline == null) return null;

  const remain = Math.max(0, Math.ceil((deadline - now) / 1000));
  const mm = Math.floor(remain / 60);
  const ss = remain % 60;
  return (
    <span className="tabular-nums">
      {mm}:{String(ss).padStart(2, "0")}
    </span>
  );
}
