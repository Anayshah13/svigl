"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useId } from "react";
import { cn } from "@/lib/cn";
import { colors } from "@/lib/colors";

/** Stacked Caveat / Galindo lockup used across Labs CTA iterations (logo 04). */
function StackLockup({
  className,
  sviglClassName,
  labsClassName,
}: {
  className?: string;
  sviglClassName?: string;
  labsClassName?: string;
}) {
  return (
    <span className={cn("relative z-10 flex flex-col items-center leading-none", className)}>
      <span
        className={cn(
          "script-accent font-bold tracking-tight text-plum",
          sviglClassName ?? "text-[2.35rem] sm:text-[2.65rem]",
        )}
      >
        Svigl
      </span>
      <span
        className={cn(
          "font-display tracking-wide text-green",
          labsClassName ?? "mt-0.5 text-[1.15rem] sm:text-[1.3rem]",
        )}
      >
        Labs
      </span>
    </span>
  );
}

type CtaShellProps = {
  href?: string;
  className?: string;
  children: React.ReactNode;
  label?: string;
};

function CtaShell({ href = "/labs", className, children, label = "Try Svigl Labs" }: CtaShellProps) {
  return (
    <Link
      href={href}
      aria-label={label}
      className={cn(
        "group relative inline-flex flex-col items-center outline-none",
        "focus-visible:ring-2 focus-visible:ring-plum/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#fafaf8]",
        className,
      )}
    >
      <span className="pointer-events-none absolute -top-5 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap font-mono text-[0.55rem] font-semibold uppercase tracking-[0.28em] text-ink/45 transition-colors group-hover:text-ink/70">
        also try…
      </span>
      {children}
    </Link>
  );
}

/* ─── 01 · Overlapping Soft Shapes (kept) ───────────────────── */

