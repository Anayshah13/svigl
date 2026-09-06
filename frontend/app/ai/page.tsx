import type { Metadata } from "next";
import { AnaiGallery } from "@/features/anai";

export const metadata: Metadata = {
  title: "AnAI 1.3 Pro — Svigl",
  description:
    "Ten doodle mascot types for Svigl AI Guesser, in the same language as the landing CTA character.",
};

export default function AiMascotPage() {
  return <AnaiGallery />;
}
