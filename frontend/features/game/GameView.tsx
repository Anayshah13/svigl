"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { DoodleBackground } from "@/components/layout/DoodleBackground";
import { GameHeader } from "@/components/layout/GameHeader";
import { DrawingCanvas } from "@/features/drawing/DrawingCanvas";
import { useDocumentStore } from "@/stores/document";
import { useRoomStore } from "@/stores/room";
import { useSessionStore } from "@/stores/session";
import {
  ColorPalette,
  StrokeWidths,
  type PaletteColor,
  type StrokeWidth,
  type Style,
} from "@/types/drawing";
import { colors } from "@/lib/colors";
import type { ChatMessage } from "@/types/domain";
import { RoomState, GameState } from "@/types/state";

const AVATAR_COLORS = ["#fde047", "#6ee7b7", "#7dd3fc", "#f9a8d4", "#c4b5fd", "#fca5a5"];

function avatarColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// ── Overlays ──────────────────────────────────────────────────────────────────

function WordSelectionOverlay({
  choices,
  onSelect,
}: {
  choices: string[];
  onSelect: (index: number) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-white/70 backdrop-blur-md"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="flex flex-col items-center gap-5 rounded-2xl border border-gray-200 bg-white p-8 shadow-(--shadow-card)"
      >
        <h2 className="text-lg font-bold text-ink">Choose a word to draw</h2>
        <div className="flex flex-wrap justify-center gap-3">
          {choices.map((word, i) => (
            <motion.div key={word} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button onClick={() => onSelect(i)} size="sm">
                {word}
              </Button>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

function RoundRevealOverlay({
  word,
  round,
  totalRounds,
  scores,
}: {
  word: string;
  round: number;
  totalRounds: number;
  scores: Array<{ name: string; score: number }>;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-white/80 backdrop-blur-md"
    >
      <motion.div
        initial={{ scale: 0.85, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="flex min-w-[280px] flex-col items-center gap-4 rounded-2xl border border-gray-200 bg-white p-8 shadow-(--shadow-card)"
      >
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
          Round {round} / {totalRounds} — The word was
        </p>
        <p className="script-accent text-4xl font-bold">{word}</p>
        <ul className="w-full space-y-2">
          {scores
            .slice()
            .sort((a, b) => b.score - a.score)
            .map((s, i) => (
              <motion.li
                key={s.name}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex justify-between text-sm"
              >
                <span className="text-ink-muted">{s.name}</span>
                <span className="font-mono font-bold text-ink">{s.score}</span>
              </motion.li>
            ))}
        </ul>
      </motion.div>
    </motion.div>
  );
}

function GameFinishedOverlay({
  scores,
  isFinalDrawer,
  galleryDrawingId,
  hasVoted,
  onPublish,
  onUpvote,
  onPlayAgain,
  publishPending,
}: {
  scores: Array<{ name: string; score: number }>;
  isFinalDrawer: boolean;
  galleryDrawingId: string | null;
  hasVoted: boolean;
  onPublish: () => void;
  onUpvote: () => void;
  onPlayAgain: () => void;
  publishPending: boolean;
}) {
  const sorted = scores.slice().sort((a, b) => b.score - a.score);
  const winner = sorted[0];
  const published = galleryDrawingId !== null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-white/85 backdrop-blur-md"
    >
      <motion.div
        initial={{ scale: 0.85, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        className="flex min-w-[300px] flex-col items-center gap-5 rounded-2xl border border-gray-200 bg-white p-8 shadow-(--shadow-card)"
      >
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Game Over</p>
        {winner && (
          <motion.p
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
            className="text-center text-xl font-bold text-ink"
          >
            🏆 {winner.name} wins!
          </motion.p>
        )}
        <ul className="w-full space-y-1">
          {sorted.map((s, i) => (
            <li key={s.name} className="flex items-center justify-between text-sm">
              <span className="w-5 text-gray-400">{i + 1}.</span>
              <span className="flex-1 text-gray-700">{s.name}</span>
              <span className="font-mono font-bold">{s.score}</span>
            </li>
          ))}
        </ul>
        {isFinalDrawer && !published && (
          <Button variant="secondary" onClick={onPublish} disabled={publishPending}>
            {publishPending ? "Publishing…" : "Publish to gallery"}
          </Button>
        )}
        {isFinalDrawer && published && (
          <p className="text-sm font-medium text-emerald-600">Published to gallery!</p>
        )}
        {!isFinalDrawer && published && (
          <Button variant="secondary" onClick={onUpvote} disabled={hasVoted}>
            {hasVoted ? "Upvoted" : "Upvote drawing"}
          </Button>
        )}
        <Button onClick={onPlayAgain}>Back to Lobby</Button>
      </motion.div>
    </motion.div>
  );
}

// ── Drawing Toolbar ───────────────────────────────────────────────────────────

function DrawingToolbar({
  tool,
  onToolChange,
  strokeColor,
  strokeWidth,
  onColorChange,
  onWidthChange,
  canUndo,
  onUndo,
}: {
  tool: string;
  onToolChange: (t: "rectangle" | "circle" | "path" | "pointer") => void;
  strokeColor: PaletteColor;
  strokeWidth: StrokeWidth;
  onColorChange: (c: PaletteColor) => void;
  onWidthChange: (w: StrokeWidth) => void;
  canUndo: boolean;
  onUndo: () => void;
}) {
  const tools = [
    { id: "pointer" as const, label: "V", title: "Select" },
    { id: "path" as const, label: "P", title: "Path" },
    { id: "rectangle" as const, label: "R", title: "Rectangle" },
    { id: "circle" as const, label: "O", title: "Circle" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto flex max-w-2xl flex-wrap items-center justify-center gap-3 rounded-full border border-gray-200/80 bg-white/95 px-5 py-3 shadow-(--shadow-card) backdrop-blur-sm"
    >
      <div className="flex items-center gap-1">
        {tools.map((t) => (
          <motion.button
            key={t.id}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => onToolChange(t.id)}
            title={t.title}
            className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold transition-colors ${
              tool === t.id
                ? "text-white shadow-md"
                : "bg-white/80 text-ink-muted hover:bg-plum-light/50"
            }`}
            style={tool === t.id ? { background: colors.plum } : undefined}
          >
            {t.label}
          </motion.button>
        ))}
      </div>

      <div className="h-6 w-px bg-gray-200" />

      <div className="flex items-center gap-1">
        {ColorPalette.filter((c) => c !== "#FFFFFF").slice(0, 8).map((c) => (
          <motion.button
            key={c}
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.9 }}
            title={c}
            onClick={() => onColorChange(c)}
            className="h-6 w-6 rounded-full border-2 transition-shadow"
            style={{
              backgroundColor: c,
              borderColor: strokeColor === c ? colors.plum : "transparent",
              boxShadow: strokeColor === c ? `0 0 0 2px white, 0 0 0 4px ${colors.plum}` : undefined,
            }}
          />
        ))}
      </div>

      <div className="h-6 w-px bg-gray-200" />

      <div className="flex items-center gap-1">
        {StrokeWidths.map((w) => (
          <button
            key={w}
            onClick={() => onWidthChange(w)}
            className={`flex h-7 w-7 items-center justify-center rounded-md text-xs font-bold ${
              strokeWidth === w ? "bg-plum-light text-plum" : "text-ink-muted hover:bg-plum-light/30"
            }`}
          >
            {w}
          </button>
        ))}
      </div>

      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={onUndo}
        disabled={!canUndo}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-muted hover:bg-gray-50 disabled:opacity-30"
        title="Undo"
      >
        ↩
      </motion.button>
    </motion.div>
  );
}

// ── GameView ──────────────────────────────────────────────────────────────────

export function GameView() {
  const router = useRouter();
  const game = useRoomStore((s) => s.room?.game ?? null);
  const room = useRoomStore((s) => s.room);
  const players = useRoomStore((s) => s.room?.players ?? []);
  const storeChat = useRoomStore((s) => s.chat);
  const wordChoices = useRoomStore((s) => s.wordChoices);
  const revealedWord = useRoomStore((s) => s.revealedWord);
  const galleryDrawingId = useRoomStore((s) => s.galleryDrawingId);
  const selfId = useSessionStore((s) => s.selfId);
  const tool = useDocumentStore((s) => s.tool);
  const setTool = useDocumentStore((s) => s.setTool);
  const operationHistory = useDocumentStore((s) => s.operationHistory);
  const undoLocal = useDocumentStore((s) => s.undoLocal);

  const [message, setMessage] = useState("");
  const [localChat, setLocalChat] = useState<ChatMessage[]>([]);
  const chat = localChat.length > 0 ? localChat : storeChat;
  const [publishPending, setPublishPending] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [strokeColor, setStrokeColor] = useState<PaletteColor>(ColorPalette[0]);
  const [strokeWidth, setStrokeWidth] = useState<StrokeWidth>(2);
  const activeStyle: Partial<Style> = { strokeColor, strokeWidth };

  const isDrawer = true;
  const isGameFinished = room?.state === RoomState.GAME_FINISHED;
  const isFinalDrawer = isDrawer && isGameFinished;
  const drawerDisconnected = game?.state === GameState.DRAWER_DISCONNECTED;
  const showRoundReveal = revealedWord !== null && !isGameFinished;

  const drawer = players.find((p) => p.id === game?.currentDrawerId);
  const sortedPlayers = players.slice().sort((a, b) => b.score - a.score);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  const submitMessage = () => {
    const text = message.trim();
    if (!text || !selfId) return;
    const entry: ChatMessage = {
      id: `local-${Date.now()}`,
      playerId: selfId,
      message: text,
      timestamp: Date.now(),
      kind: isDrawer ? "chat" : "guess",
    };
    setLocalChat((prev) => [...(prev.length ? prev : storeChat), entry]);
    setMessage("");
  };

  const handleWordSelect = useCallback((_index: number) => {}, []);

  const handleUndo = useCallback(() => {
    undoLocal();
  }, [undoLocal]);

  const handlePublish = useCallback(() => {
    setPublishPending(true);
    // Gallery publish will call the backend once the game API is wired.
    setPublishPending(false);
  }, []);

  const handleUpvote = useCallback(() => {
    setHasVoted(true);
  }, []);

  useEffect(() => {
    if (galleryDrawingId) setPublishPending(false);
  }, [galleryDrawingId]);

  const playerName = (id: string) =>
    id === "system" ? "" : (players.find((p) => p.id === id)?.displayName ?? id);

  const scoreRows = players.map((p) => ({ name: p.displayName, score: p.score }));

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <DoodleBackground />
      <GameHeader />

      <div className="relative z-10 mx-auto grid w-full max-w-[1400px] flex-1 grid-cols-1 gap-4 p-4 lg:grid-cols-[200px_1fr_280px] lg:p-6">
        {/* Left — Leaderboard */}
        <aside className="hidden flex-col gap-3 lg:flex">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-1 flex-col rounded-2xl border border-gray-200/80 bg-white/90 p-4 shadow-(--shadow-soft) backdrop-blur-sm"
          >
            <h2 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">
              Leaderboard
            </h2>
            <ul className="flex-1 space-y-2">
              <AnimatePresence>
                {sortedPlayers.map((p, i) => (
                  <motion.li
                    key={p.id}
                    layout
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ delay: i * 0.04 }}
                    className="flex items-center gap-2 rounded-xl px-2 py-1.5 transition-colors hover:bg-gray-50"
                  >
                    <span className="w-4 text-xs font-bold text-gray-300">{i + 1}</span>
                    <div
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-gray-800"
                      style={{ backgroundColor: avatarColor(p.id) }}
                    >
                      {p.displayName.charAt(0).toUpperCase()}
                    </div>
                    <span
                      className={`min-w-0 flex-1 truncate text-sm ${
                        p.id === selfId ? "font-bold text-ink" : "text-ink-muted"
                      }`}
                    >
                      {p.displayName}
                    </span>
                    <span className="font-mono text-xs font-bold text-ink-muted">{p.score}</span>
                    {p.guessedCorrectly && (
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    )}
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          </motion.div>
        </aside>

        {/* Center — Canvas */}
        <div className="flex min-h-0 flex-col gap-3">
          {drawer && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 self-start rounded-full bg-white/90 px-3 py-1.5 text-sm shadow-sm backdrop-blur-sm"
            >
              <span className="h-2 w-2 rounded-full" style={{ background: colors.green }} />
              <span className="text-ink-muted">
                {drawer.displayName} is drawing{" "}
                {isDrawer && game?.currentWord ? (
                  <span className="script-accent text-base">{game.currentWord}</span>
                ) : (
                  <span className="text-gray-400">•••</span>
                )}
              </span>
            </motion.div>
          )}

          <div className="relative flex-1 overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-(--shadow-card)">
            <DrawingCanvas
              isDrawer={isDrawer}
              activeStyle={activeStyle}
              className="block h-full min-h-[320px] w-full lg:min-h-[480px]"
            />

            {isDrawer && operationHistory.length === 0 && (
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <p className="script-accent text-2xl text-gray-300">start sketching…</p>
                <p className="mt-1 text-sm text-gray-300">
                  pick a tool, click and drag on the canvas.
                </p>
              </div>
            )}

            {drawerDisconnected && (
              <div className="absolute inset-x-0 top-0 z-10 bg-amber-100 px-4 py-2 text-center text-sm font-medium text-amber-800">
                Drawer disconnected — waiting for reconnect…
              </div>
            )}

            <AnimatePresence>
              {isDrawer && wordChoices && wordChoices.length > 0 && (
                <WordSelectionOverlay choices={wordChoices} onSelect={handleWordSelect} />
              )}
              {showRoundReveal && game && (
                <RoundRevealOverlay
                  word={revealedWord}
                  round={game.round}
                  totalRounds={game.totalRounds}
                  scores={scoreRows}
                />
              )}
              {isGameFinished && (
                <GameFinishedOverlay
                  scores={scoreRows}
                  isFinalDrawer={isFinalDrawer}
                  galleryDrawingId={galleryDrawingId}
                  hasVoted={hasVoted}
                  publishPending={publishPending}
                  onPublish={handlePublish}
                  onUpvote={handleUpvote}
                  onPlayAgain={() => router.push(room?.code ? `/room/${room.code}` : "/")}
                />
              )}
            </AnimatePresence>
          </div>

          {isDrawer && (
            <DrawingToolbar
              tool={tool}
              onToolChange={setTool}
              strokeColor={strokeColor}
              strokeWidth={strokeWidth}
              onColorChange={setStrokeColor}
              onWidthChange={setStrokeWidth}
              canUndo={operationHistory.length > 0}
              onUndo={handleUndo}
            />
          )}
        </div>

        {/* Right — Chat */}
        <motion.aside
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex max-h-[500px] flex-col rounded-2xl border border-gray-200/80 bg-white/90 shadow-(--shadow-soft) backdrop-blur-sm lg:max-h-none lg:min-h-0"
        >
          <h2 className="border-b border-gray-100 px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">
            {isDrawer ? "Chat" : "Guesses"}
          </h2>
          <div className="flex-1 space-y-2 overflow-y-auto px-4 py-3 text-sm">
            <AnimatePresence initial={false}>
              {chat.map((m) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 8, x: m.kind === "solved" ? 0 : -4 }}
                  animate={{ opacity: 1, y: 0, x: 0 }}
                  className={
                    m.kind === "solved"
                      ? "rounded-xl bg-emerald-50 px-3 py-2 font-semibold text-emerald-700"
                      : m.kind === "system"
                        ? "text-xs italic text-gray-400"
                        : "text-gray-700"
                  }
                >
                  {m.playerId !== "system" && (
                    <span className="font-semibold text-ink">
                      {playerName(m.playerId)} —{" "}
                    </span>
                  )}
                  {m.message}
                </motion.div>
              ))}
            </AnimatePresence>
            {chat.length === 0 && (
              <p className="text-xs text-gray-400">No messages yet.</p>
            )}
            <div ref={chatEndRef} />
          </div>
          <div className="border-t border-gray-100 p-3">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitMessage()}
              placeholder={isDrawer ? "type a message…" : "type your guess…"}
              className="rounded-xl"
            />
          </div>
        </motion.aside>
      </div>
    </div>
  );
}