export function LabsCtaOverlapShapes({ href }: { href?: string }) {
  return (
    <CtaShell href={href}>
      <motion.span
        className="relative flex h-40 w-42 items-center justify-center sm:h-44 sm:w-46"
        whileHover={{ scale: 1.04 }}
        transition={{ type: "spring", stiffness: 300, damping: 22 }}
      >
        <motion.span
          aria-hidden
          className="absolute left-[6%] top-[18%] h-[4.6rem] w-[4.6rem] rounded-full"
          style={{ background: `${colors.pink}C8` }}
          animate={{ x: [0, 6, 0], y: [0, -8, 0], rotate: [0, 8, 0] }}
          transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.span
          aria-hidden
          className="absolute bottom-[12%] right-[4%] h-[4.2rem] w-[4.2rem] rounded-[1.15rem]"
          style={{ background: `${colors.chartreuse}D0` }}
          animate={{ x: [0, -7, 0], y: [0, 6, 0], rotate: [12, -4, 12] }}
          transition={{ duration: 7.2, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
        />
        <motion.span
          aria-hidden
          className="absolute right-[18%] top-[8%] h-0 w-0"
          style={{
            borderLeft: "28px solid transparent",
            borderRight: "28px solid transparent",
            borderBottom: `48px solid ${colors.plum}B8`,
          }}
          animate={{ y: [0, 7, 0], rotate: [-10, 6, -10] }}
          transition={{ duration: 5.8, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        />
        <motion.span
          aria-hidden
          className="absolute left-[22%] bottom-[10%] h-3.5 w-3.5 rounded-full"
          style={{ background: colors.green }}
          animate={{ scale: [1, 1.35, 1], opacity: [0.85, 1, 0.85] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.span
          className="relative z-10 rounded-2xl bg-white px-3 py-2 shadow-[0_12px_28px_-12px_rgba(44,44,44,0.28)]"
          animate={{ y: [0, -3, 0] }}
          transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut" }}
        >
          <StackLockup
            sviglClassName="-translate-x-[4px] text-[2.35rem] sm:text-[2.6rem]"
            labsClassName="mt-0.5 text-[1rem] sm:text-[1.1rem]"
          />
        </motion.span>
      </motion.span>
    </CtaShell>
  );
}

/* ─── 02 · Dual Orbit Squircle (kept) ───────────────────────── */

export function LabsCtaDualOrbit({ href }: { href?: string }) {
  return (
    <CtaShell href={href}>
      <motion.span
        className="relative flex h-40 w-40 items-center justify-center sm:h-44 sm:w-44"
        whileHover={{ scale: 1.05 }}
        transition={{ type: "spring", stiffness: 300, damping: 22 }}
      >
        <motion.span
          aria-hidden
          className="absolute inset-[12%] rounded-4xl"
          style={{
            background: `linear-gradient(160deg, ${colors.white}f2, ${colors.pink}18 40%, ${colors.chartreuse}22)`,
            boxShadow: `0 16px 36px -18px ${colors.plum}55`,
          }}
          animate={{ borderRadius: ["2rem", "2.6rem 1.6rem 2.4rem 1.8rem", "2rem"] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />

        <svg aria-hidden viewBox="0 0 160 160" className="absolute inset-0 h-full w-full">
          <motion.g
            animate={{ rotate: 360 }}
            transition={{ duration: 16, repeat: Infinity, ease: "linear" }}
            style={{ originX: 0.5, originY: 0.5 }}
          >
            <circle
              cx="80"
              cy="80"
              r="70"
              fill="none"
              stroke={colors.plum}
              strokeWidth="2"
              strokeDasharray="14 10"
              strokeOpacity="0.55"
            />
            <circle cx="80" cy="10" r="4" fill={colors.chartreuse} />
            <circle cx="80" cy="150" r="3" fill={colors.pink} />
          </motion.g>
          <motion.g
            animate={{ rotate: -360 }}
            transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
            style={{ originX: 0.5, originY: 0.5 }}
          >
            <circle
              cx="80"
              cy="80"
              r="58"
              fill="none"
              stroke={colors.green}
              strokeWidth="1.5"
              strokeDasharray="5 11"
              strokeOpacity="0.5"
            />
            <circle cx="22" cy="80" r="3.25" fill={colors.plum} />
          </motion.g>
        </svg>

        <motion.span
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 4.4, repeat: Infinity, ease: "easeInOut" }}
        >
          <StackLockup />
        </motion.span>
      </motion.span>
    </CtaShell>
  );
}

/* ─── 03 · Swirl Test Tube ──────────────────────────────────── */

export function LabsCtaSwirlTube({ href }: { href?: string }) {
  const uid = useId().replace(/:/g, "");
  const clipId = `tube-clip-${uid}`;
  const swirlId = `tube-swirl-${uid}`;
  const glassId = `tube-glass-${uid}`;

  return (
    <CtaShell href={href}>
      <motion.span
        className="relative flex h-48 w-36 items-center justify-center sm:h-52 sm:w-40"
        whileHover={{ scale: 1.04 }}
        transition={{ type: "spring", stiffness: 300, damping: 22 }}
      >
        {/* soft pastel wash behind */}
        <motion.span
          aria-hidden
          className="absolute left-1/2 top-[28%] h-28 w-28 -translate-x-1/2 rounded-full"
          style={{ background: `${colors.pink}22` }}
          animate={{ scale: [1, 1.12, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.span
          aria-hidden
          className="absolute bottom-[8%] right-[8%] h-16 w-16 rounded-2xl"
          style={{ background: `${colors.chartreuse}30` }}
          animate={{ y: [0, -6, 0], rotate: [8, -4, 8] }}
          transition={{ duration: 6.2, repeat: Infinity, ease: "easeInOut" }}
        />

        <motion.svg
          aria-hidden
          viewBox="0 0 100 180"
          className="absolute inset-x-0 top-0 mx-auto h-full w-[5.5rem] sm:w-24"
          animate={{ rotate: [3, -2, 3], y: [0, -4, 0] }}
          transition={{ duration: 5.8, repeat: Infinity, ease: "easeInOut" }}
        >
          <defs>
            <clipPath id={clipId}>
              <rect x="34" y="28" width="32" height="128" rx="16" />
            </clipPath>
            <linearGradient id={glassId} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={colors.white} stopOpacity="0.55" />
              <stop offset="35%" stopColor={colors.white} stopOpacity="0.05" />
              <stop offset="100%" stopColor={colors.plum} stopOpacity="0.06" />
            </linearGradient>
            <linearGradient id={swirlId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={colors.chartreuse} stopOpacity="0.55" />
              <stop offset="45%" stopColor={colors.pink} stopOpacity="0.4" />
              <stop offset="100%" stopColor={colors.plum} stopOpacity="0.45" />
            </linearGradient>
          </defs>

          {/* shadow */}
          <ellipse cx="50" cy="168" rx="22" ry="5" fill={colors.ink} fillOpacity="0.08" />

          {/* liquid — translucent ribbons swirling inside the tube */}
          <g clipPath={`url(#${clipId})`}>
            <rect x="34" y="78" width="32" height="78" fill={colors.chartreuse} fillOpacity="0.1" />
            <g transform="translate(50 118)">
              <motion.g
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                style={{ originX: 0.5, originY: 0.5 }}
              >
                <ellipse cx="0" cy="0" rx="26" ry="16" fill={`url(#${swirlId})`} />
              </motion.g>
              <motion.g
                animate={{ rotate: -360 }}
                transition={{ duration: 5.5, repeat: Infinity, ease: "linear" }}
                style={{ originX: 0.5, originY: 0.5 }}
              >
                <ellipse cx="0" cy="0" rx="11" ry="24" fill={colors.plum} fillOpacity="0.16" />
              </motion.g>
              <motion.g
                animate={{ rotate: 360 }}
                transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
                style={{ originX: 0.5, originY: 0.5 }}
              >
                <path
                  d="M-18 0 C-8 -18, 8 -18, 18 0 C8 18, -8 18, -18 0 Z"
                  fill={colors.pink}
                  fillOpacity="0.26"
                />
              </motion.g>
            </g>
            {/* meniscus */}
            <motion.ellipse
              cx="50"
              rx="15.5"
              ry="3.2"
              fill={colors.white}
              fillOpacity="0.4"
              animate={{ cy: [78, 74, 78] }}
              transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
            />
            {/* tiny clear bubbles */}
            {[
              { cx: 42, r: 2, delay: 0 },
              { cx: 55, r: 1.5, delay: 1.1 },
              { cx: 48, r: 1.8, delay: 2 },
            ].map((b) => (
              <motion.circle
                key={`${b.cx}-${b.delay}`}
                cx={b.cx}
                r={b.r}
                fill={colors.white}
                fillOpacity="0.55"
                stroke={colors.plum}
                strokeWidth="0.4"
                strokeOpacity="0.2"
                animate={{ cy: [150, 82], opacity: [0, 0.65, 0] }}
                transition={{
                  duration: 3.8,
                  repeat: Infinity,
                  ease: "easeOut",
                  delay: b.delay,
                }}
              />
            ))}
          </g>

          {/* glass body */}
          <rect
            x="34"
            y="28"
            width="32"
            height="128"
            rx="16"
            fill={`url(#${glassId})`}
            stroke={colors.ink}
            strokeWidth="2"
            strokeOpacity="0.85"
          />
          {/* lip */}
          <rect
            x="32"
            y="24"
            width="36"
            height="8"
            rx="3"
            fill="none"
            stroke={colors.ink}
            strokeWidth="2"
          />
          {/* cork */}
          <rect x="38" y="10" width="24" height="16" rx="3" fill={colors.plum} fillOpacity="0.85" />
          <rect x="40" y="12" width="20" height="4" rx="1.5" fill={colors.white} fillOpacity="0.2" />
          {/* glass highlight */}
          <path
            d="M40 40 v90"
            stroke={colors.white}
            strokeWidth="3"
            strokeLinecap="round"
            strokeOpacity="0.45"
          />
          {/* tick marks */}
          {[55, 75, 95, 115].map((y) => (
            <line
              key={y}
              x1="58"
              y1={y}
              x2="64"
              y2={y}
              stroke={colors.ink}
              strokeWidth="1"
              strokeOpacity="0.2"
            />
          ))}
        </motion.svg>

        <motion.span
          className="relative z-10 -mt-2 rounded-2xl bg-white/70 px-2.5 py-1.5 shadow-[0_8px_20px_-10px_rgba(44,44,44,0.25)] backdrop-blur-[2px]"
          animate={{ y: [0, -3, 0] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <StackLockup
            sviglClassName="text-[1.85rem] sm:text-[2.05rem]"
            labsClassName="mt-0 text-[0.95rem] sm:text-[1.05rem]"
          />
        </motion.span>
      </motion.span>
    </CtaShell>
  );
}

/* ─── 04 · Petal Bloom ──────────────────────────────────────── */

export function LabsCtaPetalBloom({ href }: { href?: string }) {
  const petals = [
    { color: `${colors.pink}42`, rotate: 0 },
    { color: `${colors.plum}38`, rotate: 60 },
    { color: `${colors.chartreuse}48`, rotate: 120 },
    { color: `${colors.green}35`, rotate: 180 },
    { color: `${colors.pink}36`, rotate: 240 },
    { color: `${colors.plum}32`, rotate: 300 },
  ];

  return (
    <CtaShell href={href}>
      <motion.span
        className="relative flex h-40 w-40 items-center justify-center sm:h-44 sm:w-44"
        whileHover={{ scale: 1.05 }}
        transition={{ type: "spring", stiffness: 300, damping: 22 }}
      >
        <svg aria-hidden viewBox="0 0 160 160" className="absolute inset-0 h-full w-full">
          <motion.g
            animate={{ rotate: 360 }}
            transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
            style={{ originX: 0.5, originY: 0.5 }}
          >
            {petals.map((p, i) => (
              <ellipse
                key={i}
                cx="80"
                cy="42"
                rx="18"
                ry="32"
                fill={p.color}
                transform={`rotate(${p.rotate} 80 80)`}
              />
            ))}
          </motion.g>
          <motion.g
            animate={{ rotate: -360 }}
            transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
            style={{ originX: 0.5, originY: 0.5 }}
          >
            <circle
              cx="80"
              cy="80"
              r="62"
              fill="none"
              stroke={colors.plum}
              strokeWidth="1.25"
              strokeDasharray="4 8"
              strokeOpacity="0.3"
            />
          </motion.g>
        </svg>

        <motion.span
          className="relative z-10 rounded-2xl bg-white/65 px-3 py-2 shadow-[0_10px_24px_-12px_rgba(44,44,44,0.22)] backdrop-blur-[1.5px]"
          animate={{ y: [0, -3, 0] }}
          transition={{ duration: 4.6, repeat: Infinity, ease: "easeInOut" }}
        >
          <StackLockup />
        </motion.span>
      </motion.span>
    </CtaShell>
  );
}

/* ─── 05 · Soft Disk Stack ──────────────────────────────────── */

export function LabsCtaDiskStack({ href }: { href?: string }) {
  const disks = [
    { size: "7.5rem", color: `${colors.plum}28`, x: -18, y: -10, dur: 7 },
    { size: "6.5rem", color: `${colors.pink}36`, x: 16, y: 8, dur: 6.2 },
    { size: "5.75rem", color: `${colors.chartreuse}42`, x: -8, y: 18, dur: 5.5 },
    { size: "4.5rem", color: `${colors.green}30`, x: 12, y: -14, dur: 8 },
  ];

  return (
    <CtaShell href={href}>
      <motion.span
        className="relative flex h-40 w-40 items-center justify-center sm:h-44 sm:w-44"
        whileHover={{ scale: 1.05 }}
        transition={{ type: "spring", stiffness: 300, damping: 22 }}
      >
        {disks.map((d, i) => (
          <motion.span
            key={i}
            aria-hidden
            className="absolute rounded-full"
            style={{
              width: d.size,
              height: d.size,
              background: d.color,
            }}
            animate={{
              x: [d.x, -d.x * 0.6, d.x],
              y: [d.y, -d.y * 0.7, d.y],
              scale: [1, 1.06, 1],
            }}
            transition={{
              duration: d.dur,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.2,
            }}
          />
        ))}
        <motion.span
          className="relative z-10"
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut" }}
        >
          <StackLockup />
        </motion.span>
      </motion.span>
    </CtaShell>
  );
}

/* ─── 06 · Doodle Constellation ─────────────────────────────── */

export function LabsCtaConstellation({
  href,
  className,
  size = "default",
}: {
  href?: string;
  className?: string;
  size?: "default" | "compact";
}) {
  // Shapes in local coords around (0,0). Rotation wraps a centered group so
  // framer's bbox origin stays at the true circle center (asymmetric kids
  // used to yank the spin pivot off-axis).
  const outerShapes = [
    { angle: -90, kind: "pink" as const },
    { angle: 0, kind: "triangle" as const },
    { angle: 90, kind: "cross" as const },
    { angle: 180, kind: "green" as const },
  ];
  const innerShapes = [
    { angle: -45, kind: "chartreuse" as const },
    { angle: 135, kind: "plum-dot" as const },
  ];

  const box = size === "compact" ? "size-40 sm:size-44" : "size-44 sm:size-52";
  const rOuter = 78;
  const rInner = 58;

  return (
    <CtaShell href={href} className={className}>
      <motion.span
        className={cn("relative grid place-items-center", box)}
        whileHover={{ scale: 1.04 }}
        transition={{ type: "spring", stiffness: 300, damping: 22 }}
      >
        <svg
          aria-hidden
          viewBox="0 0 200 200"
          className="pointer-events-none absolute inset-0 size-full overflow-visible"
        >
          <circle
            cx="100"
            cy="100"
            r={rOuter}
            fill="none"
            stroke={colors.ink}
            strokeWidth="1.35"
            strokeOpacity="0.16"
            strokeDasharray="5 8"
          />
          <circle
            cx="100"
            cy="100"
            r={rInner}
            fill="none"
            stroke={colors.ink}
            strokeWidth="1"
            strokeOpacity="0.1"
            strokeDasharray="3 7"
          />

          {/* outer orbit — pivot locked to 100,100 via SMIL (bbox-safe) */}
          <g transform="translate(100 100)">
            <g>
              <animateTransform
                attributeName="transform"
                type="rotate"
                from="0 0 0"
                to="360 0 0"
                dur="24s"
                repeatCount="indefinite"
              />
              {outerShapes.map((s) => {
                const rad = (s.angle * Math.PI) / 180;
                const x = Math.cos(rad) * rOuter;
                const y = Math.sin(rad) * rOuter;
                if (s.kind === "pink") {
                  return <circle key={s.kind} cx={x} cy={y} r="7.5" fill={`${colors.pink}75`} />;
                }
                if (s.kind === "triangle") {
                  return (
                    <polygon
                      key={s.kind}
                      points={`${x},${y - 8} ${x + 8},${y + 6.5} ${x - 8},${y + 6.5}`}
                      fill={`${colors.plum}55`}
                    />
                  );
                }
                if (s.kind === "cross") {
                  return (
                    <g key={s.kind} transform={`translate(${x} ${y})`}>
                      <rect x="-1.75" y="-7.5" width="3.5" height="15" rx="1.25" fill={colors.green} fillOpacity="0.65" />
                      <rect x="-7.5" y="-1.75" width="15" height="3.5" rx="1.25" fill={colors.green} fillOpacity="0.65" />
                    </g>
                  );
                }
                return <circle key={s.kind} cx={x} cy={y} r="6" fill={`${colors.green}65`} />;
              })}
            </g>
          </g>

          {/* inner orbit — counter-spin */}
          <g transform="translate(100 100)">
            <g>
              <animateTransform
                attributeName="transform"
                type="rotate"
                from="0 0 0"
                to="-360 0 0"
                dur="17s"
                repeatCount="indefinite"
              />
              {innerShapes.map((s) => {
                const rad = (s.angle * Math.PI) / 180;
                const x = Math.cos(rad) * rInner;
                const y = Math.sin(rad) * rInner;
                if (s.kind === "chartreuse") {
                  return (
                    <rect
                      key={s.kind}
                      x={x - 6}
                      y={y - 6}
                      width="12"
                      height="12"
                      rx="3.5"
                      fill={`${colors.chartreuse}70`}
                    />
                  );
                }
                return <circle key={s.kind} cx={x} cy={y} r="4.5" fill={`${colors.plum}50`} />;
              })}
            </g>
          </g>
        </svg>

        {/* Fixed square card — grid-centered so lockup sits in true middle */}
        <span className="relative z-10 grid size-[5.75rem] place-items-center rounded-2xl bg-white shadow-[0_14px_32px_-16px_rgba(44,44,44,0.32)] ring-1 ring-ink/8 sm:size-[6.5rem]">
          <StackLockup
            className="-mt-0.5"
            sviglClassName="text-[1.95rem] leading-none sm:text-[2.25rem]"
            labsClassName="mt-0.5 text-[0.95rem] leading-none sm:text-[1.1rem]"
          />
        </span>
      </motion.span>
    </CtaShell>
  );
}

/* ─── 07 · Infinity Ribbon ──────────────────────────────────── */

export function LabsCtaInfinityRibbon({ href }: { href?: string }) {
  const uid = useId().replace(/:/g, "");
  const pathId = `inf-path-${uid}`;

  return (
    <CtaShell href={href}>
      <motion.span
        className="relative flex h-40 w-44 items-center justify-center sm:h-44 sm:w-48"
        whileHover={{ scale: 1.04 }}
        transition={{ type: "spring", stiffness: 300, damping: 22 }}
      >
        <motion.span
          aria-hidden
          className="absolute inset-[18%] rounded-[2rem]"
          style={{
            background: `radial-gradient(circle at 40% 40%, ${colors.pink}28, ${colors.chartreuse}18 60%, transparent)`,
          }}
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        />

        <svg aria-hidden viewBox="0 0 200 140" className="absolute inset-0 h-full w-full">
          <defs>
            <path
              id={pathId}
              d="M40 70 C40 35, 80 35, 100 70 C120 105, 160 105, 160 70 C160 35, 120 35, 100 70 C80 105, 40 105, 40 70 Z"
            />
          </defs>
          <use
            href={`#${pathId}`}
            fill="none"
            stroke={colors.plum}
            strokeWidth="2.25"
            strokeOpacity="0.45"
            strokeLinecap="round"
          />
          <use
            href={`#${pathId}`}
            fill="none"
            stroke={colors.chartreuse}
            strokeWidth="1.5"
            strokeOpacity="0.5"
            strokeDasharray="6 10"
            strokeLinecap="round"
          >
            <animate
              attributeName="stroke-dashoffset"
              from="0"
              to="-64"
              dur="4s"
              repeatCount="indefinite"
            />
          </use>
          {/* traveling beads */}
          {[0, 0.33, 0.66].map((begin, i) => (
            <circle key={i} r={i === 0 ? 4.5 : 3.2} fill={[colors.pink, colors.green, colors.plum][i]}>
              <animateMotion
                dur="5.5s"
                begin={`${begin * 5.5}s`}
                repeatCount="indefinite"
                rotate="auto"
              >
                <mpath href={`#${pathId}`} />
              </animateMotion>
            </circle>
          ))}
        </svg>

        <motion.span
          className="relative z-10"
          animate={{ y: [0, -3, 0] }}
          transition={{ duration: 4.4, repeat: Infinity, ease: "easeInOut" }}
        >
          <StackLockup
            sviglClassName="text-[2.1rem] sm:text-[2.35rem]"
            labsClassName="mt-0 text-[1.05rem] sm:text-[1.15rem]"
          />
        </motion.span>
      </motion.span>
    </CtaShell>
  );
}

/* ─── 08 · Morph Blob Duo ───────────────────────────────────── */

export function LabsCtaMorphBlobs({ href }: { href?: string }) {
  return (
    <CtaShell href={href}>
      <motion.span
        className="relative flex h-40 w-42 items-center justify-center sm:h-44 sm:w-46"
        whileHover={{ scale: 1.04 }}
        transition={{ type: "spring", stiffness: 300, damping: 22 }}
      >
        <motion.span
          aria-hidden
          className="absolute left-[4%] top-[12%] h-28 w-28"
          style={{ background: `${colors.pink}40` }}
          animate={{
            borderRadius: [
              "60% 40% 55% 45% / 50% 55% 45% 50%",
              "40% 60% 45% 55% / 55% 40% 60% 45%",
              "60% 40% 55% 45% / 50% 55% 45% 50%",
            ],
            x: [0, 10, 0],
            y: [0, 8, 0],
          }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.span
          aria-hidden
          className="absolute bottom-[6%] right-[2%] h-32 w-32"
          style={{ background: `${colors.chartreuse}45` }}
          animate={{
            borderRadius: [
              "45% 55% 50% 50% / 40% 50% 50% 60%",
              "55% 45% 40% 60% / 50% 45% 55% 45%",
              "45% 55% 50% 50% / 40% 50% 50% 60%",
            ],
            x: [0, -12, 0],
            y: [0, -6, 0],
          }}
          transition={{ duration: 8.2, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
        />
        <motion.span
          aria-hidden
          className="absolute right-[18%] top-[8%] h-16 w-16"
          style={{ background: `${colors.plum}35` }}
          animate={{
            borderRadius: [
              "50% 50% 40% 60%",
              "40% 60% 55% 45%",
              "50% 50% 40% 60%",
            ],
            scale: [1, 1.15, 1],
          }}
          transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
        />
        <motion.span
          className="relative z-10 rounded-2xl bg-white/55 px-3 py-2 shadow-[0_10px_24px_-12px_rgba(44,44,44,0.2)] backdrop-blur-[1.5px]"
          animate={{ y: [0, -3, 0] }}
          transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut" }}
        >
          <StackLockup />
        </motion.span>
      </motion.span>
    </CtaShell>
  );
}

/* ─── 09 · Fan Cards ────────────────────────────────────────── */

export function LabsCtaFanCards({ href }: { href?: string }) {
  const cards = [
    { rot: -18, color: `${colors.pink}50`, delay: 0 },
    { rot: 0, color: `${colors.chartreuse}55`, delay: 0.1 },
    { rot: 18, color: `${colors.plum}45`, delay: 0.2 },
  ];

  return (
    <CtaShell href={href}>
      <motion.span
        className="relative flex h-40 w-40 items-center justify-center sm:h-44 sm:w-44"
        whileHover={{ scale: 1.05 }}
        transition={{ type: "spring", stiffness: 300, damping: 22 }}
      >
        <motion.span
          className="absolute inset-0 flex items-center justify-center"
          animate={{ rotate: [-2, 2, -2] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        >
          {cards.map((c, i) => (
            <motion.span
              key={i}
              aria-hidden
              className="absolute h-28 w-20 rounded-2xl border border-white/50 shadow-[0_8px_20px_-12px_rgba(44,44,44,0.25)]"
              style={{
                background: c.color,
                transform: `rotate(${c.rot}deg) translateY(4px)`,
                zIndex: i,
              }}
              animate={{
                rotate: [c.rot, c.rot + (i - 1) * 4, c.rot],
                y: [4, i === 1 ? -2 : 6, 4],
              }}
              transition={{
                duration: 5.2,
                repeat: Infinity,
                ease: "easeInOut",
                delay: c.delay,
              }}
            />
          ))}
        </motion.span>

        <svg aria-hidden viewBox="0 0 160 160" className="pointer-events-none absolute inset-0 h-full w-full">
          <motion.g
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            style={{ originX: 0.5, originY: 0.5 }}
          >
            <circle
              cx="80"
              cy="80"
              r="72"
              fill="none"
              stroke={colors.green}
              strokeWidth="1.25"
              strokeDasharray="5 9"
              strokeOpacity="0.35"
            />
            <circle cx="80" cy="8" r="3" fill={colors.pink} />
          </motion.g>
        </svg>

        <motion.span
          className="relative z-10 rounded-2xl bg-white/70 px-3 py-2 shadow-[0_10px_24px_-12px_rgba(44,44,44,0.22)] backdrop-blur-[1.5px]"
          animate={{ y: [0, -3, 0] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <StackLockup />
        </motion.span>
      </motion.span>
    </CtaShell>
  );
}

export const LABS_CTA_ITERATIONS = [
  {
    id: "overlap-shapes",
    title: "01 · Overlap Shapes",
    subtitle: "Kept — pink circle, chartreuse square, plum triangle drift behind the stack.",
    component: LabsCtaOverlapShapes,
  },
  {
    id: "dual-orbit",
    title: "02 · Dual Orbit",
    subtitle: "Kept — morphing squircle + counter-spinning plum/green orbits.",
    component: LabsCtaDualOrbit,
  },
  {
    id: "swirl-tube",
    title: "03 · Swirl Tube",
    subtitle: "Clean test tube with translucent swirling liquid, cork, and glass highlight.",
    component: LabsCtaSwirlTube,
  },
  {
    id: "petal-bloom",
    title: "04 · Petal Bloom",
    subtitle: "Six soft pastel petals slowly rotating around the lockup.",
    component: LabsCtaPetalBloom,
  },
  {
    id: "disk-stack",
    title: "05 · Disk Stack",
    subtitle: "Offset translucent disks sliding past each other like a living Venn.",
    component: LabsCtaDiskStack,
  },
  {
    id: "constellation",
    title: "06 · Constellation",
    subtitle: "Concentric circular orbits with evenly spaced brand doodles — lockup dead-center.",
    component: LabsCtaConstellation,
  },
  {
    id: "infinity-ribbon",
    title: "07 · Infinity Ribbon",
    subtitle: "Lemniscate path with dashed chase + traveling beads — Labs geometry nod.",
    component: LabsCtaInfinityRibbon,
  },
  {
    id: "morph-blobs",
    title: "08 · Morph Blobs",
    subtitle: "Organic morphing blobs overlapping — softer cousin of Overlap Shapes.",
    component: LabsCtaMorphBlobs,
  },
  {
    id: "fan-cards",
    title: "09 · Fan Cards",
    subtitle: "Three pastel cards fanning open with a dashed orbit ring.",
    component: LabsCtaFanCards,
  },
] as const;
