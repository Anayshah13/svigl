"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import * as React from "react";
import { InviteFriendsPill, RoomCodeCopyButton } from "@/components/room/RoomInviteActions";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { useRoom } from "@/hooks/useRoom";
import { colors } from "@/lib/colors";
import { formatDisplayName } from "@/lib/names";
import { getHostName } from "@/services/room";
import { ROOM_STATUS_LABELS } from "@/types/room";

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "WAITING"
      ? "bg-green/10 text-green"
      : status === "PLAYING"
        ? "bg-plum/10 text-plum"
        : "bg-ink/10 text-ink-muted";

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${tone}`}>
      {ROOM_STATUS_LABELS[status as keyof typeof ROOM_STATUS_LABELS] ?? status}
    </span>
  );
}

function ErrorPanel({
  message,
  onRetry,
  retryLabel = "Try again",
}: {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}) {
  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <Card className="w-full max-w-md rounded-3xl p-8 text-center">
        <p role="alert" className="text-sm font-medium text-plum">
          {message}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {onRetry ? (
            <Button type="button" onClick={onRetry}>
              {retryLabel}
            </Button>
          ) : null}
          <Link href="/">
            <Button type="button" variant="outline">
              Back home
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}

function PlayerActions({
  playerId,
  playerName,
  onKick,
  onMakeHost,
}: {
  playerId: string;
  playerName: string;
  onKick: (id: string) => Promise<void>;
  onMakeHost: (id: string) => Promise<void>;
}) {
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [confirmKick, setConfirmKick] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setConfirmKick(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const handleKick = async () => {
    if (!confirmKick) {
      setConfirmKick(true);
      return;
    }
    setBusy(true);
    await onKick(playerId);
    setBusy(false);
    setOpen(false);
    setConfirmKick(false);
  };

  const handleMakeHost = async () => {
    setBusy(true);
    await onMakeHost(playerId);
    setBusy(false);
    setOpen(false);
  };

  const displayName = formatDisplayName(playerName);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          setConfirmKick(false);
        }}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-plum-light hover:text-plum"
        aria-label={`Manage ${displayName}`}
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
          <circle cx="10" cy="4" r="1.5" />
          <circle cx="10" cy="10" r="1.5" />
          <circle cx="10" cy="16" r="1.5" />
        </svg>
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-20 mt-1 w-48 overflow-hidden rounded-xl border border-plum/15 bg-white shadow-lg">
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleMakeHost()}
            className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-sm font-medium text-ink transition-colors hover:bg-plum-light disabled:opacity-50"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 shrink-0 text-plum" aria-hidden="true">
              <path d="M10 2l2.09 4.26L17 7.27l-3.5 3.41L14.18 16 10 13.77 5.82 16l.68-5.32L3 7.27l4.91-1.01z" />
            </svg>
            Make host
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleKick()}
            className={`flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-sm font-medium transition-colors disabled:opacity-50 ${
              confirmKick
                ? "bg-red-50 text-red-600 hover:bg-red-100"
                : "text-red-500 hover:bg-red-50"
            }`}
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 shrink-0" aria-hidden="true">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
            </svg>
            {confirmKick ? `Confirm kick ${displayName}?` : "Kick player"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function RoomView() {
  const params = useParams<{ code: string }>();
  const code = params.code ?? "";

  const {
    room,
    loading,
    error,
    leaving,
    joining,
    notMember,
    tabBlocked,
    isHost,
    isMember,
    currentPlayer,
    authUser,
    leaveRoom,
    kickPlayer,
    transferHost,
    retry,
    attemptJoin,
  } = useRoom(code, { autoJoin: true });

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-24">
        <p className="text-sm font-medium text-ink-muted">Loading room…</p>
      </div>
    );
  }

  if (tabBlocked) {
    return (
      <ErrorPanel
        message="This room is already open in another tab. Close the other tab, then refresh this page."
        onRetry={() => window.location.reload()}
        retryLabel="Refresh"
      />
    );
  }

  if (error && !room) {
    return <ErrorPanel message={error.message} onRetry={retry} />;
  }

  if (!room) {
    return <ErrorPanel message="Room not found." onRetry={retry} />;
  }

  if (joining || (notMember && !isMember && !error)) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-24">
        <p className="text-sm font-medium text-ink-muted">Joining room…</p>
      </div>
    );
  }

  if (notMember && !isMember) {
    return (
      <ErrorPanel
        message="You're not in this room yet."
        onRetry={attemptJoin}
        retryLabel={joining ? "Joining…" : "Join room"}
      />
    );
  }

  const hostName = getHostName(room);

  return (
    <div className="page-shell page-shell-tight gap-5 sm:gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider text-ink-muted">Room</p>
          <div className="relative mt-1 inline-block pr-8">
            <h1 className="break-all font-mono text-[clamp(1.75rem,8vw,2.25rem)] font-bold tracking-[0.12em] text-ink sm:tracking-[0.2em]">
              {room.code}
            </h1>
            <RoomCodeCopyButton code={room.code} className="absolute bottom-0 right-0" />
          </div>
          <div className="mt-2 sm:mt-3">
            <StatusBadge status={room.status} />
          </div>
        </div>

        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <InviteFriendsPill code={room.code} className="flex-1 sm:flex-none" />
          <Button
            type="button"
            variant="outline"
            disabled={leaving}
            onClick={() => void leaveRoom()}
            className="flex-1 sm:w-auto"
          >
            {leaving ? "Leaving…" : "Leave room"}
          </Button>
        </div>
      </div>

      {error ? (
        <p role="alert" className="rounded-2xl bg-pink-light px-4 py-3 text-sm font-medium text-plum">
          {error.message}
        </p>
      ) : null}

      <Card
        className="rounded-3xl p-4 sm:p-6"
        style={{
          boxShadow: `0 24px 48px -16px ${colors.plum}18, 0 0 0 1px rgba(255,255,255,0.85)`,
        }}
      >
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Host</dt>
            <dd className="mt-1 text-sm font-medium text-ink">{formatDisplayName(hostName)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Players</dt>
            <dd className="mt-1 text-sm font-medium text-ink">
              {room.players.length} / {room.maxPlayers}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-ink-muted">You</dt>
            <dd className="mt-1 text-sm font-medium text-ink">
              {currentPlayer
                ? formatDisplayName(currentPlayer.name)
                : authUser
                  ? formatDisplayName(authUser.username)
                  : "Guest"}
              {isHost ? " · Host" : ""}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Status</dt>
            <dd className="mt-1 text-sm font-medium text-ink">
              {ROOM_STATUS_LABELS[room.status]}
            </dd>
          </div>
        </dl>
      </Card>

      <Card className="rounded-3xl p-4 sm:p-6">
        <h2 className="text-sm font-bold uppercase tracking-wider text-ink-muted">Players</h2>
        <ul className="mt-3 space-y-2 sm:mt-4 sm:space-y-3">
          {room.players.map((player) => {
            const isSelf = player.id === currentPlayer?.id;
            const isPlayerHost = player.id === room.hostId;
            const canManage = isHost && !isSelf;

            return (
              <li
                key={player.id}
                className="flex items-center justify-between rounded-2xl border border-plum/10 bg-white/80 px-3 py-2.5 sm:px-4 sm:py-3"
              >
                <div className="flex items-center gap-3">
                  <UserAvatar
                    name={player.name}
                    avatarUrl={player.avatarUrl}
                    className="h-9 w-9 text-sm"
                  />
                  <div>
                    <p className="text-sm font-semibold text-ink">
                      {formatDisplayName(player.name)}
                      {isPlayerHost ? (
                        <span className="ml-2 text-xs font-medium text-plum">Host</span>
                      ) : null}
                      {isSelf ? (
                        <span className="ml-2 text-xs font-medium text-ink-muted">You</span>
                      ) : null}
                    </p>
                  </div>
                </div>

                {canManage ? (
                  <PlayerActions
                    playerId={player.id}
                    playerName={player.name}
                    onKick={kickPlayer}
                    onMakeHost={transferHost}
                  />
                ) : null}
              </li>
            );
          })}
        </ul>
      </Card>

      <p className="text-center text-xs text-ink-muted">
        Room updates refresh automatically. Drawing and live play coming soon.
      </p>
    </div>
  );
}
