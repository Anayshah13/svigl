import type { GamePhase } from "@/types/room";

export type ChatInputPolicyInput = {
  phase: GamePhase;
  hasSelf: boolean;
  isDrawer: boolean;
  isWaiting: boolean;
  hasGuessed: boolean;
};

export type ChatInputPolicy = {
  /** Whether the chat/guess text field accepts input. */
  canSendChat: boolean;
  /**
   * Whether an exact guess would count for points this drawing.
   * Informational for UI; the server remains authoritative.
   */
  canScoreGuess: boolean;
  placeholder: string;
  disabledReason?: string;
  /** Shown under the input when chat is enabled and context needs explanation. */
  inputHint?: string;
  waitingBanner?: string;
};

const PHASE_DISABLED_REASON: Partial<Record<GamePhase, string>> = {
  WORD_SELECTION: "Waiting for the drawer to pick a word…",
  COUNTDOWN: "Round starting soon…",
  ROUND_END: "Round over — next turn soon.",
  GAME_FINISHED: "Game over.",
  LOBBY: "Guessing is only open during the round.",
};

const WAITING_BANNER_ACTIVE =
  "Watching this drawing — chat and guesses work now; scoring starts on the next drawing.";
const WAITING_BANNER_PENDING =
  "You'll join on the next drawing.";

/**
 * Pure phase × role policy for the in-game chat/guess input.
 * Waiting mid-drawing players may chat/guess; scoring starts next drawing.
 * Correct guessers keep chat (private on the server).
 */
export function getChatInputPolicy(input: ChatInputPolicyInput): ChatInputPolicy {
  const { phase, hasSelf, isDrawer, isWaiting, hasGuessed } = input;
  const isActiveDrawing = phase === "ROUND_ACTIVE";
  const waitingBanner = isWaiting
    ? isActiveDrawing
      ? WAITING_BANNER_ACTIVE
      : WAITING_BANNER_PENDING
    : undefined;

  if (!isActiveDrawing) {
    return {
      canSendChat: false,
      canScoreGuess: false,
      placeholder: "Chat disabled",
      disabledReason:
        PHASE_DISABLED_REASON[phase] ??
        "Guessing is only open during the round.",
      waitingBanner,
    };
  }

  if (isDrawer) {
    return {
      canSendChat: false,
      canScoreGuess: false,
      placeholder: "Chat disabled",
      disabledReason: "You're drawing — chat is disabled.",
      waitingBanner,
    };
  }

  if (!hasSelf) {
    return {
      canSendChat: false,
      canScoreGuess: false,
      placeholder: "Chat disabled",
      disabledReason: "Guessing is only open during the round.",
      waitingBanner,
    };
  }

  if (isWaiting) {
    return {
      canSendChat: true,
      canScoreGuess: false,
      placeholder: "Chat or guess — scoring starts next drawing…",
      inputHint:
        "You can chat and guess now. Points unlock on the next drawing.",
      waitingBanner,
    };
  }

  if (hasGuessed) {
    return {
      canSendChat: true,
      canScoreGuess: false,
      placeholder: "Private chat with correct guessers…",
      inputHint: "Only correct guessers and the drawer see these messages.",
    };
  }

  return {
    canSendChat: true,
    canScoreGuess: true,
    placeholder: "Type your guess here...",
  };
}
