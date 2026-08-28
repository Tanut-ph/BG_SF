"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { PublicRoom, RolePayload } from "@/shared/contracts";
import { getSocket } from "@/lib/socket";
import { clearIdentity, loadIdentity } from "@/lib/identity";
import Lobby from "./Lobby";
import PlayScreen from "./PlayScreen";
import GuessScreen from "./GuessScreen";
import RevealScreen from "./RevealScreen";
import Settings from "./Settings";
import History from "./History";

type View = "room" | "settings" | "history";

export default function RoomClient({ code }: { code: string }) {
  const router = useRouter();
  const [room, setRoom] = useState<PublicRoom | null>(null);
  const [playerId, setPlayerId] = useState("");
  const [role, setRole] = useState<RolePayload | null>(null);
  const [view, setView] = useState<View>("room");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const id = loadIdentity(code);
    if (!id) {
      router.replace(`/join?code=${code}`);
      return;
    }
    setPlayerId(id.playerId);
    const socket = getSocket();

    const doRejoin = () => {
      socket.emit("room:rejoin", { code, token: id.token }, (res) => {
        if (!res.ok) {
          clearIdentity(code);
          router.replace(`/join?code=${code}`);
          return;
        }
        setRoom(res.data.room);
      });
    };

    const onUpdated = (r: PublicRoom) => {
      setRoom(r);
      if (r.phase === "LOBBY") setRole(null); // เคลียร์บทบาทเมื่อกลับห้องรอ
    };
    const onRole = (payload: RolePayload) => setRole(payload);
    const onNotice = (msg: string) => {
      setNotice(msg);
      window.setTimeout(() => setNotice(""), 4000);
    };
    const onKicked = () => {
      clearIdentity(code);
      router.replace("/?kicked=1");
    };

    socket.on("room:updated", onUpdated);
    socket.on("role:assigned", onRole);
    socket.on("room:notice", onNotice);
    socket.on("room:kicked", onKicked);
    socket.on("connect", doRejoin);
    doRejoin();

    return () => {
      socket.off("room:updated", onUpdated);
      socket.off("role:assigned", onRole);
      socket.off("room:notice", onNotice);
      socket.off("room:kicked", onKicked);
      socket.off("connect", doRejoin);
    };
  }, [code, router]);

  const leave = () => {
    getSocket().emit("room:leave");
    clearIdentity(code);
    router.replace("/");
  };

  if (!room) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md items-center justify-center px-6 text-mist">
        กำลังเข้าห้อง…
      </main>
    );
  }

  let content: ReactNode;
  if (view === "settings") {
    content = <Settings room={room} onBack={() => setView("room")} />;
  } else if (view === "history") {
    content = <History room={room} playerId={playerId} onBack={() => setView("room")} />;
  } else {
    switch (room.phase) {
      case "LOBBY":
        content = (
          <Lobby
            room={room}
            playerId={playerId}
            onLeave={leave}
            onOpenSettings={() => setView("settings")}
            onOpenHistory={() => setView("history")}
          />
        );
        break;
      case "GUESSING":
        content = <GuessScreen room={room} playerId={playerId} role={role} />;
        break;
      case "REVEAL":
        content = <RevealScreen room={room} playerId={playerId} />;
        break;
      default: // READING, DISCUSSION
        content = <PlayScreen room={room} playerId={playerId} role={role} />;
    }
  }

  return (
    <>
      {notice && (
        <div className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-3">
          <div className="rounded-xl border border-lantern/50 bg-abyss-2/95 px-4 py-2.5 text-center text-sm text-foam shadow-lg backdrop-blur">
            {notice}
          </div>
        </div>
      )}
      {content}
    </>
  );
}
