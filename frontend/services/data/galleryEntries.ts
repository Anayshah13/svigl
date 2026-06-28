import type { DrawingDocument, Shape, Style } from "@/types/drawing";
import type { GalleryEntry } from "@/types/domain";
import { colors } from "@/lib/colors";

const now = Date.now();

function style(
  stroke: string,
  fill: string | "none" = "none",
  strokeWidth: 2 | 4 | 6 = 2,
): Style {
  return { strokeColor: stroke, strokeWidth, fillColor: fill, opacity: 1 };
}

function shape(partial: Shape): Shape {
  return partial;
}

function doc(id: string, shapes: Shape[]): DrawingDocument {
  return { id, version: 1, createdAt: now, operations: [], shapes };
}

function entry(
  id: string,
  word: string,
  author: string,
  roomCode: string,
  upvotes: number,
  shapes: Shape[],
  offset = 0,
): GalleryEntry {
  return {
    id: `sample-${id}`,
    authorId: `author-${id}`,
    authorName: author,
    roomId: `room-${id}`,
    roomCode,
    word,
    replay: doc(id, shapes),
    upvotes,
    downvotes: 0,
    publishedAt: now - offset * 86400000,
  };
}

/** Umbrella — arc path + rectangle handle */
const umbrella: Shape[] = [
  shape({
    id: "u1",
    type: "path",
    geometry: {
      nodes: [
        {
          id: "n1",
          position: { x: 400, y: 180 },
          incomingHandle: null,
          outgoingHandle: { x: 320, y: 120 },
        },
        {
          id: "n2",
          position: { x: 520, y: 180 },
          incomingHandle: { x: 480, y: 120 },
          outgoingHandle: null,
        },
      ],
    },
    style: style(colors.plum, "none", 4),
    createdBy: "leo",
    createdAt: now,
    updatedAt: now,
  }),
  shape({
    id: "u2",
    type: "rectangle",
    geometry: { x: 392, y: 180, width: 16, height: 120 },
    style: style(colors.green, colors.green, 2),
    createdBy: "leo",
    createdAt: now,
    updatedAt: now,
  }),
];

/** Mountains + sun */
const mountains: Shape[] = [
  shape({
    id: "m1",
    type: "circle",
    geometry: { cx: 620, cy: 140, radius: 48 },
    style: style(colors.chartreuse, colors.chartreuse),
    createdBy: "mira",
    createdAt: now,
    updatedAt: now,
  }),
  shape({
    id: "m2",
    type: "path",
    geometry: {
      nodes: [
        { id: "a", position: { x: 120, y: 420 }, incomingHandle: null, outgoingHandle: null },
        { id: "b", position: { x: 280, y: 220 }, incomingHandle: null, outgoingHandle: null },
        { id: "c", position: { x: 440, y: 420 }, incomingHandle: null, outgoingHandle: null },
      ],
    },
    style: style(colors.plum, "none", 4),
    createdBy: "mira",
    createdAt: now,
    updatedAt: now,
  }),
  shape({
    id: "m3",
    type: "path",
    geometry: {
      nodes: [
        { id: "d", position: { x: 300, y: 420 }, incomingHandle: null, outgoingHandle: null },
        { id: "e", position: { x: 480, y: 260 }, incomingHandle: null, outgoingHandle: null },
        { id: "f", position: { x: 680, y: 420 }, incomingHandle: null, outgoingHandle: null },
      ],
    },
    style: style(colors.green, "none", 4),
    createdBy: "mira",
    createdAt: now,
    updatedAt: now,
  }),
];

