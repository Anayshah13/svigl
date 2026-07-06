"use client";

import { motion } from "framer-motion";

const FOOTER_LINKS = [
  { label: "Twitter", href: "#" },
  { label: "GitHub", href: "#" },
  { label: "Changelog", href: "#" },
  { label: "Privacy", href: "#" },
] as const;

export function LandingFooter() {
  return (
    <footer className="mx-auto max-w-7xl border-t border-black/5 px-4 py-6 sm:px-6 sm:py-8">
      <motion.div
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-20px" }}
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.07 } },
        }}
      >
        <motion.p
          className="text-xs text-ink-muted"
          variants={{
            hidden: { opacity: 0, y: 8 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
          }}
        >
          Svigl · © 2026
        </motion.p>
        <nav className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Footer">
          {FOOTER_LINKS.map((link) => (
            <motion.a
              key={link.label}
              href={link.href}
              className="text-xs text-ink-muted transition-colors hover:text-ink"
              variants={{
                hidden: { opacity: 0, y: 8 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
              }}
              whileHover={{ y: -1 }}
            >
              {link.label}
            </motion.a>
          ))}
        </nav>
      </motion.div>
    </footer>
  );
}
