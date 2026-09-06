"""Deterministic whiteboard doodles for the system robot drawer."""

from __future__ import annotations

import hashlib
import time
from typing import Any
from uuid import uuid4

BOARD = 800


def _shape(
    drawer_id: str,
    tool: str,
    geometry: dict[str, Any],
    *,
    stroke: str = "#1f2937",
    fill: str = "none",
    stroke_width: float = 5,
) -> dict[str, Any]:
    return {
        "id": str(uuid4()),
        "tool": tool,
        "stroke": stroke,
        "fill": fill,
        "strokeWidth": stroke_width,
        "transform": "",
        "geometry": geometry,
        "createdBy": drawer_id,
        "createdAt": time.time(),
    }


def pencil(drawer_id: str, points: list[tuple[float, float]], **kwargs: Any) -> dict[str, Any]:
    parts = [f"{'M' if i == 0 else 'L'} {x:g} {y:g}" for i, (x, y) in enumerate(points)]
    return _shape(
        drawer_id,
        "pencil",
        {"kind": "pencil", "d": " ".join(parts)},
        **kwargs,
    )


def rect(
    drawer_id: str, x: float, y: float, w: float, h: float, **kwargs: Any
) -> dict[str, Any]:
    return _shape(
        drawer_id,
        "rectangle",
        {"kind": "rectangle", "x": x, "y": y, "width": w, "height": h},
        **kwargs,
    )


def ellipse(
    drawer_id: str, cx: float, cy: float, rx: float, ry: float, **kwargs: Any
) -> dict[str, Any]:
    return _shape(
        drawer_id,
        "ellipse",
        {"kind": "ellipse", "cx": cx, "cy": cy, "rx": rx, "ry": ry},
        **kwargs,
    )


def _cat(uid: str) -> list[dict[str, Any]]:
    return [
        ellipse(uid, 400, 430, 140, 110, fill="#f4d7b0"),
        ellipse(uid, 330, 280, 46, 70, fill="#f4d7b0"),
        ellipse(uid, 470, 280, 46, 70, fill="#f4d7b0"),
        ellipse(uid, 360, 410, 12, 16, fill="#1f2937"),
        ellipse(uid, 440, 410, 12, 16, fill="#1f2937"),
        pencil(uid, [(380, 455), (400, 470), (420, 455)]),
        pencil(uid, [(250, 430), (180, 400)]),
        pencil(uid, [(550, 430), (620, 400)]),
    ]


def _dog(uid: str) -> list[dict[str, Any]]:
    return [
        ellipse(uid, 400, 420, 150, 115, fill="#c4a484"),
        ellipse(uid, 300, 300, 50, 80, fill="#c4a484"),
        ellipse(uid, 500, 300, 50, 80, fill="#c4a484"),
        ellipse(uid, 355, 400, 14, 16, fill="#1f2937"),
        ellipse(uid, 445, 400, 14, 16, fill="#1f2937"),
        ellipse(uid, 400, 455, 22, 14, fill="#1f2937"),
        pencil(uid, [(520, 500), (620, 560), (580, 500)]),
    ]


def _house(uid: str) -> list[dict[str, Any]]:
    return [
        rect(uid, 230, 340, 340, 260, fill="#fde68a"),
        pencil(uid, [(210, 350), (400, 160), (590, 350)], stroke_width=7),
        rect(uid, 360, 430, 80, 170, fill="#92400e"),
        ellipse(uid, 320, 430, 28, 28, fill="#93c5fd"),
        ellipse(uid, 480, 430, 28, 28, fill="#93c5fd"),
    ]


def _tree(uid: str) -> list[dict[str, Any]]:
    return [
        rect(uid, 370, 430, 60, 200, fill="#92400e"),
        ellipse(uid, 400, 320, 150, 140, fill="#22c55e"),
        ellipse(uid, 330, 280, 80, 70, fill="#16a34a"),
        ellipse(uid, 470, 270, 75, 65, fill="#16a34a"),
    ]


def _sun(uid: str) -> list[dict[str, Any]]:
    rays = [
        pencil(uid, [(400, 160), (400, 90)]),
        pencil(uid, [(400, 640), (400, 710)]),
        pencil(uid, [(160, 400), (90, 400)]),
        pencil(uid, [(640, 400), (710, 400)]),
        pencil(uid, [(230, 230), (170, 170)]),
        pencil(uid, [(570, 230), (630, 170)]),
        pencil(uid, [(230, 570), (170, 630)]),
        pencil(uid, [(570, 570), (630, 630)]),
    ]
    return [ellipse(uid, 400, 400, 120, 120, fill="#fcee09", stroke="#f59e0b"), *rays]


def _car(uid: str) -> list[dict[str, Any]]:
    return [
        rect(uid, 160, 360, 480, 140, fill="#3b82f6"),
        rect(uid, 250, 250, 280, 120, fill="#93c5fd"),
        ellipse(uid, 260, 520, 55, 55, fill="#1f2937"),
        ellipse(uid, 540, 520, 55, 55, fill="#1f2937"),
        ellipse(uid, 260, 520, 22, 22, fill="#e5e7eb"),
        ellipse(uid, 540, 520, 22, 22, fill="#e5e7eb"),
    ]