/** Hot air balloon */
const balloon: Shape[] = [
  shape({
    id: "b1",
    type: "circle",
    geometry: { cx: 400, cy: 260, radius: 90 },
    style: style(colors.pink, colors.pink),
    createdBy: "ada",
    createdAt: now,
    updatedAt: now,
  }),
  shape({
    id: "b2",
    type: "rectangle",
    geometry: { x: 372, y: 350, width: 56, height: 48 },
    style: style(colors.ink, colors.chartreuse, 2),
    createdBy: "ada",
    createdAt: now,
    updatedAt: now,
  }),
  shape({
    id: "b3",
    type: "path",
    geometry: {
      nodes: [
        { id: "p1", position: { x: 372, y: 350 }, incomingHandle: null, outgoingHandle: null },
        { id: "p2", position: { x: 400, y: 340 }, incomingHandle: null, outgoingHandle: null },
        { id: "p3", position: { x: 428, y: 350 }, incomingHandle: null, outgoingHandle: null },
      ],
    },
    style: style(colors.ink, "none", 2),
    createdBy: "ada",
    createdAt: now,
    updatedAt: now,
  }),
];

/** Robot face */
const robot: Shape[] = [
  shape({
    id: "r1",
    type: "rectangle",
    geometry: { x: 280, y: 200, width: 240, height: 180 },
    style: style(colors.ink, "#E5E7EB", 4),
    createdBy: "kenji",
    createdAt: now,
    updatedAt: now,
  }),
  shape({
    id: "r2",
    type: "circle",
    geometry: { cx: 340, cy: 280, radius: 28 },
    style: style(colors.plum, colors.plum),
    createdBy: "kenji",
    createdAt: now,
    updatedAt: now,
  }),
  shape({
    id: "r3",
    type: "circle",
    geometry: { cx: 460, cy: 280, radius: 28 },
    style: style(colors.plum, colors.plum),
    createdBy: "kenji",
    createdAt: now,
    updatedAt: now,
  }),
  shape({
    id: "r4",
    type: "rectangle",
    geometry: { x: 350, y: 340, width: 100, height: 12 },
    style: style(colors.green, colors.green),
    createdBy: "kenji",
    createdAt: now,
    updatedAt: now,
  }),
];

/** Lighthouse — curves + rects */
const lighthouse: Shape[] = [
  shape({
    id: "l1",
    type: "rectangle",
    geometry: { x: 360, y: 280, width: 80, height: 140 },
    style: style(colors.green, colors.green, 2),
    createdBy: "noor",
    createdAt: now,
    updatedAt: now,
  }),
  shape({
    id: "l2",
    type: "circle",
    geometry: { cx: 400, cy: 260, radius: 50 },
    style: style(colors.chartreuse, colors.chartreuse),
    createdBy: "noor",
    createdAt: now,
    updatedAt: now,
  }),
  shape({
    id: "l3",
    type: "path",
    geometry: {
      nodes: [
        {
          id: "c1",
          position: { x: 180, y: 420 },
          incomingHandle: null,
          outgoingHandle: { x: 280, y: 360 },
        },
        {
          id: "c2",
          position: { x: 400, y: 400 },
          incomingHandle: { x: 340, y: 440 },
          outgoingHandle: { x: 460, y: 380 },
        },
        {
          id: "c3",
          position: { x: 620, y: 420 },
          incomingHandle: { x: 540, y: 360 },
          outgoingHandle: null,
        },
      ],
    },
    style: style(colors.plum, "none", 4),
    createdBy: "noor",
    createdAt: now,
    updatedAt: now,
  }),
];

/** Cactus — rects + circle */
const cactus: Shape[] = [
  shape({
    id: "x1",
    type: "rectangle",
    geometry: { x: 380, y: 220, width: 40, height: 160 },
    style: style(colors.green, colors.green),
    createdBy: "leo",
    createdAt: now,
    updatedAt: now,
  }),
  shape({
    id: "x2",
    type: "rectangle",
    geometry: { x: 340, y: 280, width: 40, height: 24 },
    style: style(colors.green, colors.green),
    createdBy: "leo",
    createdAt: now,
    updatedAt: now,
  }),
  shape({
    id: "x3",
    type: "rectangle",
    geometry: { x: 420, y: 300, width: 40, height: 24 },
    style: style(colors.green, colors.green),
    createdBy: "leo",
    createdAt: now,
    updatedAt: now,
  }),
  shape({
    id: "x4",
    type: "circle",
    geometry: { cx: 400, cy: 420, radius: 80 },
    style: style(colors.pink, colors.pink, 2),
    createdBy: "leo",
    createdAt: now,
    updatedAt: now,
  }),
];

