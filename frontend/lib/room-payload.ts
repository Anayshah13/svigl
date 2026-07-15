import type {
  GameDrawer,
  GamePhase,
  GameSettings,
  RoundGuessedEntry,
  RoundSummary,
  Room,
  RoomGameState,
  RoomPlayer,
  RoomStatus,
  ScoreEntry,
} from "@/types/room";

type JsonObject = Record<string, unknown>;

const DEFAULT_SETTINGS: GameSettings = {
  rounds: 3,
  roundDurationSeconds: 60,
};

function object(value: unknown): JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : {};
}

function stringValue(...values: unknown[]): string | undefined {
  return values.find((value): value is string => typeof value === "string");
}

function numberValue(...values: unknown[]): number | undefined {
  return values.find(
    (value): value is number => typeof value === "number" && Number.isFinite(value),
  );
}

function booleanValue(...values: unknown[]): boolean | undefined {
  return values.find((value): value is boolean => typeof value === "boolean");
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function hasAny(source: JsonObject, keys: string[]): boolean {
  return keys.some((key) => Object.hasOwn(source, key));
}

function mapDrawer(value: unknown, players: RoomPlayer[]): GameDrawer | null {
  if (typeof value === "string") {
    const player = players.find((candidate) => candidate.id === value);
    return player
      ? { id: player.id, name: player.name, avatarUrl: player.avatarUrl }
      : { id: value, name: "Unknown", avatarUrl: null };
  }

  const drawer = object(value);
  const id = stringValue(drawer.id, drawer.player_id);
  if (!id) return null;
  const player = players.find((candidate) => candidate.id === id);
  return {
    id,
    name: stringValue(drawer.name, drawer.player_name, player?.name) ?? "Unknown",
    avatarUrl:
      stringValue(drawer.avatarUrl, drawer.avatar_url, player?.avatarUrl) ?? null,
  };
}

function mapScoreEntry(value: unknown): ScoreEntry | null {
  const row = object(value);
  const playerId = stringValue(row.playerId, row.player_id);
  if (!playerId) return null;
  return {
    playerId,
    score: numberValue(row.score) ?? 0,
    roundPoints: numberValue(row.roundPoints, row.round_points) ?? 0,
    hasGuessedCorrectly:
      booleanValue(row.hasGuessedCorrectly, row.has_guessed_correctly) ?? false,
    isActive: booleanValue(row.isActive, row.is_active) ?? true,
  };
}

function mapScores(value: unknown): ScoreEntry[] | null {
  if (!Array.isArray(value)) return null;
  return value
    .map(mapScoreEntry)
    .filter((entry): entry is ScoreEntry => entry !== null);
}

function mapRoundGuessed(value: unknown): RoundGuessedEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      const row = object(item);
      const playerId = stringValue(row.playerId, row.player_id);
      if (!playerId) return null;
      return {
        playerId,
        playerName:
          stringValue(row.playerName, row.player_name) ?? "Player",
        points: numberValue(row.points) ?? 0,
      } satisfies RoundGuessedEntry;
    })
    .filter((entry): entry is RoundGuessedEntry => entry !== null);
}

function mapRoundSummary(
  value: unknown,
  previous: RoundSummary | null | undefined,
): RoundSummary | null {
  if (value === null) return null;
  const source = object(value);
  if (!hasAny(source, ["word", "drawer_id", "drawerId", "guessed", "scores"])) {
    return previous ?? null;
  }
  const scores = mapScores(source.scores);
  return {
    word: stringValue(source.word) ?? null,
    drawerId: stringValue(source.drawerId, source.drawer_id) ?? null,
    guessed: mapRoundGuessed(source.guessed),
    scores: scores ?? previous?.scores ?? [],
  };
}

/**
 * Maps REST responses, WebSocket snapshots, and lifecycle event payloads into
 * the single room shape consumed by the UI. Missing delta fields retain the
 * previous authoritative value.
 */
