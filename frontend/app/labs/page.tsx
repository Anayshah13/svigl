import type { Metadata } from "next";
import { LabsView } from "@/features/labs";

export const metadata: Metadata = {
  title: "Svigl Labs",
  description: "Train your drawing precision with skill-based challenges.",
};

export default function LabsPage() {
  return <LabsView />;
}
