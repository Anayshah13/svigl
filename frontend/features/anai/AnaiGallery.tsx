"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { colors } from "@/lib/colors";
import { ANAI_MASCOTS } from "./mascots";
import "./anai.css";

const SWATCHES = [
  { label: "pink", color: colors.pink },
  { label: "green", color: colors.green },
  { label: "plum", color: colors.plum },
  { label: "lime", color: colors.chartreuse },
] as const;

function MascotCard({
  index,
  name,
  title,
  description,
  children,
}: {
  index: number;
  name: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      tabIndex={0}
      className="anai-card group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#141428]/95 shadow-xl backdrop-blur-sm transition-all hover:border-white/20 hover:shadow-2xl focus-visible:border-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#BBE331]/40"
    >
      <div className="flex min-h-65 items-center justify-center bg-[#fafaf8] px-4 py-6 sm:min-h-70">
        <div className="h-56 w-full max-w-72">{children}</div>
      </div>
      <div className="border-t border-white/10 px-5 py-4">
        <p className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-[#BBE331]/80">
          {String(index).padStart(2, "0")} · {name}
        </p>
        <h2 className="mt-1.5 text-lg font-semibold text-white/90">{title}</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-white/40">{description}</p>
      </div>
    </motion.article>
  );
}

export function AnaiGallery() {
  return (
    <div className="min-h-screen bg-[#0d0d1a] px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <motion.header
          initial={{ opacity: 0, y: -18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="mb-12 text-center"
        >
          <p className="mb-3 font-mono text-[0.7rem] font-semibold uppercase tracking-[0.35em] text-[#BBE331]">
            AI Guesser · AnAI mascot
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-white/90 sm:text-5xl lg:text-6xl">
            <span className="font-script text-[1.15em] font-bold tracking-tight text-[#ED7FB8]">AnAI</span>{" "}
            <span style={{ color: colors.chartreuse }}>1.3 Pro</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm text-white/40 sm:text-base">
            Round head, visor eyes, segmented robotic arms with Lego clamp hands,
            chest waveform, two wheels. Emotionless.
          </p>
          <div className="mx-auto mt-6 flex flex-wrap items-center justify-center gap-2">
            {SWATCHES.map((swatch) => (
              <span
                key={swatch.label}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-2.5 py-1 text-[10px] uppercase tracking-wider text-white/40"
              >
                <span className="h-2 w-2 rounded-full" style={{ background: swatch.color }} />
                {swatch.label}
              </span>
            ))}
          </div>
        </motion.header>

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {ANAI_MASCOTS.map((mascot, i) => (
            <MascotCard
              key={mascot.id}
              index={i + 1}
              name={mascot.name}
              title={mascot.title}
              description={mascot.description}
            >
              <mascot.Component />
            </MascotCard>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-16 text-center text-sm text-white/25"
        >
          One mascot. Zero emotions. Pure robot.
        </motion.p>
      </div>
    </div>
  );
}
