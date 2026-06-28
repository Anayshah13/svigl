"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import { FadeIn, FadeInItem } from "@/components/motion/FadeIn";
import { DoodleBackground } from "@/components/layout/DoodleBackground";
import { SviglLogo } from "@/components/layout/SviglLogo";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useRoomStore } from "@/stores/room";
import { useSessionStore } from "@/stores/session";
import { PlayerState } from "@/types/state";
import { palette } from "@/lib/colors";
import type { Player } from "@/types/domain";

const AVATAR_COLORS = [...palette];

function avatarColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function LobbyView({ roomCode }: { roomCode: string }) {
  const router = useRouter();
  const room = useRoomStore((s) => s.room);
  const selfId = useSessionStore((s) => s.selfId);
  const [localPlayers, setLocalPlayers] = useState<Player[]>([]);

  const players = localPlayers.length > 0 ? localPlayers : (room?.players ?? []);
  const spectators = room?.spectators ?? [];
  const isHost = !!room && !!selfId && room.hostId === selfId;
  const self = players.find((p) => p.id === selfId);
  const isReady = self?.state === PlayerState.READY;
  const allReady =
    players.length >= 2 && players.every((p) => p.state === PlayerState.READY);
  const canStart = isHost && allReady;

  const toggleReady = () => {
    if (!selfId) return;
    setLocalPlayers(
      players.map((p) =>
        p.id === selfId
          ? {
              ...p,
              state: p.state === PlayerState.READY ? PlayerState.CONNECTED : PlayerState.READY,
            }
          : p,
      ),
    );
  };

  const startGame = () => router.push("/game");
  const leaveRoom = () => router.push("/");

  return (
    <div className="relative flex flex-1 flex-col">
      <DoodleBackground />
      <header className="relative z-10 flex h-14 items-center border-b border-gray-200/80 bg-white/80 px-6 backdrop-blur-xl">
        <SviglLogo />
      </header>
      <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6">
        <FadeIn>
          <header className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-plum">Room</p>
              <motion.h1
                className="font-mono text-4xl font-bold tracking-[0.3em] text-ink"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                {roomCode}
              </motion.h1>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={leaveRoom}>
                Leave
              </Button>
              {self && self.state !== PlayerState.SPECTATING && (
                <Button variant="secondary" size="sm" onClick={toggleReady}>
                  {isReady ? "Unready" : "Ready"}
                </Button>
              )}
              <Button disabled={!canStart} onClick={startGame}>
                Start game
              </Button>
            </div>
          </header>
        </FadeIn>

        <FadeIn delay={0.1}>
          <Card>
            <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-gray-400">
              Players ({players.length}/10)
            </h2>
            <ul className="divide-y divide-gray-100">
              {players.map((p) => (
                <FadeInItem key={p.id}>
                  <motion.li
                    whileHover={{ x: 4 }}
                    className="flex list-none items-center justify-between py-3 text-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-gray-800"
                        style={{ backgroundColor: avatarColor(p.id) }}
                      >
                        {p.displayName.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-ink">
                        {p.displayName}
                        {p.id === selfId && (
                          <span className="ml-1 text-xs text-gray-400">(you)</span>
                        )}
                        {p.id === room?.hostId && (
                          <span className="ml-1 text-xs text-plum">★ host</span>
                        )}
                      </span>
                    </div>
                    <span
                      className={[
                        "rounded-full px-2 py-0.5 text-xs font-semibold uppercase",
                        p.state === PlayerState.READY
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-gray-50 text-gray-400",
                      ].join(" ")}
                    >
                      {p.state === PlayerState.READY ? "ready" : p.state.toLowerCase()}
                    </span>
                  </motion.li>
                </FadeInItem>
              ))}
            </ul>
            {players.length >= 2 && !allReady && (
              <p className="mt-3 text-xs text-gray-400">
                Waiting for all players to ready up… (prototype — toggle your ready state)
              </p>
            )}
          </Card>
        </FadeIn>

        {spectators.length > 0 && (
          <FadeIn delay={0.2}>
            <Card>
              <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-gray-400">
                Spectators ({spectators.length})
              </h2>
              <ul className="divide-y divide-gray-100">
                {spectators.map((p) => (
                  <li key={p.id} className="flex items-center justify-between py-3 text-sm">
                    <span className="font-medium text-ink">{p.displayName}</span>
                    <span className="text-xs text-gray-400">spectating</span>
                  </li>
                ))}
              </ul>
            </Card>
          </FadeIn>
        )}
      </div>
    </div>
  );
}