def _fish(uid: str) -> list[dict[str, Any]]:
    return [
        ellipse(uid, 380, 400, 170, 90, fill="#38bdf8"),
        pencil(uid, [(530, 400), (660, 320), (660, 480), (530, 400)], stroke="#38bdf8"),
        ellipse(uid, 280, 380, 14, 16, fill="#1f2937"),
        pencil(uid, [(230, 400), (190, 400)]),
    ]


def _apple(uid: str) -> list[dict[str, Any]]:
    return [
        ellipse(uid, 400, 420, 130, 140, fill="#ef4444"),
        pencil(uid, [(400, 280), (400, 220), (450, 190)], stroke="#92400e"),
        ellipse(uid, 455, 250, 40, 18, fill="#22c55e", stroke="#16a34a"),
    ]


def _banana(uid: str) -> list[dict[str, Any]]:
    return [
        pencil(
            uid,
            [(180, 280), (260, 220), (420, 250), (580, 380), (620, 500), (540, 520), (400, 400), (260, 320), (180, 280)],
            stroke="#eab308",
            stroke_width=8,
        ),
        ellipse(uid, 400, 360, 160, 70, fill="#fcee09", stroke="#ca8a04"),
    ]


def _flower(uid: str) -> list[dict[str, Any]]:
    return [
        pencil(uid, [(400, 720), (400, 430)], stroke="#16a34a", stroke_width=6),
        ellipse(uid, 400, 250, 50, 50, fill="#fcee09"),
        ellipse(uid, 400, 150, 45, 55, fill="#ef4444"),
        ellipse(uid, 490, 250, 55, 45, fill="#ef4444"),
        ellipse(uid, 400, 350, 45, 55, fill="#ef4444"),
        ellipse(uid, 310, 250, 55, 45, fill="#ef4444"),
    ]


def _clock(uid: str) -> list[dict[str, Any]]:
    return [
        ellipse(uid, 400, 400, 170, 170, fill="#f8fafc"),
        pencil(uid, [(400, 400), (400, 270)], stroke_width=6),
        pencil(uid, [(400, 400), (500, 430)], stroke_width=5),
        ellipse(uid, 400, 400, 10, 10, fill="#1f2937"),
    ]


def _boat(uid: str) -> list[dict[str, Any]]:
    return [
        pencil(uid, [(160, 460), (640, 460), (560, 560), (240, 560), (160, 460)], stroke="#92400e"),
        rect(uid, 200, 460, 400, 90, fill="#b45309"),
        pencil(uid, [(400, 460), (400, 180)], stroke_width=6),
        pencil(uid, [(400, 180), (560, 400), (400, 400)], stroke="#ef4444"),
    ]


def _heart(uid: str) -> list[dict[str, Any]]:
    return [
        ellipse(uid, 330, 330, 90, 90, fill="#ef4444", stroke="#b91c1c"),
        ellipse(uid, 470, 330, 90, 90, fill="#ef4444", stroke="#b91c1c"),
        pencil(uid, [(250, 360), (400, 580), (550, 360)], stroke="#ef4444", stroke_width=8),
    ]


def _star(uid: str) -> list[dict[str, Any]]:
    pts = [
        (400, 160),
        (455, 320),
        (630, 320),
        (490, 420),
        (545, 590),
        (400, 490),
        (255, 590),
        (310, 420),
        (170, 320),
        (345, 320),
        (400, 160),
    ]
    return [pencil(uid, pts, stroke="#eab308", stroke_width=6)]


def _smiley(uid: str) -> list[dict[str, Any]]:
    return [
        ellipse(uid, 400, 400, 180, 180, fill="#fcee09"),
        ellipse(uid, 340, 350, 18, 22, fill="#1f2937"),
        ellipse(uid, 460, 350, 18, 22, fill="#1f2937"),
        pencil(uid, [(310, 450), (360, 510), (440, 510), (490, 450)]),
    ]


def _phone(uid: str) -> list[dict[str, Any]]:
    return [
        rect(uid, 280, 140, 240, 520, fill="#1f2937"),
        rect(uid, 300, 190, 200, 380, fill="#93c5fd"),
        ellipse(uid, 400, 610, 16, 16, fill="#e5e7eb"),
    ]


def _book(uid: str) -> list[dict[str, Any]]:
    return [
        rect(uid, 220, 200, 360, 400, fill="#3b82f6"),
        pencil(uid, [(400, 200), (400, 600)], stroke="#1e3a8a", stroke_width=8),
        pencil(uid, [(250, 260), (370, 260)], stroke="#f8fafc"),
        pencil(uid, [(250, 310), (370, 310)], stroke="#f8fafc"),
    ]


