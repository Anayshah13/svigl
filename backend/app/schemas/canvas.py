"""Pydantic schemas for collaborative whiteboard shapes / ops."""

from __future__ import annotations

from typing import Annotated, Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field, ValidationError, field_validator, model_validator


class PointModel(BaseModel):
    x: float
    y: float


class PencilGeometry(BaseModel):
    """Freehand stroke stored as a smoothed SVG path `d` string."""

    kind: Literal["pencil"]
    d: str = Field(min_length=1, max_length=100_000)

    @model_validator(mode="before")
    @classmethod
    def coerce_legacy_points(cls, data: Any) -> Any:
        """Accept legacy `{points:[{x,y},…]}` and convert to SVG `d`."""
        if not isinstance(data, dict):
            return data
        existing = data.get("d")
        if isinstance(existing, str) and existing.strip().startswith(("M", "m")):
            return data
        points = data.get("points")
        if not isinstance(points, list) or not points:
            return data
        parts: list[str] = []
        for raw in points:
            if not isinstance(raw, dict):
                continue
            x, y = raw.get("x"), raw.get("y")
            if not isinstance(x, (int, float)) or not isinstance(y, (int, float)):
                continue
            cmd = "M" if not parts else "L"
            parts.append(f"{cmd} {float(x):g} {float(y):g}")
        if not parts:
            return data
        next_data = dict(data)
        next_data["d"] = " ".join(parts)
        next_data.pop("points", None)
        return next_data

    @field_validator("d")
    @classmethod
    def d_must_be_path(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed.startswith(("M", "m")):
            raise ValueError("pencil path d must start with moveto (M/m)")
        return trimmed


class BezierGeometry(BaseModel):
    kind: Literal["bezier"]
    start: PointModel
    end: PointModel
    cp1: PointModel
    cp2: PointModel


class RectGeometry(BaseModel):
    kind: Literal["rectangle"]
    x: float
    y: float
    width: float
    height: float


class EllipseGeometry(BaseModel):
    kind: Literal["ellipse"]
    cx: float
    cy: float
    rx: float
    ry: float


class ArrowGeometry(BaseModel):
    kind: Literal["arrow"]
    start: PointModel
    end: PointModel


class FillGeometry(BaseModel):
    kind: Literal["fill"]
    d: str


ShapeGeometry = Annotated[
    PencilGeometry
    | BezierGeometry
    | RectGeometry
    | EllipseGeometry
    | ArrowGeometry
    | FillGeometry,
    Field(discriminator="kind"),
]

WhiteboardTool = Literal[
    "pencil", "bezier", "rectangle", "ellipse", "arrow", "fill"
]


class WhiteboardShape(BaseModel):
    """Matches frontend/features/whiteboard/types.ts WhiteboardShape."""

    id: str = Field(min_length=1, max_length=128)
    tool: WhiteboardTool
    stroke: str = Field(min_length=1, max_length=64)
    fill: str = Field(min_length=1, max_length=64)
    strokeWidth: float = Field(ge=0, le=64)
    transform: str = Field(max_length=256)
    geometry: ShapeGeometry
    createdBy: str = Field(min_length=1, max_length=64)
    createdAt: float

    @field_validator("fill")
    @classmethod
    def fill_ok(cls, value: str) -> str:
        if value != "none" and not value.startswith("#") and len(value) > 64:
            raise ValueError("Invalid fill")
        return value

    @model_validator(mode="after")
    def stroke_width_ok(self) -> WhiteboardShape:
        if self.tool != "fill" and self.strokeWidth <= 0:
            raise ValueError("strokeWidth must be positive for stroked shapes")
        return self


class HistoryAddOp(BaseModel):
    type: Literal["add"]
    shape: WhiteboardShape


class HistoryRemoveOp(BaseModel):
    type: Literal["remove"]
    shape: WhiteboardShape
    index: int = Field(ge=0)


class HistoryUpdateOp(BaseModel):
    type: Literal["update"]
    before: WhiteboardShape
    after: WhiteboardShape


class HistoryClearOp(BaseModel):
    type: Literal["clear"]
    shapes: list[WhiteboardShape]


class HistoryReplaceOp(BaseModel):
    type: Literal["replace"]
    before: list[WhiteboardShape]
    after: list[WhiteboardShape]


HistoryOp = Annotated[
    HistoryAddOp
    | HistoryRemoveOp
    | HistoryUpdateOp
    | HistoryClearOp
    | HistoryReplaceOp,
    Field(discriminator="type"),
]


class CanvasSnapshot(BaseModel):
    session_id: UUID | None
    current_turn: int
    op_seq: int
    shapes: list[WhiteboardShape]
    can_draw: bool = False


class ShapeCreatedPayload(BaseModel):
    shape: WhiteboardShape


class ShapeUpdatedPayload(BaseModel):
    shape: WhiteboardShape


class ShapeDeletedPayload(BaseModel):
    shape_id: str = Field(min_length=1, max_length=128)


class UndoRedoPayload(BaseModel):
    """Optional client-supplied op; server may ignore and recompute."""

    op: HistoryOp | None = None


def shape_to_dict(shape: WhiteboardShape) -> dict[str, Any]:
    return shape.model_dump(mode="json")


def shapes_to_dicts(shapes: list[WhiteboardShape]) -> list[dict[str, Any]]:
    return [shape_to_dict(s) for s in shapes]


def parse_shape(raw: Any) -> WhiteboardShape:
    try:
        return WhiteboardShape.model_validate(raw)
    except ValidationError as exc:
        # Surface a concise reason to the WS layer (CanvasError wraps this).
        raise ValueError(f"Invalid whiteboard shape: {exc.errors()[0]['msg']}") from exc


def parse_shapes(raw: Any) -> list[WhiteboardShape]:
    if not isinstance(raw, list):
        raise ValueError("shapes must be a list")
    out: list[WhiteboardShape] = []
    for item in raw:
        try:
            out.append(parse_shape(item))
        except (ValidationError, ValueError):
            # Skip corrupt/legacy entries so one bad stroke cannot poison the board.
            continue
    return out


def parse_history_op(raw: Any) -> HistoryAddOp | HistoryRemoveOp | HistoryUpdateOp | HistoryClearOp | HistoryReplaceOp:
    if not isinstance(raw, dict) or "type" not in raw:
        raise ValueError("Invalid history op")
    op_type = raw["type"]
    mapping = {
        "add": HistoryAddOp,
        "remove": HistoryRemoveOp,
        "update": HistoryUpdateOp,
        "clear": HistoryClearOp,
        "replace": HistoryReplaceOp,
    }
    model = mapping.get(op_type)
    if model is None:
        raise ValueError(f"Unknown history op type: {op_type}")
    return model.model_validate(raw)  # type: ignore[return-value]


class CanvasMutationResult(BaseModel):
    """Internal result after applying a canvas mutation."""

    event: str
    session_id: UUID
    current_turn: int
    op_seq: int
    payload: dict[str, Any]

    @model_validator(mode="after")
    def _ok(self) -> CanvasMutationResult:
        return self
