import type { GamePhase } from "@/types/room";

export type ChatInputPolicyInput = {
  phase: GamePhase;
  hasSelf: boolean;
  isDrawer: boolean;
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
};

const PHASE_DISABLED_REASON: Partial<Record<GamePhase, string>> = {
  LOBBY: "Chat opens once the game starts.",
};

/** Phases where everyone can discuss (no scoring). */
const DISCUSSION_PHASES: ReadonlySet<GamePhase> = new Set([
  "COUNTDOWN",
  "WORD_SELECTION",
  "ROUND_END",
  "GAME_FINISHED",
]);

/**
 * Pure phase × role policy for the in-game chat/guess input.
 * Correct guessers keep private chat during ROUND_ACTIVE; discussion
 * chat stays open between rounds and after the game ends.
 */
export function getChatInputPolicy(input: ChatInputPolicyInput): ChatInputPolicy {
  const { phase, hasSelf, isDrawer, hasGuessed } = input;
  const isActiveDrawing = phase === "ROUND_ACTIVE";

  if (!hasSelf) {
    return {
      canSendChat: false,
      canScoreGuess: false,
      placeholder: "Chat disabled",
      disabledReason: "Join the game to chat.",
    };
  }

  if (isActiveDrawing) {
    if (isDrawer) {
      return {
        canSendChat: false,
        canScoreGuess: false,
        placeholder: "Chat disabled",
        disabledReason: "You're drawing — chat is disabled.",
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

  if (DISCUSSION_PHASES.has(phase)) {
    return {
      canSendChat: true,
      canScoreGuess: false,
      placeholder: "Say something…",
      inputHint:
        phase === "GAME_FINISHED"
          ? undefined
          : "Chat is open — guesses only count during the round.",
    };
  }

  return {
    canSendChat: false,
    canScoreGuess: false,
    placeholder: "Chat disabled",
    disabledReason:
      PHASE_DISABLED_REASON[phase] ?? "Chat is not available right now.",
  };
}
