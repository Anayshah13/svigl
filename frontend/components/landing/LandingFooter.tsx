"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { colors } from "@/lib/colors";

type FooterLink = {
  label: string;
  href: string;
  external?: boolean;
};

const EXPLORE_LINKS: FooterLink[] = [
  { label: "Home", href: "/" },
  { label: "Gallery", href: "/gallery" },
  { label: "Profile", href: "/profile" },
  { label: "Feedback", href: "/feedback" },
];

const CONNECT_LINKS: FooterLink[] = [
  { label: "GitHub", href: "https://github.com/Anayshah13/svigl", external: true },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/anay-shah-5880aa264/", external: true },
];

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
      <path
        fill="currentColor"
        d="M12 .5C5.65.5.5 5.65.5 12A11.5 11.5 0 0 0 8.36 22.94c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.36-3.88-1.36-.53-1.34-1.29-1.7-1.29-1.7-1.06-.72.08-.7.08-.7 1.17.08 1.79 1.2 1.79 1.2 1.04 1.78 2.72 1.27 3.38.97.11-.75.4-1.27.74-1.56-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.47.11-3.07 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.64 1.6.24 2.78.12 3.07.74.81 1.19 1.84 1.19 3.1 0 4.43-2.69 5.4-5.25 5.69.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z"
      />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
      <path
        fill="currentColor"
        d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.4v1.56h.05a3.73 3.73 0 0 1 3.36-1.84c3.6 0 4.27 2.37 4.27 5.45v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0Z"
      />
    </svg>
  );
}

