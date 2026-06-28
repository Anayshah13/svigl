import type { Player, Room } from "@/types/domain";
import { PlayerState, RoomState } from "@/types/state";

const BOT_NAMES = ["Leo", "Mira", "Ada", "Kenji", "Noor", "Rin", "Sam"];

function makePlayer(
  id: string,
  displayName: string,
  opts: Partial<Player> = {},
): Player {
  const now = Date.now();
  return {
    id,
    displayName,
    avatar: null,
    isGuest: true,
    state: PlayerState.CONNECTED,
    score: 0,
    connected: true,
    joinedAt: now,
    guessedCorrectly: false,
    ...opts,
  };
}

export function fetchMockLobby(roomCode: string, selfName: string): Promise<Room> {
  const selfId = "player-self";
  const now = Date.now();

  const players: Player[] = [
    makePlayer(selfId, selfName || "You", {
      state: PlayerState.READY,
      isGuest: false,
    }),
    ...BOT_NAMES.map((name, i) =>
      makePlayer(`player-bot-${i}`, name, {
        state: i % 2 === 0 ? PlayerState.READY : PlayerState.CONNECTED,
      }),
    ),
  ];

  return Promise.resolve({
    id: `room-${roomCode.toLowerCase()}`,
    code: roomCode.toUpperCase(),
    hostId: selfId,
    state: RoomState.LOBBY,
    createdAt: now,
    lastActivity: now,
    players,
    spectators: [],
    game: null,
    document: null,
  });
}

export const DEMO_ROOM_CODE = "DEMO";
