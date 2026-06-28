import type { ChatMessage, Player, Room } from "@/types/domain";
import { GameState, PlayerState, RoomState } from "@/types/state";

const BOT_NAMES = ["Leo", "Mira", "Ada", "Kenji", "Noor", "Rin", "Sam"];

function makePlayer(
  id: string,
  displayName: string,
  score: number,
  opts: Partial<Player> = {},
): Player {
  const now = Date.now();
  return {
    id,
    displayName,
    avatar: null,
    isGuest: true,
    state: PlayerState.GUESSING,
    score,
    connected: true,
    joinedAt: now,
    guessedCorrectly: false,
    ...opts,
  };
}

const MOCK_CHAT: ChatMessage[] = [
  {
    id: "chat-1",
    playerId: "player-bot-0",
    message: "is it a boat?",
    timestamp: Date.now() - 120_000,
    kind: "guess",
  },
  {
    id: "chat-2",
    playerId: "system",
    message: "Leo was close!",
    timestamp: Date.now() - 110_000,
    kind: "system",
  },
  {
    id: "chat-3",
    playerId: "player-bot-1",
    message: "umbrella",
    timestamp: Date.now() - 90_000,
    kind: "solved",
  },
  {
    id: "chat-4",
    playerId: "system",
    message: "Mira guessed the word!",
    timestamp: Date.now() - 89_000,
    kind: "system",
  },
  {
    id: "chat-5",
    playerId: "player-bot-2",
    message: "nice one!",
    timestamp: Date.now() - 60_000,
    kind: "chat",
  },
];

export interface MockGameData {
  room: Room;
  chat: ChatMessage[];
  wordChoices: null;
  revealedWord: null;
}

export function fetchMockGame(roomCode: string, selfName: string): Promise<MockGameData> {
  const selfId = "player-self";
  const now = Date.now();
  const scores = [420, 380, 310, 260, 180, 140, 90, 50];

  const players: Player[] = [
    makePlayer(selfId, selfName || "You", scores[0], {
      state: PlayerState.DRAWING,
      isGuest: false,
    }),
    ...BOT_NAMES.map((name, i) =>
      makePlayer(`player-bot-${i}`, name, scores[i + 1] ?? 0, {
        guessedCorrectly: i === 1,
      }),
    ),
  ];

  const room: Room = {
    id: `room-${roomCode.toLowerCase()}`,
    code: roomCode.toUpperCase(),
    hostId: selfId,
    state: RoomState.PLAYING,
    createdAt: now,
    lastActivity: now,
    players,
    spectators: [],
    game: {
      state: GameState.DRAWING,
      round: 2,
      totalRounds: 3,
      currentDrawerId: selfId,
      currentWord: "umbrella",
      currentWordHints: "u _ _ _ _ _ _ _",
      startedAt: now - 45_000,
      remainingTime: 47,
      scores: {
        playerScores: players.map((p) => ({ playerId: p.id, score: p.score })),
      },
    },
    document: {
      id: "doc-demo",
      version: 0,
      createdAt: now,
      operations: [],
      shapes: [],
    },
  };

  return Promise.resolve({
    room,
    chat: MOCK_CHAT,
    wordChoices: null,
    revealedWord: null,
  });
}

export function getMockChatMessages(): ChatMessage[] {
  return MOCK_CHAT;
}
