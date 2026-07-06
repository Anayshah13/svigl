import type { Metadata } from "next";
import { FeedbackPage } from "@/features/feedback/FeedbackPage";

export const metadata: Metadata = {
  title: "Feedback — Svigl",
  description: "Report a bug or send feedback about Svigl.",
};

export default function FeedbackRoute() {
  return <FeedbackPage />;
}
