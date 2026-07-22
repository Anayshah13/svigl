import type { ChatMessage, Room, RoomPlayer } from "@/types/room";

export const DEMO_ROOM_CODE = "DEMO";

export const DEMO_SELF_ID = "player-you";

const DEMO_PLAYERS: RoomPlayer[] = [
  {
    id: DEMO_SELF_ID,
    name: "You",
    avatarUrl: null,
    isReady: true,
    isWaiting: false,
    isConnected: true,
    score: 420,
  },
  {
    id: "player-maya",
    name: "Maya",
    avatarUrl: null,
    isReady: true,
    isWaiting: false,
    isConnected: true,
    score: 380,
  },
  {
    id: "player-leo",
    name: "Leo",
    avatarUrl: null,
    isReady: true,
    isWaiting: false,
    isConnected: true,
    score: 290,
  },
  {
    id: "player-sam",
    name: "Sam",
    avatarUrl: null,
    isReady: true,
    isWaiting: false,
    isConnected: true,
    score: 210,
  },
];

/** Static room snapshot matching ROUND_ACTIVE drawer perspective. */
export function createDemoRoom(remainingSeconds: number): Room {
  const you = DEMO_PLAYERS[0]!;

  return {
    code: DEMO_ROOM_CODE,
    hostId: DEMO_SELF_ID,
    status: "PLAYING",
    maxPlayers: 8,
    createdAt: new Date().toISOString(),
    players: DEMO_PLAYERS,
    settings: {
      rounds: 3,
      roundDurationSeconds: 80,
    },
    readyPlayerIds: DEMO_PLAYERS.map((p) => p.id),
    waitingPlayerIds: [],
    canStart: false,
    revision: 1,
    game: {
      sessionId: "demo-session",
      phase: "ROUND_ACTIVE",
      revision: 1,
      serverTime: new Date().toISOString(),
      phaseEndsAt: null,
      remainingSeconds,
      roundNumber: 2,
      currentTurn: 1,
      totalRounds: 3,
      drawer: {
        id: you.id,
        name: you.name,
        avatarUrl: you.avatarUrl,
      },
      activePlayerIds: DEMO_PLAYERS.map((p) => p.id),
      waitingPlayerIds: [],
      wordHint: "_ _ _ _ _ _",
      wordLength: 6,
      secretWord: "BANANA",
      wordChoices: null,
      scores: [
        {
          playerId: DEMO_SELF_ID,
          score: 420,
          roundPoints: 0,
          hasGuessedCorrectly: false,
          isActive: true,
        },
        {
          playerId: "player-maya",
          score: 380,
          roundPoints: 50,
          hasGuessedCorrectly: true,
          isActive: true,
        },
        {
          playerId: "player-leo",
          score: 290,
          roundPoints: 0,
          hasGuessedCorrectly: false,
          isActive: true,
        },
        {
          playerId: "player-sam",
          score: 210,
          roundPoints: 0,
          hasGuessedCorrectly: false,
          isActive: true,
        },
      ],
      guessedPlayerIds: ["player-maya"],
      winnerId: null,
      roundSummary: null,
    },
  };
}

export const DEMO_CHAT_SEED: ChatMessage[] = [
  {
    id: "msg-1",
    kind: "system",
    message: "Round 2 — You are drawing!",
    playerId: null,
    playerName: null,
    at: Date.now() - 45_000,
  },
  {
    id: "msg-2",
    kind: "chat",
    message: "is it a fruit?",
    playerId: "player-leo",
    playerName: "Leo",
    at: Date.now() - 30_000,
  },
  {
    id: "msg-3",
    kind: "close_guess",
    message: "apple",
    playerId: "player-sam",
    playerName: "Sam",
    at: Date.now() - 18_000,
  },
  {
    id: "msg-4",
    kind: "correct_guess",
    message: "got the word!",
    playerId: "player-maya",
    playerName: "Maya",
    at: Date.now() - 8_000,
  },
];