/** Abstract curves */
const abstract: Shape[] = [
  shape({
    id: "a1",
    type: "path",
    geometry: {
      nodes: [
        {
          id: "s1",
          position: { x: 100, y: 300 },
          incomingHandle: null,
          outgoingHandle: { x: 200, y: 100 },
        },
        {
          id: "s2",
          position: { x: 400, y: 280 },
          incomingHandle: { x: 300, y: 460 },
          outgoingHandle: { x: 500, y: 120 },
        },
        {
          id: "s3",
          position: { x: 700, y: 320 },
          incomingHandle: { x: 600, y: 480 },
          outgoingHandle: null,
        },
      ],
    },
    style: style(colors.plum, "none", 4),
    createdBy: "rin",
    createdAt: now,
    updatedAt: now,
  }),
  shape({
    id: "a2",
    type: "rectangle",
    geometry: { x: 180, y: 180, width: 64, height: 64 },
    style: style(colors.pink, colors.pink, 2),
    createdBy: "rin",
    createdAt: now,
    updatedAt: now,
  }),
  shape({
    id: "a3",
    type: "circle",
    geometry: { cx: 580, cy: 200, radius: 40 },
    style: style(colors.chartreuse, colors.chartreuse),
    createdBy: "rin",
    createdAt: now,
    updatedAt: now,
  }),
];

/** Panda */
const panda: Shape[] = [
  shape({
    id: "pd1",
    type: "circle",
    geometry: { cx: 400, cy: 300, radius: 100 },
    style: style(colors.ink, "#F3F4F6", 4),
    createdBy: "mira",
    createdAt: now,
    updatedAt: now,
  }),
  shape({
    id: "pd2",
    type: "circle",
    geometry: { cx: 340, cy: 240, radius: 36 },
    style: style(colors.ink, colors.ink),
    createdBy: "mira",
    createdAt: now,
    updatedAt: now,
  }),
  shape({
    id: "pd3",
    type: "circle",
    geometry: { cx: 460, cy: 240, radius: 36 },
    style: style(colors.ink, colors.ink),
    createdBy: "mira",
    createdAt: now,
    updatedAt: now,
  }),
  shape({
    id: "pd4",
    type: "circle",
    geometry: { cx: 360, cy: 290, radius: 14 },
    style: style(colors.ink, colors.ink),
    createdBy: "mira",
    createdAt: now,
    updatedAt: now,
  }),
  shape({
    id: "pd5",
    type: "circle",
    geometry: { cx: 440, cy: 290, radius: 14 },
    style: style(colors.ink, colors.ink),
    createdBy: "mira",
    createdAt: now,
    updatedAt: now,
  }),
];

export const GALLERY_ENTRIES: GalleryEntry[] = [
  entry("umbrella", "Sailing umbrella", "leo", "QXP4M", 24, umbrella, 1),
  entry("mountains", "Mountain morning", "mira", "H7K2P", 41, mountains, 2),
  entry("balloon", "Hot air balloon", "ada", "M3N8R", 33, balloon, 3),
  entry("robot", "Robot friend", "kenji", "GVU7S", 19, robot, 4),
  entry("lighthouse", "Lighthouse at dusk", "noor", "B2W9X", 28, lighthouse, 5),
  entry("cactus", "Desert cactus", "leo", "K4P1T", 15, cactus, 6),
  entry("abstract", "Squiggle study", "rin", "Z8L3Q", 52, abstract, 7),
  entry("panda", "Panda nap", "mira", "F6R2N", 37, panda, 8),
];

