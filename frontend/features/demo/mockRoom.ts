import type { ChatMessage, Room, RoomPlayer } from "@/types/room";

export const DEMO_ROOM_CODE = "DEMO";

export const DEMO_SELF_ID = "player-you";

export type DemoRole = "drawer" | "guesser";

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

/** Static room snapshot for ROUND_ACTIVE layout testing. */
export function createDemoRoom(
  remainingSeconds: number,
  role: DemoRole = "drawer",
): Room {
  const you = DEMO_PLAYERS[0]!;
  const maya = DEMO_PLAYERS[1]!;
  const drawer = role === "drawer" ? you : maya;

  return {
    code: DEMO_ROOM_CODE,
    hostId: DEMO_SELF_ID,
    status: "PLAYING",
    maxPlayers: 12,
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
        id: drawer.id,
        name: drawer.name,
        avatarUrl: drawer.avatarUrl,
      },
      activePlayerIds: DEMO_PLAYERS.map((p) => p.id),
      waitingPlayerIds: [],
      wordHint: "_ _ _ _ _ _",
      wordLength: 6,
      // Secret word only for the drawer seat (matches live game payload).
      secretWord: role === "drawer" ? "BANANA" : null,
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
          roundPoints: role === "drawer" ? 50 : 0,
          hasGuessedCorrectly: role === "drawer",
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
      guessedPlayerIds: role === "drawer" ? ["player-maya"] : [],
      winnerId: null,
      roundSummary: null,
      // Fake drawing id so guesser reaction chrome shows in layout tests.
      drawingId: role === "guesser" ? "demo-drawing" : null,
      likes: role === "guesser" ? 3 : 0,
      dislikes: role === "guesser" ? 1 : 0,
      myReaction: null,
    },
  };
}

export function createDemoChatSeed(role: DemoRole): ChatMessage[] {
  const drawerLine =
    role === "drawer"
      ? "Round 2 — You are drawing!"
      : "Round 2 — Maya is drawing!";

  return [
    {
      id: "msg-1",
      kind: "system",
      message: drawerLine,
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
    ...(role === "drawer"
      ? [
          {
            id: "msg-4",
            kind: "correct_guess" as const,
            message: "got the word!",
            playerId: "player-maya",
            playerName: "Maya",
            at: Date.now() - 8_000,
          },
        ]
      : []),
  ];
}
