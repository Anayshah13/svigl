// Room, game, and player state enums — see docs/state_machine.md.

export const RoomState = {
  OPEN: "OPEN",
  LOBBY: "LOBBY",
  PLAYING: "PLAYING",
  GAME_FINISHED: "GAME_FINISHED",
  IDLE: "IDLE",
  DESTROYED: "DESTROYED",
} as const;
export type RoomState = (typeof RoomState)[keyof typeof RoomState];

export const GameState = {
  LOBBY: "LOBBY",
  WORD_SELECTION: "WORD_SELECTION",
  ROUND_COUNTDOWN: "ROUND_COUNTDOWN",
  DRAWING: "DRAWING",
  DRAWER_DISCONNECTED: "DRAWER_DISCONNECTED",
  ROUND_REVEAL: "ROUND_REVEAL",
  SCOREBOARD: "SCOREBOARD",
  NEXT_ROUND: "NEXT_ROUND",
  GAME_FINISHED: "GAME_FINISHED",
} as const;
export type GameState = (typeof GameState)[keyof typeof GameState];

export const PlayerState = {
  CONNECTED: "CONNECTED",
  READY: "READY",
  DRAWING: "DRAWING",
  GUESSING: "GUESSING",
  SOLVED: "SOLVED",
  WAITING: "WAITING",
  SPECTATING: "SPECTATING",
  DISCONNECTED: "DISCONNECTED",
  RECONNECTED: "RECONNECTED",
} as const;
export type PlayerState = (typeof PlayerState)[keyof typeof PlayerState];

export const DrawerConnectionState = {
  CONNECTED: "CONNECTED",
  DISCONNECTED: "DISCONNECTED",
  RECONNECTED: "RECONNECTED",
} as const;
export type DrawerConnectionState =
  (typeof DrawerConnectionState)[keyof typeof DrawerConnectionState];
