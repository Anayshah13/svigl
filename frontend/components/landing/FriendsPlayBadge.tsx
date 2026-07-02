"use client";

import { motion } from "framer-motion";
import { colors } from "@/lib/colors";

const FRIENDS = [
  { initial: "Y", color: colors.pink },
  { initial: "K", color: colors.plum },
  { initial: "A", color: colors.green },
  { initial: "L", color: colors.chartreuse },
];

export function FriendsPlayBadge({ embedded = false }: { embedded?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35, duration: 0.5 }}
      className={
        embedded
          ? "flex flex-wrap items-center gap-2.5 pt-3"
          : "mt-5 inline-flex flex-wrap items-center gap-3 rounded-2xl border border-white/70 bg-white/75 px-4 py-2.5 shadow-sm backdrop-blur-sm"
      }
    >
      <div className="flex items-center">
        {FRIENDS.map((f, i) => (
          <motion.div
            key={f.initial}
            initial={{ scale: 0, x: -20 }}
            animate={{ scale: 1, x: -10 * i }}
            transition={{ delay: 0.5 + i * 0.08, type: "spring", stiffness: 320 }}
            className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-xs font-bold text-white shadow-md"
            style={{ backgroundColor: f.color, zIndex: FRIENDS.length - i }}
          >
            {f.initial}
          </motion.div>
        ))}
        <motion.span
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2.5, repeat: Infinity }}
          className="ml-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-dashed border-plum/30 text-[10px] font-bold text-plum"
        >
          +8
        </motion.span>
      </div>
      <div className="h-8 w-px bg-plum/15" />
      <p className="text-xs font-semibold text-ink sm:text-sm">
        Play live with friends
        <span className="ml-1 font-normal text-ink-muted">· share a room code, no download</span>
      </p>
    </motion.div>
  );
}

/** Tiny pulsing “live rooms” hint for the CTA row */
export function LiveRoomsHint() {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-green">
      <motion.span
        className="h-2 w-2 rounded-full bg-green"
        animate={{ scale: [1, 1.35, 1], opacity: [1, 0.6, 1] }}
        transition={{ duration: 1.8, repeat: Infinity }}
      />
      rooms open now
    </span>
  );
}