def _pizza(uid: str) -> list[dict[str, Any]]:
    return [
        ellipse(uid, 400, 400, 190, 190, fill="#f59e0b"),
        ellipse(uid, 400, 400, 150, 150, fill="#ef4444"),
        ellipse(uid, 340, 340, 22, 18, fill="#fcee09"),
        ellipse(uid, 460, 360, 20, 16, fill="#fcee09"),
        ellipse(uid, 380, 460, 24, 18, fill="#fcee09"),
        ellipse(uid, 470, 470, 18, 16, fill="#fcee09"),
    ]


_RECIPES: dict[str, Any] = {
    "cat": _cat,
    "dog": _dog,
    "house": _house,
    "tree": _tree,
    "sun": _sun,
    "car": _car,
    "fish": _fish,
    "apple": _apple,
    "banana": _banana,
    "flower": _flower,
    "clock": _clock,
    "boat": _boat,
    "heart": _heart,
    "star": _star,
    "phone": _phone,
    "book": _book,
    "pizza": _pizza,
    "smile": _smiley,
    "smiley": _smiley,
    "airplane": lambda uid: [
        pencil(uid, [(120, 430), (620, 300), (680, 280), (640, 340), (400, 420), (220, 500), (120, 430)], stroke="#64748b", stroke_width=6),
        pencil(uid, [(400, 360), (520, 220)]),
        pencil(uid, [(360, 430), (280, 560)]),
    ],
    "balloon": lambda uid: [
        ellipse(uid, 400, 280, 90, 120, fill="#ef4444"),
        pencil(uid, [(400, 400), (400, 640), (370, 680)]),
    ],
    "cloud": lambda uid: [
        ellipse(uid, 320, 380, 110, 80, fill="#e5e7eb", stroke="#94a3b8"),
        ellipse(uid, 420, 340, 120, 90, fill="#e5e7eb", stroke="#94a3b8"),
        ellipse(uid, 500, 390, 100, 75, fill="#e5e7eb", stroke="#94a3b8"),
    ],
    "moon": lambda uid: [
        ellipse(uid, 400, 400, 150, 150, fill="#f8fafc", stroke="#cbd5e1"),
        ellipse(uid, 460, 360, 120, 120, fill="#ffffff", stroke="#ffffff"),
    ],
    "hat": lambda uid: [
        ellipse(uid, 400, 430, 200, 40, fill="#1f2937"),
        rect(uid, 300, 220, 200, 210, fill="#1f2937"),
    ],
    "cup": lambda uid: [
        rect(uid, 280, 260, 220, 260, fill="#f8fafc"),
        pencil(uid, [(500, 320), (580, 320), (580, 430), (500, 430)]),
        ellipse(uid, 390, 260, 110, 24, fill="#f8fafc"),
    ],
    "key": lambda uid: [
        ellipse(uid, 260, 400, 70, 70, fill="none", stroke_width=8),
        rect(uid, 320, 385, 280, 30, fill="#eab308", stroke="#ca8a04"),
        rect(uid, 540, 415, 24, 50, fill="#eab308", stroke="#ca8a04"),
        rect(uid, 575, 415, 24, 36, fill="#eab308", stroke="#ca8a04"),
    ],
}


def _fallback(uid: str, word: str) -> list[dict[str, Any]]:
    digest = hashlib.sha256(word.encode("utf-8")).digest()
    style = digest[0] % 4
    hue = ["#3b82f6", "#22c55e", "#ef4444", "#eab308"][digest[1] % 4]
    if style == 0:
        return [
            ellipse(uid, 400, 380, 150, 140, fill=hue),
            ellipse(uid, 350, 350, 16, 18, fill="#1f2937"),
            ellipse(uid, 450, 350, 16, 18, fill="#1f2937"),
            pencil(uid, [(340, 440), (400, 480), (460, 440)]),
            rect(uid, 360, 520, 80, 120, fill=hue),
        ]
    if style == 1:
        return [
            rect(uid, 220, 300, 360, 260, fill=hue),
            pencil(uid, [(220, 300), (400, 140), (580, 300)], stroke_width=7),
            rect(uid, 360, 400, 80, 160, fill="#1f2937"),
        ]
    if style == 2:
        return [
            ellipse(uid, 400, 400, 200, 90, fill=hue),
            pencil(uid, [(580, 400), (700, 330), (700, 470), (580, 400)]),
            ellipse(uid, 300, 380, 16, 16, fill="#1f2937"),
        ]
    return [
        ellipse(uid, 400, 280, 70, 70, fill=hue),
        rect(uid, 340, 350, 120, 200, fill=hue),
        pencil(uid, [(340, 400), (220, 480)]),
        pencil(uid, [(460, 400), (580, 480)]),
        pencil(uid, [(360, 550), (320, 680)]),
        pencil(uid, [(440, 550), (480, 680)]),
    ]


def build_bot_drawing(word: str, drawer_id: str) -> list[dict[str, Any]]:
    """Return valid whiteboard shapes that progressively depict `word`."""
    key = " ".join(word.strip().lower().split())
    builder = _RECIPES.get(key)
    if builder is None:
        for token in key.split():
            builder = _RECIPES.get(token)
            if builder is not None:
                break
    shapes = builder(drawer_id) if builder is not None else _fallback(drawer_id, key)
    return [shape for shape in shapes if isinstance(shape, dict)]
