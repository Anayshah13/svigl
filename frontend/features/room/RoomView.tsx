"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
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
          <h1 className="mt-1 break-all font-mono text-[clamp(1.75rem,8vw,2.25rem)] font-bold tracking-[0.12em] text-ink sm:tracking-[0.2em]">
            {room.code}
          </h1>
          <div className="mt-2 sm:mt-3">
            <StatusBadge status={room.status} />
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          disabled={leaving}
          onClick={() => void leaveRoom()}
          className="w-full sm:w-auto"
        >
          {leaving ? "Leaving…" : "Leave room"}
        </Button>
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
          {room.players.map((player) => (
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
                    {player.id === room.hostId ? (
                      <span className="ml-2 text-xs font-medium text-plum">Host</span>
                    ) : null}
                    {player.id === currentPlayer?.id ? (
                      <span className="ml-2 text-xs font-medium text-ink-muted">You</span>
                    ) : null}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <p className="text-center text-xs text-ink-muted">
        Room updates refresh automatically. Drawing and live play coming soon.
      </p>
    </div>
  );
}
