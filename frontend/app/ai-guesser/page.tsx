import type { Metadata } from "next";
import { AiGuesserView } from "@/features/ai-guesser";

export const metadata: Metadata = {
  title: "AI Guesser — Svigl",
  description:
    "Experimental Svigl mode: draw the secret word and see if the AI can guess it.",
};

export default function AiGuesserPage() {
  return <AiGuesserView />;
}
