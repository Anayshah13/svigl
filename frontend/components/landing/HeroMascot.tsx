"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/cn";
import { colors } from "@/lib/colors";
import { MascotAnAI } from "@/features/anai";
import "@/features/anai/anai.css";

export function HeroMascot({ className }: { className?: string }) {
  const reduceMotion = useReducedMotion();

  return (
    <Link
      href="/ai-guesser"
      aria-label="You draw, AI guesses"
      className={cn(
        "anai-hero-link group relative inline-flex w-full flex-col items-center outline-none",
        "focus-visible:ring-2 focus-visible:ring-plum/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#fafaf8]",
        className,
      )}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-[12%] rounded-full opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100"
        style={{
          background: `radial-gradient(circle, ${colors.chartreuse}55 0%, ${colors.pink}33 46%, transparent 72%)`,
        }}
      />

      <span
        aria-hidden
        className="anai-hero-orbit pointer-events-none absolute inset-[8%] opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100"
      >
        <span
          className="anai-hero-spark absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 rounded-full"
          style={{ background: colors.pink }}
        />
        <span
          className="anai-hero-spark anai-hero-spark-delay absolute bottom-2 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-[3px]"
          style={{ background: colors.chartreuse }}
        />
        <span
          className="anai-hero-spark anai-hero-spark-delay-2 absolute left-0 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full"
          style={{ background: colors.plum }}
        />
      </span>

      <motion.span
        className="relative block w-full"
        whileHover={reduceMotion ? undefined : { scale: 1.1, rotate: -4, y: -6 }}
        whileTap={reduceMotion ? undefined : { scale: 0.96, rotate: 2 }}
        transition={{ type: "spring", stiffness: 340, damping: 16 }}
      >
        <MascotAnAI />
      </motion.span>

      <span className="script-accent relative z-20 mt-0.5 text-center text-[1.25rem] font-semibold leading-[1.2] tracking-tight text-plum transition-transform duration-300 group-hover:scale-105 sm:text-[1.45rem]">
        You draw,
        <br />
        <span className="inline-block pl-6">AI guesses!</span>
      </span>
    </Link>
  );
}
