import type { GalleryEntry } from "@/types/domain";
import type { Shape } from "@/types/drawing";
import { colors } from "@/lib/colors";

function rect(
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
  fill: string,
): Shape {
  const now = Date.now();
  return {
    id,
    type: "rectangle",
    geometry: { x, y, width, height },
    style: { strokeColor: colors.ink, strokeWidth: 2, fillColor: fill, opacity: 1 },
    createdBy: "demo",
    createdAt: now,
    updatedAt: now,
  };
}

function circle(id: string, cx: number, cy: number, radius: number, fill: string): Shape {
  const now = Date.now();
  return {
    id,
    type: "circle",
    geometry: { cx, cy, radius },
    style: { strokeColor: colors.ink, strokeWidth: 2, fillColor: fill, opacity: 1 },
    createdBy: "demo",
    createdAt: now,
    updatedAt: now,
  };
}

function doc(id: string, shapes: Shape[]) {
  return {
    id,
    version: 1,
    createdAt: Date.now() - 86_400_000,
    operations: [],
    shapes,
  };
}

export const MOCK_GALLERY_ENTRIES: GalleryEntry[] = [
  {
    id: "gallery-lighthouse",
    authorId: "demo-mira",
    authorName: "Mira",
    roomId: "local-HARB",
    roomCode: "HARB",
    word: "lighthouse",
    upvotes: 42,
    downvotes: 0,
    publishedAt: Date.now() - 86_400_000 * 2,
    replay: doc("doc-lighthouse", [
      rect("lh-base", 148, 274, 184, 12, colors.plum),
      rect("lh-tower", 198, 178, 52, 96, colors.green),
      rect("lh-band", 198, 218, 52, 14, colors.pink),
      rect("lh-lantern", 188, 154, 72, 28, colors.plum),
      circle("lh-light", 224, 140, 28, colors.chartreuse),
      circle("lh-window", 224, 200, 10, colors.pink),
      circle("lh-rock-a", 168, 284, 18, colors.chartreuse),
      circle("lh-rock-b", 312, 280, 22, colors.pink),
    ]),
  },
  {
    id: "gallery-sunset",
    authorId: "demo-kenji",
    authorName: "Kenji",
    roomId: "local-SUN1",
    roomCode: "SUN1",
    word: "sunset",
    upvotes: 31,
    downvotes: 0,
    publishedAt: Date.now() - 86_400_000 * 5,
    replay: doc("doc-sunset", [
      rect("sun-sky", 40, 40, 720, 260, colors.pinkLight),
      circle("sun-disc", 620, 120, 56, colors.chartreuse),
      rect("sun-hill", 40, 300, 720, 260, colors.green),
      rect("sun-band", 40, 280, 720, 24, colors.plum),
    ]),
  },
  {
    id: "gallery-cactus",
    authorId: "demo-alex",
    authorName: "Alex",
    roomId: "local-DRY2",
    roomCode: "DRY2",
    word: "cactus",
    upvotes: 18,
    downvotes: 0,
    publishedAt: Date.now() - 86_400_000 * 8,
    replay: doc("doc-cactus", [
      rect("cact-ground", 80, 420, 640, 80, colors.plum),
      rect("cact-body", 360, 180, 80, 240, colors.green),
      rect("cact-arm", 280, 240, 80, 40, colors.green),
      rect("cact-arm-up", 280, 200, 40, 80, colors.green),
      circle("cact-flower", 400, 170, 16, colors.pink),
    ]),
  },
  {
    id: "gallery-rocket",
    authorId: "demo-sam",
    authorName: "Sam",
    roomId: "local-MOON",
    roomCode: "MOON",
    word: "rocket",
    upvotes: 27,
    downvotes: 0,
    publishedAt: Date.now() - 86_400_000 * 12,
    replay: doc("doc-rocket", [
      rect("rocket-body", 360, 180, 80, 220, colors.plum),
      rect("rocket-fin-l", 320, 360, 40, 80, colors.pink),
      rect("rocket-fin-r", 440, 360, 40, 80, colors.pink),
      circle("rocket-window", 400, 240, 18, colors.chartreuse),
      circle("rocket-flame", 400, 430, 28, colors.chartreuse),
    ]),
  },
];
