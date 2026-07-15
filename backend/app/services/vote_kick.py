"""
Majority vote-kick for multiplayer rooms.

Votes live in process memory keyed by room code (fine for single-server Docker;
multi-instance deployments would need shared storage).

Allowed only during ROUND_ACTIVE against the current drawer (not lobby /
word select / round end).

Reset rules (documented choice):
- Votes against a target clear when that target leaves or is kicked.
- A voter's ballots are dropped when that voter leaves.
- All room votes clear when the drawing turn ends, the room returns to lobby,
  or a new game starts (GAME_STARTED / _return_to_lobby / round end).

Threshold: floor(N / 2) + 1 where N is the current room player count
(including the target). Examples: 3→2, 4→3, 5→3.
"""

from __future__ import annotations

from dataclasses import dataclass
from threading import Lock
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.room import GAME_PHASE_ROUND_ACTIVE, ROOM_STATUS_FINISHED
from app.services.room import MembershipChange, _get_room_or_404, _remove_player


# room_code → target_id → set of voter user ids
_votes: dict[str, dict[UUID, set[UUID]]] = {}
_lock = Lock()


def required_votes(player_count: int) -> int:
    """Classic majority: floor(N/2)+1."""
    if player_count < 1:
        return 1
    return (player_count // 2) + 1


@dataclass(frozen=True)
class VoteTally:
    target_id: UUID
    votes: int
    required: int
    player_count: int
    voter_ids: tuple[UUID, ...]

    def as_payload(self) -> dict:
        return {
            "target_id": str(self.target_id),
            "votes": self.votes,
            "required": self.required,
            "player_count": self.player_count,
            "voter_ids": [str(v) for v in self.voter_ids],
        }


@dataclass
class VoteKickCastResult:
    tally: VoteTally
    kicked: bool = False
    membership_change: MembershipChange | None = None
    target_name: str | None = None
    retracted: bool = False


def clear_room_votes(room_code: str) -> None:
    """Drop all vote-kick tallies for a room (lobby / new game / room deleted)."""
    key = room_code.upper()
    with _lock:
        _votes.pop(key, None)


def clear_votes_involving_player(room_code: str, user_id: UUID) -> list[VoteTally]:
    """
    When a player leaves: remove them as a target and strip their ballots.
    Returns updated tallies for remaining targets (votes may drop).
    """
    key = room_code.upper()
    updated: list[VoteTally] = []
    with _lock:
        room_votes = _votes.get(key)
        if not room_votes:
            return []

        room_votes.pop(user_id, None)

        empty_targets: list[UUID] = []
        for target_id, voters in room_votes.items():
            if user_id in voters:
                voters.discard(user_id)
            if not voters:
                empty_targets.append(target_id)

        for target_id in empty_targets:
            room_votes.pop(target_id, None)

        if not room_votes:
            _votes.pop(key, None)
            return []

        # Player count unknown here — caller may re-tally with DB context.
        for target_id, voters in room_votes.items():
            updated.append(
                VoteTally(
                    target_id=target_id,
                    votes=len(voters),
                    required=0,
                    player_count=0,
                    voter_ids=tuple(sorted(voters, key=str)),
                )
            )
    return updated


def get_tally(
    room_code: str, target_id: UUID, *, player_count: int
) -> VoteTally:
    key = room_code.upper()
    with _lock:
        voters = _votes.get(key, {}).get(target_id, set())
        return VoteTally(
            target_id=target_id,
            votes=len(voters),
            required=required_votes(player_count),
            player_count=player_count,
            voter_ids=tuple(sorted(voters, key=str)),
        )


def all_tallies(room_code: str, *, player_count: int) -> list[VoteTally]:
    key = room_code.upper()
    with _lock:
        room_votes = _votes.get(key, {})
        return [
            VoteTally(
                target_id=target_id,
                votes=len(voters),
                required=required_votes(player_count),
                player_count=player_count,
                voter_ids=tuple(sorted(voters, key=str)),
            )
            for target_id, voters in room_votes.items()
        ]


def cast_vote_kick(
    db: Session,
    code: str,
    voter_id: UUID,
    target_id: UUID,
    *,
    retract: bool = False,
) -> VoteKickCastResult:
    """
    Cast or retract a vote-kick against ``target_id``.

    On majority, removes the target via the same path as host kick / leave
    (``_remove_player`` → departure / host migration).
    """
    room = _get_room_or_404(db, code)

    if room.status == ROOM_STATUS_FINISHED:
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="This room has finished.",
        )

    session = room.game_session
    if session is None or session.phase != GAME_PHASE_ROUND_ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Vote-kick is only available while someone is drawing.",
        )

    if session.drawer_user_id is None or target_id != session.drawer_user_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You can only vote-kick the player who is drawing.",
        )

    member_ids = {rp.user_id for rp in room.players}
    if voter_id not in member_ids:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must be in the room to vote-kick.",
        )

    if target_id == voter_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You can't vote to kick yourself.",
        )

    if target_id not in member_ids:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="That player is not in this room.",
        )

    player_count = len(room.players)
    needed = required_votes(player_count)
    key = room.code.upper()

    with _lock:
        room_votes = _votes.setdefault(key, {})
        voters = room_votes.setdefault(target_id, set())

        if retract:
            voters.discard(voter_id)
            if not voters:
                room_votes.pop(target_id, None)
            if not room_votes:
                _votes.pop(key, None)
            tally = VoteTally(
                target_id=target_id,
                votes=len(voters),
                required=needed,
                player_count=player_count,
                voter_ids=tuple(sorted(voters, key=str)),
            )
            return VoteKickCastResult(tally=tally, retracted=True)

        voters.add(voter_id)
        vote_count = len(voters)
        tally = VoteTally(
            target_id=target_id,
            votes=vote_count,
            required=needed,
            player_count=player_count,
            voter_ids=tuple(sorted(voters, key=str)),
        )

        if vote_count < needed:
            return VoteKickCastResult(tally=tally)

        # Majority reached — drop tallies before membership mutation.
        room_votes.pop(target_id, None)
        if not room_votes:
            _votes.pop(key, None)

    target_player = next(
        (rp for rp in room.players if rp.user_id == target_id), None
    )
    target_name = target_player.user.name if target_player and target_player.user else "Unknown"

    change = _remove_player(db, room, target_id)
    # _remove_player also clears votes involving the target; ensure room key is clean.
    clear_votes_involving_player(code, target_id)

    return VoteKickCastResult(
        tally=VoteTally(
            target_id=target_id,
            votes=needed,
            required=needed,
            player_count=player_count,
            voter_ids=tally.voter_ids,
        ),
        kicked=True,
        membership_change=change,
        target_name=target_name,
    )


def retally_with_player_count(
    tallies: list[VoteTally], player_count: int
) -> list[VoteTally]:
    needed = required_votes(player_count)
    return [
        VoteTally(
            target_id=t.target_id,
            votes=t.votes,
            required=needed,
            player_count=player_count,
            voter_ids=t.voter_ids,
        )
        for t in tallies
    ]