function ExternalIcon() {
  return (
    <svg viewBox="0 0 12 12" aria-hidden="true" className="h-3 w-3">
      <path
        d="M4 2h6v6M10 2l-6 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PrimitiveDoodles() {
  return (
    <div className="pointer-events-none absolute right-4 top-6 hidden gap-3 sm:right-8 sm:top-8 sm:flex">
      <motion.div
        animate={{ y: [0, -4, 0], rotate: [0, 6, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="h-3 w-3 rounded-full"
        style={{ background: colors.pink, opacity: 0.55 }}
      />
      <motion.div
        animate={{ y: [0, 4, 0], rotate: [0, -8, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
        className="h-3 w-3 rounded-sm"
        style={{ background: colors.chartreuse, opacity: 0.55 }}
      />
      <motion.svg
        viewBox="0 0 12 10"
        className="h-3 w-3"
        animate={{ y: [0, -3, 0], rotate: [0, 12, 0] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
      >
        <polygon points="6,1 11,9 1,9" fill={colors.green} opacity={0.55} />
      </motion.svg>
      <motion.svg
        viewBox="0 0 12 12"
        className="h-3 w-3"
        animate={{ y: [0, 3, 0], rotate: [0, -10, 0] }}
        transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
      >
        <circle cx="6" cy="6" r="4.5" fill="none" stroke={colors.plum} strokeWidth="1.5" opacity={0.55} />
      </motion.svg>
    </div>
  );
}

function LinkItem({ link }: { link: FooterLink }) {
  const className =
    "group inline-flex items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-plum";

  if (link.external) {
    return (
      <a href={link.href} target="_blank" rel="noopener noreferrer" className={className}>
        <span>{link.label}</span>
        <span className="text-ink-muted/60 opacity-0 transition-opacity group-hover:opacity-100">
          <ExternalIcon />
        </span>
      </a>
    );
  }

  return (
    <Link href={link.href} className={className}>
      {link.label}
    </Link>
  );
}

function WavyDottedDivider() {
  return (
    <div className="relative z-20 h-8 w-full sm:h-10">
      <motion.svg
        aria-hidden="true"
        viewBox="0 0 1200 32"
        className="h-full w-full text-plum/45"
        preserveAspectRatio="none"
        initial={false}
      >
        <motion.path
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray="2 8"
          animate={{
            d: [
              "M0 16 Q75 -4 150 16 T300 16 T450 16 T600 16 T750 16 T900 16 T1050 16 T1200 16",
              "M0 16 Q75 20 150 16 T300 16 T450 16 T600 16 T750 16 T900 16 T1050 16 T1200 16",
              "M0 16 Q75 -4 150 16 T300 16 T450 16 T600 16 T750 16 T900 16 T1050 16 T1200 16",
            ],
            strokeDashoffset: [0, -40],
          }}
          transition={{
            d: { duration: 5, repeat: Infinity, ease: "easeInOut" },
            strokeDashoffset: { duration: 2.5, repeat: Infinity, ease: "linear" },
          }}
        />
      </motion.svg>
    </div>
  );
}

export function LandingFooter() {
  return (
    <footer className="relative mt-8">
      {/* fade-to-white veil — hides the landing doodles behind the footer */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-40 z-0 h-40"
        style={{
          background:
            "linear-gradient(to bottom, rgba(250,250,248,0) 0%, rgba(250,250,248,0.55) 45%, rgba(250,250,248,0.9) 80%, #FAFAF8 100%)",
        }}
      />

      <div className="relative overflow-hidden bg-bg-base">
        <WavyDottedDivider />

      {/* aurora beams — softer, subtler palette wash */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
        <motion.div
          className="absolute -bottom-20 left-[8%] h-[95%] w-80 rounded-[50%] blur-[58px]"
          style={{
            background: `radial-gradient(ellipse at bottom, ${colors.pink}38 0%, ${colors.pink}14 40%, transparent 72%)`,
          }}
          animate={{ x: [0, 14, -8, 0], scale: [1, 1.03, 0.99, 1] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-24 left-[32%] h-full w-72 rounded-[50%] blur-[62px]"
          style={{
            background: `radial-gradient(ellipse at bottom, ${colors.chartreuse}34 0%, ${colors.chartreuse}12 40%, transparent 72%)`,
          }}
          animate={{ x: [0, -12, 10, 0], scale: [1, 1.04, 0.97, 1] }}
          transition={{ duration: 24, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
        />
        <motion.div
          className="absolute -bottom-22 left-[58%] h-[102%] w-88 rounded-[50%] blur-[68px]"
          style={{
            background: `radial-gradient(ellipse at bottom, ${colors.plum}3a 0%, ${colors.plum}16 40%, transparent 72%)`,
          }}
          animate={{ x: [0, 14, -14, 0], scale: [1, 1.02, 1.01, 1] }}
          transition={{ duration: 28, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
        />
        <motion.div
          className="absolute -bottom-20 left-[78%] h-[96%] w-72 rounded-[50%] blur-[60px]"
          style={{
            background: `radial-gradient(ellipse at bottom, ${colors.green}36 0%, ${colors.green}14 40%, transparent 72%)`,
          }}
          animate={{ x: [0, -14, 8, 0], scale: [1, 1.03, 0.98, 1] }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        />
        {/* upward fade so beams dissolve toward the top */}
        <div
          className="absolute inset-x-0 top-0 h-3/4"
          style={{
            background:
              "linear-gradient(to bottom, rgba(250,250,248,1) 0%, rgba(250,250,248,0.9) 35%, rgba(250,250,248,0.45) 70%, rgba(250,250,248,0) 100%)",
          }}
        />
      </div>

      <motion.div
        className="relative z-10 mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-40px" }}
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.08 } },
        }}
      >
        <PrimitiveDoodles />

        <div className="grid gap-10 sm:gap-12 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)]">
          {/* Brand block */}
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 12 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
            }}
          >
            <Link href="/" aria-label="Svigl home" className="inline-block">
              <span className="script-accent text-[clamp(3rem,7vw,4.5rem)] font-bold leading-none tracking-tight text-plum">
                Svigl.
              </span>
            </Link>
            <p className="mt-4 max-w-sm text-base leading-relaxed text-ink-muted">
              A multiplayer drawing game where every stroke is a real SVG primitive — circles, rects, curves, and all.
            </p>
            <div className="mt-5 flex items-center gap-2">
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider"
                style={{ background: colors.pinkLight, color: colors.plum }}
              >
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full"
                  style={{ background: colors.green }}
                />
                Open beta · v1.0
              </span>
            </div>
          </motion.div>

          {/* Explore column */}
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 12 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
            }}
          >
            <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-ink">Explore</h3>
            <ul className="mt-4 space-y-2.5">
              {EXPLORE_LINKS.map((link) => (
                <li key={link.label}>
                  <LinkItem link={link} />
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Connect column */}
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 12 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
            }}
          >
            <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-ink">Connect</h3>
            <ul className="mt-4 space-y-2.5">
              {CONNECT_LINKS.map((link) => (
                <li key={link.label}>
                  <LinkItem link={link} />
                </li>
              ))}
            </ul>
            <div className="mt-5 flex items-center gap-2">
              <motion.a
                href="https://github.com/Anayshah13/svigl"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
                whileHover={{ y: -2 }}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-plum/15 bg-white/70 text-ink-muted transition-colors hover:border-plum/40 hover:bg-white hover:text-plum"
              >
                <GitHubIcon />
              </motion.a>
              <motion.a
                href="https://www.linkedin.com/in/anay-shah-5880aa264/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                whileHover={{ y: -2 }}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-plum/15 bg-white/70 text-ink-muted transition-colors hover:border-plum/40 hover:bg-white hover:text-plum"
              >
                <LinkedInIcon />
              </motion.a>
            </div>
          </motion.div>
        </div>

        {/* Bottom bar */}
        <motion.div
          className="mt-12 flex flex-col gap-3 border-t border-plum/10 pt-6 sm:mt-14 sm:flex-row sm:items-center sm:justify-between"
          variants={{
            hidden: { opacity: 0, y: 8 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
          }}
        >
          <p className="text-xs text-ink-muted">© 2026 Svigl · Built with SVG primitives.</p>
          <p className="flex items-center gap-1.5 text-xs text-ink-muted">
            <span>Crafted by</span>
            <a
              href="https://www.linkedin.com/in/anay-shah-5880aa264/"
              target="_blank"
              rel="noopener noreferrer"
              className="script-accent text-base font-semibold text-plum transition-opacity hover:opacity-80"
            >
              Anay Shah
            </a>
          </p>
        </motion.div>
      </motion.div>
      </div>
    </footer>
  );
}
