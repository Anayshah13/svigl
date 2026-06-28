// UI domain types — see docs/domain_model.md.

import type { DrawingDocument } from "./drawing";
import type { DrawerConnectionState, GameState, PlayerState, RoomState } from "./state";

export interface Player {
  id: string;
  displayName: string;
  avatar: string | null;
  isGuest: boolean;
  state: PlayerState;
  score: number;
  connected: boolean;
  joinedAt: number;
  guessedCorrectly: boolean;
}

export interface PlayerScore {
  playerId: string;
  score: number;
}

export interface Scoreboard {
  playerScores: PlayerScore[];
}

export interface Game {
  state: GameState;
  round: number;
  totalRounds: number;
  currentDrawerId: string | null;
  /** Hidden from guessers during drawing; shown to the drawer in the prototype. */
  currentWord: string | null;
  currentWordHints: string | null;
  startedAt: number | null;
  remainingTime: number | null;
  drawerConnectionState?: DrawerConnectionState;
  scores: Scoreboard;
}

export interface Room {
  id: string;
  code: string;
  hostId: string;
  state: RoomState;
  createdAt: number;
  lastActivity: number;
  players: Player[];
  spectators: Player[];
  game: Game | null;
  document: DrawingDocument | null;
}

export interface ChatMessage {
  id: string;
  playerId: string;
  message: string;
  timestamp: number;
  /** How the UI should render a chat line. */
  kind: "chat" | "guess" | "system" | "solved";
}

/** Gallery card data for the browse page. */
export interface GalleryEntry {
  id: string;
  authorId: string;
  authorName: string;
  roomId: string;
  roomCode: string;
  word: string;
  replay: DrawingDocument;
  upvotes: number;
  downvotes: number;
  publishedAt: number;
}
