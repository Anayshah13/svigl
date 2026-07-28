"use client";

import Link from "next/link";
import { FadeIn, FadeInItem, FadeInStagger } from "@/components/motion/FadeIn";
import { Button } from "@/components/ui/Button";
import { getAllLabs, labsLeaderboardPath } from "./config";
import { LabCard } from "./components/LabCard";
import { SectionHeader } from "./components/SectionHeader";

export function LabsView() {
  const labs = getAllLabs();

  return (
    <div className="page-shell gap-8 sm:gap-10">
      <FadeIn>
        <SectionHeader
          eyebrow="Experiments"
          title="Svigl Labs"
          description="Train your drawing precision with skill-based challenges."
          action={
            <Link href={labsLeaderboardPath()}>
              <Button variant="outline" size="sm">
                All leaderboards
              </Button>
            </Link>
          }
        />
      </FadeIn>

      <FadeInStagger className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
        {labs.map((lab) => (
          <FadeInItem key={lab.id}>
            <LabCard lab={lab} />
          </FadeInItem>
        ))}
      </FadeInStagger>
    </div>
  );
}
