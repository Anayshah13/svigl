import type { Player, Room } from "@/types/domain";
import { GameState, PlayerState, RoomState } from "@/types/state";
import { useDocumentStore } from "@/stores/document";
import { useRoomStore } from "@/stores/room";
import { useSessionStore } from "@/stores/session";

const BOT_ID = "bot-mira";
const BOT_NAME = "Mira";
const DEMO_WORD = "lighthouse";

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ";

export function generateRoomCode(): string {
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

function createGuestId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `guest-${crypto.randomUUID().slice(0, 8)}`;
  }
  return `guest-${Math.random().toString(36).slice(2, 10)}`;
}

function createPlayer(
  id: string,
  displayName: string,
  state: PlayerState = PlayerState.CONNECTED,
): Player {
  return {
    id,
    displayName,
    avatar: null,
    isGuest: true,
    state,
    score: 0,
    connected: true,
    joinedAt: Date.now(),
    guessedCorrectly: false,
  };
}

export function buildLocalRoom(code: string, hostId: string, displayName: string): Room {
  const now = Date.now();
  const host = createPlayer(hostId, displayName.trim() || "Anonymous artist");
  const bot = createPlayer(BOT_ID, BOT_NAME, PlayerState.READY);

  return {
    id: `local-${code}`,
    code,
    hostId,
    state: RoomState.LOBBY,
    createdAt: now,
    lastActivity: now,
    players: [host, bot],
    spectators: [],
    game: null,
    document: null,
  };
}

function wordHints(word: string): string {
  return word
    .split("")
    .map((char) => (char === " " ? " " : "_"))
    .join(" ");
}

export function startLocalGame(room: Room, drawerId: string): Room {
  return {
    ...room,
    state: RoomState.PLAYING,
    players: room.players.map((player) => ({
      ...player,
      state:
        player.id === drawerId
          ? PlayerState.DRAWING
          : player.state === PlayerState.SPECTATING
            ? PlayerState.SPECTATING
            : PlayerState.GUESSING,
    })),
    game: {
      state: GameState.DRAWING,
      round: 1,
      totalRounds: 3,
      currentDrawerId: drawerId,
      currentWord: DEMO_WORD,
      currentWordHints: wordHints(DEMO_WORD),
      startedAt: Date.now(),
      remainingTime: 80,
      scores: {
        playerScores: room.players.map((player) => ({
          playerId: player.id,
          score: player.score,
        })),
      },
    },
  };
}

export function ensureLocalRoom(code: string): void {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return;

  const session = useSessionStore.getState();
  const roomStore = useRoomStore.getState();
  const displayName = session.displayName.trim() || "Anonymous artist";

  if (roomStore.room?.code === normalized && session.selfId) {
    return;
  }

  const selfId = session.selfId ?? createGuestId();
  session.setSelfId(selfId);
  if (!session.displayName.trim()) {
    session.setDisplayName(displayName);
  }

  roomStore.setRoom(buildLocalRoom(normalized, selfId, displayName));
}

export function togglePlayerReady(room: Room, playerId: string): Room {
  return {
    ...room,
    players: room.players.map((player) =>
      player.id === playerId
        ? {
            ...player,
            state:
              player.state === PlayerState.READY
                ? PlayerState.CONNECTED
                : PlayerState.READY,
          }
        : player,
    ),
  };
}

export function beginLocalGame(room: Room, hostId: string): Room {
  const playing = startLocalGame(room, hostId);
  useDocumentStore.getState().setDocument({
    id: `doc-${room.code}`,
    version: 0,
    createdAt: Date.now(),
    operations: [],
    shapes: [],
  });
  return playing;
}
