import type { LabAccent } from "./types";

export const ACCENT_TEXT: Record<LabAccent, string> = {
  plum: "text-plum",
  pink: "text-pink",
  green: "text-green",
  chartreuse: "text-ink",
  blue: "text-blue",
};

export const ACCENT_BG_SOFT: Record<LabAccent, string> = {
  plum: "bg-plum-light",
  pink: "bg-pink-light",
  green: "bg-green-light",
  chartreuse: "bg-[rgba(187,227,49,0.22)]",
  blue: "bg-blue-light",
};

export const ACCENT_BORDER: Record<LabAccent, string> = {
  plum: "border-plum/20",
  pink: "border-pink/25",
  green: "border-green/20",
  chartreuse: "border-chartreuse/40",
  blue: "border-blue/25",
};

export const ACCENT_RING: Record<LabAccent, string> = {
  plum: "ring-plum/20",
  pink: "ring-pink/25",
  green: "ring-green/20",
  chartreuse: "ring-chartreuse/35",
  blue: "ring-blue/25",
};
