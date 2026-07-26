"use client";

import { useCallback, useEffect, useState } from "react";
import {
  appWebSocket,
  type ReactionUpdate,
} from "@/services/app-websocket";
import type { ReactionValue } from "@/components/reactions/ReactionBar";

export interface DrawingReactionState {
  drawingId: string | null;
  likes: number;
  dislikes: number;
  myReaction: ReactionValue;
}

/**
 * Live reaction tallies for the current round's drawing.
 * Optimistic local updates; reconciles from REACTION_UPDATED broadcasts.
 */
export function useDrawingReactions(
  roomCode: string | undefined,
  phase: string | undefined,
  seed?: {
    drawingId: string | null;
    likes: number;
    dislikes: number;
    myReaction: ReactionValue;
  },
) {
  const [state, setState] = useState<DrawingReactionState>({
    drawingId: seed?.drawingId ?? null,
    likes: seed?.likes ?? 0,
    dislikes: seed?.dislikes ?? 0,
    myReaction: seed?.myReaction ?? null,
  });

  // Reset / seed when the round drawing changes.
  useEffect(() => {
    setState({
      drawingId: seed?.drawingId ?? null,
      likes: seed?.likes ?? 0,
      dislikes: seed?.dislikes ?? 0,
      myReaction: seed?.myReaction ?? null,
    });
  }, [
    roomCode,
    seed?.drawingId,
    seed?.likes,
    seed?.dislikes,
    seed?.myReaction,
  ]);

  useEffect(() => {
    if (phase !== "ROUND_ACTIVE" && phase !== "ROUND_END") {
      return;
    }
    return appWebSocket.subscribeReactions((update: ReactionUpdate) => {
      setState((prev) => {
        if (prev.drawingId && update.drawingId !== prev.drawingId) {
          return prev;
        }
        const nextMine =
          update.userId && update.userId === appWebSocket.selfUserId
            ? (update.reaction as ReactionValue)
            : prev.myReaction;
        // Prefer explicit self update; otherwise keep local mine.
        const myReaction =
          update.userId === appWebSocket.selfUserId
            ? (update.reaction as ReactionValue)
            : nextMine;
        return {
          drawingId: update.drawingId || prev.drawingId,
          likes: update.likes,
          dislikes: update.dislikes,
          myReaction,
        };
      });
    });
  }, [roomCode, phase]);

  const setReaction = useCallback(
    (reaction: ReactionValue) => {
      if (!state.drawingId) return;
      setState((prev) => {
        let likes = prev.likes;
        let dislikes = prev.dislikes;
        if (prev.myReaction === "like") likes = Math.max(0, likes - 1);
        if (prev.myReaction === "dislike") dislikes = Math.max(0, dislikes - 1);
        if (reaction === "like") likes += 1;
        if (reaction === "dislike") dislikes += 1;
        return {
          ...prev,
          likes,
          dislikes,
          myReaction: reaction,
        };
      });
      appWebSocket.setReaction(reaction, state.drawingId);
    },
    [state.drawingId],
  );

  return { ...state, setReaction };
}
