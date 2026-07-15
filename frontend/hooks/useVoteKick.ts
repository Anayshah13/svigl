"use client";

import { useCallback, useEffect, useState } from "react";
import { appWebSocket, type VoteKickTally } from "@/services/app-websocket";

export type VoteKickTallies = Record<string, VoteKickTally>;

/** Classic majority: floor(N/2)+1 */
export function requiredVotes(playerCount: number): number {
  if (playerCount < 1) return 1;
  return Math.floor(playerCount / 2) + 1;
}

/**
 * Live vote-kick tallies for the current room.
 * Clears on GAME_STARTED / lobby / room-wide clear; updates from VOTE_KICK_UPDATE.
 */
export function useVoteKick(
  roomCode: string | undefined,
  playerCount: number,
  playerIds: string[] = [],
  phase?: string,
) {
  const [tallies, setTallies] = useState<VoteKickTallies>({});

  useEffect(() => {
    setTallies({});
    return appWebSocket.subscribeVoteKick((update) => {
      if (update.cleared) {
        setTallies({});
        return;
      }
      if (!update.targetId) return;
      setTallies((prev) => {
        if (update.votes <= 0) {
          if (!(update.targetId in prev)) return prev;
          const next = { ...prev };
          delete next[update.targetId];
          return next;
        }
        return {
          ...prev,
          [update.targetId]: update,
        };
      });
    });
  }, [roomCode]);

  // Votes only live during the drawing turn.
  useEffect(() => {
    if (phase !== "ROUND_ACTIVE") {
      setTallies({});
    }
  }, [phase, roomCode]);

  // Drop tallies for players who left; refresh required when N changes.
  const playerIdsKey = playerIds.join(",");
  useEffect(() => {
    const idSet = new Set(playerIdsKey ? playerIdsKey.split(",") : []);
    setTallies((prev) => {
      const needed = requiredVotes(playerCount);
      let changed = false;
      const next: VoteKickTallies = {};
      for (const [id, tally] of Object.entries(prev)) {
        if (!idSet.has(id)) {
          changed = true;
          continue;
        }
        if (tally.required !== needed) {
          next[id] = { ...tally, required: needed, playerCount };
          changed = true;
        } else {
          next[id] = tally;
        }
      }
      return changed ? next : prev;
    });
  }, [playerCount, playerIdsKey]);

  const voteKick = useCallback((targetId: string, retract = false) => {
    appWebSocket.voteKick(targetId, retract);
  }, []);

  const toggleVoteKick = useCallback(
    (targetId: string, selfId: string | undefined) => {
      if (!selfId) return;
      const tally = tallies[targetId];
      const already = Boolean(tally?.voterIds.includes(selfId));
      appWebSocket.voteKick(targetId, already);
    },
    [tallies],
  );

  return { tallies, voteKick, toggleVoteKick };
}
