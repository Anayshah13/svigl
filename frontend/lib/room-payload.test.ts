import { describe, expect, it } from "vitest";
import { mapRoomPayload } from "./room-payload";

const snapshot = {
  code: "TEST",
  host_id: "alice",
  status: "PLAYING",
  max_players: 8,
  created_at: "2026-07-15T00:00:00Z",
  revision: 7,
  settings: {
    rounds: 3,
    round_duration_seconds: 60,
  },
  players: [
    {
      id: "alice",
      name: "Alice",
      avatar_url: null,
      is_ready: true,
      is_waiting: false,
      score: 120,
    },
    {
      id: "bob",
      name: "Bob",
      avatar_url: null,
      is_ready: false,
      is_waiting: true,
      score: 40,
    },
  ],
  game: {
    session_id: "session-1",
    phase: "ROUND_ACTIVE",
    revision: 7,
    server_time: "2026-07-15T00:00:10Z",
    phase_ends_at: "2026-07-15T00:01:10Z",
    remaining_seconds: 60,
    current_round: 1,
    current_turn: 2,
    total_rounds: 3,
    drawer_id: "alice",
    active_player_ids: ["alice"],
    waiting_player_ids: ["bob"],
    word_hint: "_ _ _ _",
    word_length: 4,
    secret_word: "cats",
    scores: [
      {
        player_id: "alice",
        score: 120,
        round_points: 20,
        has_guessed_correctly: false,
        is_active: true,
      },
      {
        player_id: "bob",
        score: 40,
        round_points: 0,
        has_guessed_correctly: false,
        is_active: false,
      },
    ],
    guessed_player_ids: [],
  },
};

describe("mapRoomPayload", () => {
  it("maps an authoritative lifecycle snapshot", () => {
    const room = mapRoomPayload(snapshot);

    expect(room).toMatchObject({
      code: "TEST",
      hostId: "alice",
      revision: 7,
      readyPlayerIds: ["alice"],
      waitingPlayerIds: ["bob"],
      settings: { rounds: 3, roundDurationSeconds: 60 },
      game: {
        sessionId: "session-1",
        phase: "ROUND_ACTIVE",
        remainingSeconds: 60,
        roundNumber: 1,
        currentTurn: 2,
        drawer: { id: "alice", name: "Alice" },
        wordHint: "_ _ _ _",
        wordLength: 4,
        secretWord: "cats",
        scores: [
          { playerId: "alice", score: 120, roundPoints: 20 },
          { playerId: "bob", score: 40, isActive: false },
        ],
      },
    });
  });

  it("applies timer deltas without losing the room snapshot", () => {
    const room = mapRoomPayload(snapshot);
    const updated = mapRoomPayload(
      {
        room_code: "TEST",
        revision: 8,
        phase: "ROUND_ACTIVE",
        remaining_seconds: 0,
        server_time: "2026-07-15T00:01:10Z",
      },
      room,
    );

    expect(updated?.revision).toBe(8);
    expect(updated?.game.remainingSeconds).toBe(0);
    expect(updated?.players).toHaveLength(2);
    expect(updated?.game.drawer?.id).toBe("alice");
    expect(updated?.game.secretWord).toBe("cats");
    expect(updated?.game.wordHint).toBe("_ _ _ _");
  });

  it("keeps private word choices across public WORD_SELECTION snapshots", () => {
    // Matches notify.send_to_user(WORD_CHOICES_OFFERED, word_choices=…, room=public)
    const withChoices = mapRoomPayload({
      word_choices: ["apple", "banana", "cherry"],
      revision: 9,
      phase: "WORD_SELECTION",
      room: {
        ...snapshot,
        revision: 9,
        game: {
          ...snapshot.game,
          phase: "WORD_SELECTION",
          secret_word: null,
          word_hint: null,
          word_choices: null,
        },
      },
    });
    expect(withChoices?.game.wordChoices).toEqual(["apple", "banana", "cherry"]);

    // Public GAME_STATE_UPDATED / TIMER tick includes word_choices: null — must not wipe.
    const publicTick = mapRoomPayload(
      {
        room_code: "TEST",
        revision: 10,
        phase: "WORD_SELECTION",
        remaining_seconds: 12,
        room: {
          code: "TEST",
          revision: 10,
          game: {
            phase: "WORD_SELECTION",
            revision: 10,
            remaining_seconds: 12,
            word_choices: null,
            secret_word: null,
          },
        },
      },
      withChoices,
    );

    expect(publicTick?.game.wordChoices).toEqual(["apple", "banana", "cherry"]);
  });

  it("keeps drawer secret_word across public ROUND_STARTED snapshots", () => {
    const withSecret = mapRoomPayload({
      secret_word: "cats",
      revision: 12,
      phase: "ROUND_ACTIVE",
      room: {
        ...snapshot,
        revision: 12,
        game: {
          ...snapshot.game,
          phase: "ROUND_ACTIVE",
          secret_word: null,
          word_hint: "_ _ _ _",
          word_length: 4,
        },
      },
    });
    expect(withSecret?.game.secretWord).toBe("cats");

    const publicRound = mapRoomPayload(
      {
        room_code: "TEST",
        revision: 13,
        phase: "ROUND_ACTIVE",
        room: {
          code: "TEST",
          revision: 13,
          game: {
            phase: "ROUND_ACTIVE",
            revision: 13,
            secret_word: null,
            word_hint: "_ _ _ _",
            word_length: 4,
          },
        },
      },
      withSecret,
    );

    expect(publicRound?.game.secretWord).toBe("cats");
    expect(publicRound?.game.wordHint).toBe("_ _ _ _");
  });

  it("maps ROUND_ENDED summary fields", () => {
    const room = mapRoomPayload(snapshot);
    const ended = mapRoomPayload(
      {
        room_code: "TEST",
        revision: 11,
        phase: "ROUND_END",
        word: "cats",
        drawer_id: "alice",
        guessed: [{ player_id: "bob", player_name: "Bob", points: 200 }],
        scores: [
          {
            player_id: "bob",
            score: 240,
            round_points: 200,
            has_guessed_correctly: true,
            is_active: true,
          },
        ],
      },
      room,
    );

    expect(ended?.game.phase).toBe("ROUND_END");
    expect(ended?.game.roundSummary?.word).toBe("cats");
    expect(ended?.game.roundSummary?.guessed[0]?.points).toBe(200);
  });

  it("keeps ROUND_ENDED guessed list across GAME_STATE_UPDATED without summary", () => {
    const room = mapRoomPayload(snapshot);
    const ended = mapRoomPayload(
      {
        room_code: "TEST",
        revision: 11,
        phase: "ROUND_END",
        word: "cats",
        drawer_id: "alice",
        guessed: [{ player_id: "bob", player_name: "Bob", points: 200 }],
      },
      room,
    );
    const followUp = mapRoomPayload(
      {
        room: {
          ...snapshot,
          revision: 12,
          game: {
            ...snapshot.game,
            phase: "ROUND_END",
            revision: 12,
            guessed_player_ids: ["bob"],
            secret_word: "cats",
          },
        },
      },
      ended,
    );

    expect(followUp?.game.roundSummary?.guessed).toHaveLength(1);
    expect(followUp?.game.roundSummary?.guessed[0]?.playerId).toBe("bob");
    expect(followUp?.game.roundSummary?.word).toBe("cats");
  });
});
