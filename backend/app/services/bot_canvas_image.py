"""Render persisted whiteboard shapes to a small PNG for internal AI guesses."""

from __future__ import annotations

import math
import struct
import zlib
from typing import Any

from app.schemas.canvas import WhiteboardShape, parse_shapes

WIDTH = 256
HEIGHT = 256
BOARD = 800.0


def _png_rgb(pixels: bytearray, width: int, height: int) -> bytes:
    raw = bytearray()
    stride = width * 3
    for y in range(height):
        raw.append(0)
        raw.extend(pixels[y * stride : (y + 1) * stride])

    def chunk(tag: bytes, data: bytes) -> bytes:
        return (
            struct.pack(">I", len(data))
            + tag
            + data
            + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
        )

    return b"".join(
        (
            b"\x89PNG\r\n\x1a\n",
            chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)),
            chunk(b"IDAT", zlib.compress(bytes(raw), 6)),
            chunk(b"IEND", b""),
        )
    )


def _parse_hex(color: str) -> tuple[int, int, int] | None:
    value = color.strip()
    if value.lower() in {"none", "transparent"}:
        return None
    if value.startswith("#") and len(value) in {4, 7}:
        if len(value) == 4:
            return tuple(int(ch * 2, 16) for ch in value[1:])  # type: ignore[return-value]
        return (
            int(value[1:3], 16),
            int(value[3:5], 16),
            int(value[5:7], 16),
        )
    named = {
        "black": (31, 41, 55),
        "white": (255, 255, 255),
        "red": (239, 68, 68),
        "blue": (59, 130, 246),
        "green": (34, 197, 94),
        "yellow": (252, 238, 9),
    }
    return named.get(value.lower())


def _put(pixels: bytearray, x: int, y: int, rgb: tuple[int, int, int]) -> None:
    if 0 <= x < WIDTH and 0 <= y < HEIGHT:
        idx = (y * WIDTH + x) * 3
        pixels[idx : idx + 3] = bytes(rgb)


def _sx(x: float) -> int:
    return int(round(x / BOARD * (WIDTH - 1)))


def _sy(y: float) -> int:
    return int(round(y / BOARD * (HEIGHT - 1)))


def _line(
    pixels: bytearray,
    x0: int,
    y0: int,
    x1: int,
    y1: int,
    rgb: tuple[int, int, int],
    width: int,
) -> None:
    dx = abs(x1 - x0)
    dy = -abs(y1 - y0)
    sx = 1 if x0 < x1 else -1
    sy = 1 if y0 < y1 else -1
    err = dx + dy
    x, y = x0, y0
    radius = max(1, width // 2)
    while True:
        for ox in range(-radius, radius + 1):
            for oy in range(-radius, radius + 1):
                if ox * ox + oy * oy <= radius * radius + 1:
                    _put(pixels, x + ox, y + oy, rgb)
        if x == x1 and y == y1:
            break
        e2 = 2 * err
        if e2 >= dy:
            err += dy
            x += sx
        if e2 <= dx:
            err += dx
            y += sy


def _fill_ellipse(
    pixels: bytearray,
    cx: int,
    cy: int,
    rx: int,
    ry: int,
    rgb: tuple[int, int, int],
) -> None:
    rx = max(1, rx)
    ry = max(1, ry)
    for y in range(cy - ry, cy + ry + 1):
        yy = (y - cy) / ry
        span = rx * math.sqrt(max(0.0, 1.0 - yy * yy))
        x0 = int(math.floor(cx - span))
        x1 = int(math.ceil(cx + span))
        for x in range(x0, x1 + 1):
            _put(pixels, x, y, rgb)


def _stroke_ellipse(
    pixels: bytearray,
    cx: int,
    cy: int,
    rx: int,
    ry: int,
    rgb: tuple[int, int, int],
    width: int,
) -> None:
    steps = max(24, int(2 * math.pi * max(rx, ry)))
    prev = None
    for i in range(steps + 1):
        ang = 2 * math.pi * i / steps
        pt = (int(round(cx + rx * math.cos(ang))), int(round(cy + ry * math.sin(ang))))
        if prev is not None:
            _line(pixels, prev[0], prev[1], pt[0], pt[1], rgb, width)
        prev = pt


def _fill_rect(
    pixels: bytearray,
    x: int,
    y: int,
    w: int,
    h: int,
    rgb: tuple[int, int, int],
) -> None:
    for yy in range(y, y + max(1, h)):
        for xx in range(x, x + max(1, w)):
            _put(pixels, xx, yy, rgb)


def _path_points(d: str) -> list[tuple[float, float]]:
    tokens = d.replace(",", " ").split()
    pts: list[tuple[float, float]] = []
    i = 0
    cmd = "M"
    while i < len(tokens):
        token = tokens[i]
        if token.isalpha():
            cmd = token
            i += 1
            continue
        try:
            x = float(token)
            y = float(tokens[i + 1])
        except (ValueError, IndexError):
            i += 1
            continue
        pts.append((x, y))
        i += 2
        if cmd in {"M", "m"}:
            cmd = "L" if cmd == "M" else "l"
    return pts


def _draw_shape(pixels: bytearray, shape: WhiteboardShape) -> None:
    stroke = _parse_hex(shape.stroke)
    fill = _parse_hex(shape.fill)
    width = max(1, int(round(shape.strokeWidth / BOARD * WIDTH)))
    geo = shape.geometry
    kind = geo.kind
    if kind == "rectangle":
        x, y, w, h = _sx(geo.x), _sy(geo.y), max(1, _sx(geo.width)), max(1, _sy(geo.height))
        if fill:
            _fill_rect(pixels, x, y, w, h, fill)
        if stroke:
            _line(pixels, x, y, x + w, y, stroke, width)
            _line(pixels, x + w, y, x + w, y + h, stroke, width)
            _line(pixels, x + w, y + h, x, y + h, stroke, width)
            _line(pixels, x, y + h, x, y, stroke, width)
        return
    if kind == "ellipse":
        cx, cy, rx, ry = _sx(geo.cx), _sy(geo.cy), max(1, _sx(geo.rx)), max(1, _sy(geo.ry))
        if fill:
            _fill_ellipse(pixels, cx, cy, rx, ry, fill)
        if stroke:
            _stroke_ellipse(pixels, cx, cy, rx, ry, stroke, width)
        return
    if kind in {"pencil", "fill"}:
        pts = _path_points(geo.d)
        if stroke and len(pts) >= 2:
            for a, b in zip(pts, pts[1:]):
                _line(pixels, _sx(a[0]), _sy(a[1]), _sx(b[0]), _sy(b[1]), stroke, width)
        return
    if kind == "arrow":
        if stroke:
            _line(
                pixels,
                _sx(geo.start.x),
                _sy(geo.start.y),
                _sx(geo.end.x),
                _sy(geo.end.y),
                stroke,
                width,
            )
        return
    if kind == "bezier":
        if stroke:
            _line(
                pixels,
                _sx(geo.start.x),
                _sy(geo.start.y),
                _sx(geo.end.x),
                _sy(geo.end.y),
                stroke,
                width,
            )


def render_shapes_png(raw_shapes: Any) -> bytes:
    """Best-effort raster of canvas shapes. Empty boards still produce a white PNG."""
    try:
        shapes = parse_shapes(raw_shapes or [])
    except Exception:
        shapes = []
    pixels = bytearray(b"\xff" * (WIDTH * HEIGHT * 3))
    for shape in shapes:
        try:
            _draw_shape(pixels, shape)
        except Exception:
            continue
    return _png_rgb(pixels, WIDTH, HEIGHT)
