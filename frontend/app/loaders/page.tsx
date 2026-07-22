"use client";

import { motion } from "framer-motion";
import "./loaders.css";
import { LOADER_SET_A } from "./loaders-set-a";
import { LOADER_SET_B } from "./loaders-set-b";
import { LOADER_SET_C } from "./loaders-set-c";

const colors = {
  pink: "#ED7FB8",
  green: "#10865C",
  plum: "#703F93",
  chartreuse: "#BBE331",
};

const ALL_LOADERS = [...LOADER_SET_A, ...LOADER_SET_B, ...LOADER_SET_C];

function LoaderCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      tabIndex={0}
      className="group flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-[#1a1a2e]/95 p-6 shadow-xl backdrop-blur-sm transition-all hover:border-white/20 hover:shadow-2xl focus-visible:border-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#BBE331]/40"
    >
      <div className="flex h-48 w-full items-center justify-center">{children}</div>
      <div className="text-center">
        <p className="text-xs font-medium uppercase tracking-wider text-white/50">{title}</p>
        {description ? (
          <p className="mt-1 text-[11px] leading-snug text-white/30">{description}</p>
        ) : null}
      </div>
      <p className="text-[10px] uppercase tracking-widest text-white/20 transition-colors group-hover:text-[#BBE331]/70 group-focus-within:text-[#BBE331]/70">
        Hover to play
      </p>
    </motion.div>
  );
}

export default function LoadersShowcasePage() {
  return (
    <div className="min-h-screen bg-[#0d0d1a] px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mb-12 text-center"
        >
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-white/30">
            Prototype gallery
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-white/90 sm:text-5xl lg:text-6xl">
            Svigl <span style={{ color: colors.chartreuse }}>Loaders</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-white/40 sm:text-lg">
            Fifteen CSS &amp; SVG loader ideas in brand colors. Static by default —
            hover a card to preview the motion. Pick one later for landing, network waits,
            and the game room.
          </p>
          <div className="mx-auto mt-6 flex flex-wrap items-center justify-center gap-2">
            {[
              { label: "pink", color: colors.pink },
              { label: "green", color: colors.green },
              { label: "plum", color: colors.plum },
              { label: "chartreuse", color: colors.chartreuse },
            ].map((swatch) => (
              <span
                key={swatch.label}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-2.5 py-1 text-[10px] uppercase tracking-wider text-white/40"
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: swatch.color }}
                />
                {swatch.label}
              </span>
            ))}
          </div>
        </motion.div>

        <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {ALL_LOADERS.map((item) => (
            <LoaderCard key={item.title} title={item.title} description={item.description}>
              <item.component />
            </LoaderCard>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-16 text-center text-sm text-white/25"
        >
          Demo only — nothing is wired into the app yet. Tell us which one you want live.
        </motion.p>
      </div>
    </div>
  );
}