export function mapRoomPayload(value: unknown, previous?: Room | null): Room | null {
  const envelope = object(value);
  const nestedRoom = object(envelope.room);
  const source = Object.keys(nestedRoom).length > 0 ? nestedRoom : envelope;
  const gameSource = object(source.game ?? envelope.game);
  const settingsSource = object(
    source.settings ?? source.game_settings ?? gameSource.settings ?? envelope.settings,
  );

  const code = stringValue(
    source.code,
    source.room_code,
    envelope.room_code,
    previous?.code,
  );
  if (!code) return null;

  const readyIds = stringArray(
    source.ready_player_ids ??
      source.ready_players ??
      envelope.ready_player_ids ??
      envelope.ready_players,
  );
  const waitingIds = stringArray(
    source.waiting_player_ids ??
      source.waiting_players ??
      gameSource.waiting_player_ids ??
      envelope.waiting_player_ids,
  );
  const rawPlayers = Array.isArray(source.players) ? source.players : null;
  const hasReadyData =
    rawPlayers !== null ||
    hasAny(source, ["ready_player_ids", "ready_players"]) ||
    hasAny(envelope, ["ready_player_ids", "ready_players"]);
  const hasWaitingData =
    rawPlayers !== null ||
    hasAny(source, ["waiting_player_ids", "waiting_players"]) ||
    hasAny(gameSource, ["waiting_player_ids", "waiting_players"]) ||
    hasAny(envelope, ["waiting_player_ids", "waiting_players"]);
  const players =
    rawPlayers?.map((rawPlayer) => {
      const player = object(rawPlayer);
      const id = stringValue(player.id, player.player_id) ?? "";
      return {
        id,
        name: stringValue(player.name, player.player_name) ?? "Unknown",
        avatarUrl: stringValue(player.avatarUrl, player.avatar_url) ?? null,
        isReady:
          booleanValue(player.isReady, player.is_ready) ??
          readyIds.includes(id),
        isWaiting:
          booleanValue(player.isWaiting, player.is_waiting, player.waiting) ??
          waitingIds.includes(id),
        isConnected: booleanValue(player.isConnected, player.is_connected),
        score: numberValue(player.score),
      } satisfies RoomPlayer;
    }).filter((player) => player.id) ??
    previous?.players ??
    [];

  const derivedReadyIds =
    readyIds.length > 0 || rawPlayers === null
      ? readyIds
      : players.filter((player) => player.isReady).map((player) => player.id);
  const derivedWaitingIds =
    waitingIds.length > 0 || rawPlayers === null
      ? waitingIds
      : players.filter((player) => player.isWaiting).map((player) => player.id);

  const phase =
    (stringValue(gameSource.phase, source.phase, envelope.phase) as GamePhase | undefined) ??
    previous?.game.phase ??
    "LOBBY";
  const rounds =
    numberValue(
      settingsSource.total_rounds,
      settingsSource.rounds,
      settingsSource.number_of_rounds,
      gameSource.total_rounds,
      source.total_rounds,
    ) ??
    previous?.settings.rounds ??
    DEFAULT_SETTINGS.rounds;
  const roundDurationSeconds =
    numberValue(
      settingsSource.roundDurationSeconds,
      settingsSource.round_duration_seconds,
      settingsSource.round_duration,
    ) ??
    previous?.settings.roundDurationSeconds ??
    DEFAULT_SETTINGS.roundDurationSeconds;
  const revision =
    numberValue(
      source.revision,
      gameSource.revision,
      envelope.revision,
      previous?.revision,
    ) ?? 0;
  const activePlayerIds = stringArray(
    gameSource.active_player_ids ??
      gameSource.active_players ??
      gameSource.rotation ??
      source.active_player_ids ??
      source.rotation ??
      envelope.active_player_ids,
  );

  const samePhase = phase === previous?.game.phase;
  const incomingScores = mapScores(
    gameSource.scores ?? envelope.scores ?? source.scores,
  );
  const guessedPlayerIds = stringArray(
    gameSource.guessed_player_ids ??
      gameSource.guessedPlayerIds ??
      envelope.guessed_player_ids,
  );
  const hasGuessedData =
    hasAny(gameSource, ["guessed_player_ids", "guessedPlayerIds"]) ||
    hasAny(envelope, ["guessed_player_ids", "guessedPlayerIds"]);

  // Prefer top-level private fields (WORD_CHOICES_OFFERED / WORD_SELECTED) over
  // nested public room.game values, which are intentionally null for guessers.
  const incomingChoices = Array.isArray(envelope.word_choices)
    ? stringArray(envelope.word_choices)
    : Array.isArray(envelope.wordChoices)
      ? stringArray(envelope.wordChoices)
      : Array.isArray(gameSource.word_choices)
        ? stringArray(gameSource.word_choices)
        : Array.isArray(gameSource.wordChoices)
          ? stringArray(gameSource.wordChoices)
          : null;

  const incomingSecret = stringValue(
    envelope.secret_word,
    envelope.secretWord,
    gameSource.secret_word,
    gameSource.secretWord,
  );

  const incomingHint = stringValue(
    gameSource.word_hint,
    gameSource.wordHint,
    envelope.word_hint,
    envelope.wordHint,
  );
  const hasHintKey =
    hasAny(gameSource, ["word_hint", "wordHint"]) ||
    hasAny(envelope, ["word_hint", "wordHint"]);

  const roundSummary = mapRoundSummary(
    gameSource.round_summary ??
      gameSource.roundSummary ??
      envelope.round_summary ??
      (phase === "ROUND_END" &&
      hasAny(envelope, ["word", "guessed", "drawer_id", "drawerId"])
        ? envelope
        : null),
    phase === "ROUND_END" || phase === "GAME_FINISHED"
      ? previous?.game.roundSummary
      : null,
  );

  const game: RoomGameState = {
    sessionId:
      stringValue(
        gameSource.sessionId,
        gameSource.session_id,
        source.session_id,
        envelope.session_id,
      ) ??
      previous?.game.sessionId ??
      null,
    phase,
    revision,
    serverTime:
      stringValue(
        gameSource.serverTime,
        gameSource.server_time,
        source.server_time,
        envelope.server_time,
      ) ??
      previous?.game.serverTime ??
      null,
    phaseEndsAt:
      stringValue(
        gameSource.deadline_at,
        gameSource.phaseEndsAt,
        gameSource.phase_ends_at,
        source.deadline_at,
        source.phase_ends_at,
        envelope.deadline_at,
        envelope.phase_ends_at,
      ) ??
      (samePhase ? previous?.game.phaseEndsAt ?? null : null),
    remainingSeconds:
      numberValue(
        gameSource.remainingSeconds,
        gameSource.remaining_seconds,
        source.remaining_seconds,
        envelope.remaining_seconds,
      ) ??
      (samePhase ? previous?.game.remainingSeconds ?? null : null),
    roundNumber:
      numberValue(
        gameSource.current_round,
        gameSource.roundNumber,
        gameSource.round_number,
        source.current_round,
        source.round_number,
        envelope.current_round,
        envelope.round_number,
      ) ??
      previous?.game.roundNumber ??
      0,
    totalRounds:
      numberValue(
        gameSource.totalRounds,
        gameSource.total_rounds,
        source.total_rounds,
        envelope.total_rounds,
      ) ?? rounds,
    drawer:
      mapDrawer(
        gameSource.drawer ??
          gameSource.current_drawer ??
          gameSource.drawer_id ??
          source.drawer ??
          source.current_drawer ??
          source.drawer_id ??
          envelope.drawer,
        players,
      ) ?? (samePhase ? previous?.game.drawer ?? null : null),
    activePlayerIds:
      activePlayerIds.length > 0
        ? activePlayerIds
        : previous?.game.activePlayerIds ??
          players
            .filter((player) => !derivedWaitingIds.includes(player.id))
            .map((player) => player.id),
    waitingPlayerIds:
      hasWaitingData ? derivedWaitingIds : previous?.game.waitingPlayerIds ?? [],
    wordHint:
      hasHintKey
        ? incomingHint ?? null
        : samePhase
          ? previous?.game.wordHint ?? null
          : null,
    wordLength:
      numberValue(
        gameSource.word_length,
        gameSource.wordLength,
        envelope.word_length,
        envelope.wordLength,
      ) ??
      (samePhase ? previous?.game.wordLength ?? null : null),
    // Private drawer fields: only apply real values. Public snapshots include
    // `word_choices: null` / `secret_word: null` — never treat those as clears.
    secretWord:
      typeof incomingSecret === "string"
        ? incomingSecret
        : phase === "ROUND_ACTIVE" ||
            phase === "ROUND_END" ||
            phase === "GAME_FINISHED"
          ? previous?.game.secretWord ?? null
          : null,
    wordChoices:
      incomingChoices !== null
        ? incomingChoices
        : phase === "WORD_SELECTION"
          ? previous?.game.wordChoices ?? null
          : null,
    scores:
      incomingScores ??
      (samePhase ? previous?.game.scores ?? [] : previous?.game.scores ?? []),
    guessedPlayerIds: hasGuessedData
      ? guessedPlayerIds
      : samePhase
        ? previous?.game.guessedPlayerIds ?? []
        : [],
    winnerId:
      stringValue(
        gameSource.winner_id,
        gameSource.winnerId,
        gameSource.winner_user_id,
        envelope.winner_id,
        envelope.winner_user_id,
      ) ??
      (phase === "GAME_FINISHED" ? previous?.game.winnerId ?? null : null),
    roundSummary:
      phase === "ROUND_END" || phase === "GAME_FINISHED"
        ? roundSummary
        : null,
  };

  // Merge player scores from scoreboard when player.score omitted.
  const scoreById = new Map(game.scores.map((entry) => [entry.playerId, entry.score]));
  const playersWithScores = players.map((player) => ({
    ...player,
    score: player.score ?? scoreById.get(player.id) ?? previous?.players.find((p) => p.id === player.id)?.score,
  }));

  const status =
    (stringValue(source.status) as RoomStatus | undefined) ??
    (phase === "LOBBY"
      ? "WAITING"
      : phase === "GAME_FINISHED"
        ? "FINISHED"
        : "PLAYING");

  return {
    code,
    hostId:
      stringValue(source.hostId, source.host_id, envelope.host_id, previous?.hostId) ??
      "",
    status,
    maxPlayers:
      numberValue(source.maxPlayers, source.max_players, previous?.maxPlayers) ?? 8,
    createdAt:
      stringValue(source.createdAt, source.created_at, previous?.createdAt) ?? "",
    players: playersWithScores,
    settings: { rounds, roundDurationSeconds },
    game,
    readyPlayerIds:
      hasReadyData ? derivedReadyIds : previous?.readyPlayerIds ?? [],
    waitingPlayerIds: game.waitingPlayerIds,
    canStart:
      booleanValue(source.canStart, source.can_start, envelope.can_start) ??
      previous?.canStart ??
      false,
    revision,
  };
}
