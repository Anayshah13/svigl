"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState, useSyncExternalStore } from "react";
import { AuthControls } from "@/components/auth/AuthControls";
import { SviglLogo } from "@/components/layout/SviglLogo";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/gallery", label: "Gallery" },
  { href: "/profile", label: "Profile" },
  { href: "/settings", label: "Settings" },
  { href: "/feedback", label: "Feedback" },
];

const MINIMAL_HEADER_PATHS = ["/sign-in", "/auth/callback"];

function subscribeMdUp(onChange: () => void) {
  const mq = window.matchMedia("(min-width: 768px)");
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function getMdUp() {
  return window.matchMedia("(min-width: 768px)").matches;
}

function useMdUp() {
  return useSyncExternalStore(subscribeMdUp, getMdUp, () => true);
}
function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      {open ? (
        <>
          <path d="M6 6l12 12" />
          <path d="M18 6L6 18" />
        </>
      ) : (
        <>
          <path d="M4 7h16" />
          <path d="M4 12h16" />
          <path d="M4 17h16" />
        </>
      )}
    </svg>
  );
}

function NavLink({
  href,
  label,
  active,
  onNavigate,
  className,
}: {
  href: string;
  label: string;
  active: boolean;
  onNavigate?: () => void;
  className?: string;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "relative rounded-full px-4 py-2 text-sm font-medium transition-colors",
        active ? "text-plum" : "text-ink-muted hover:text-ink",
        className,
      )}
    >
      {active && (
        <motion.span
          layoutId="nav-pill"
          className="absolute inset-0 rounded-full bg-plum-light"
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        />
      )}
      <span className="relative z-10">{label}</span>
    </Link>
  );
}

export function AppHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPathname, setMenuPathname] = useState(pathname);
  const mdUp = useMdUp();

  // Close mobile menu when the route changes (adjust state during render — avoids setState-in-effect)
  if (pathname !== menuPathname) {
    setMenuPathname(pathname);
    if (menuOpen) setMenuOpen(false);
  }

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  if (MINIMAL_HEADER_PATHS.some((path) => pathname.startsWith(path))) {
    return null;
  }

  const isLandingHome = pathname === "/";
  const authOnLeft = isLandingHome && !mdUp;
  // In-room pages own the full viewport on mobile (game UI has its own chrome).
  const inRoom = pathname.startsWith("/room/");

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b border-white/60 bg-white/70 backdrop-blur-xl",
        inRoom && "hidden md:block",
      )}
    >
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-3 px-4 sm:h-16 sm:px-6">
        <SviglLogo
          className={cn("min-w-0 shrink-0", isLandingHome && "max-md:hidden!")}
        />

        {authOnLeft ? (
          <div className="flex shrink-0 items-center">
            <AuthControls />
          </div>
        ) : null}

        <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 md:flex">
          {NAV.map(({ href, label }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return <NavLink key={href} href={href} label={label} active={active} />;
          })}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
          {!authOnLeft ? <AuthControls /> : null}
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-plum/20 bg-white/80 text-ink transition-colors hover:border-plum/40 hover:bg-white md:hidden"
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <MenuIcon open={menuOpen} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {menuOpen ? (
          <>
            <motion.button
              key="mobile-nav-backdrop"
              type="button"
              aria-label="Close menu"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 z-40 bg-transparent md:hidden"
              onClick={() => setMenuOpen(false)}
            />
            <motion.div
              key="mobile-nav-panel"
              id="mobile-nav"
              role="dialog"
              aria-modal="true"
              initial={{ opacity: 0, scale: 0.94, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -4 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="absolute right-3 top-[calc(100%+0.35rem)] z-50 origin-top-right md:hidden sm:right-4"
            >
              <div
                className="overflow-hidden rounded-2xl border border-plum/10 shadow-[0_16px_40px_-18px_rgba(112,63,147,0.4)]"
                style={{
                  background: "rgba(255,255,255,0.97)",
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                }}
              >
                <nav className="flex flex-col gap-0.5 p-1.5">
                  {NAV.map(({ href, label }, i) => {
                    const active = pathname === href || pathname.startsWith(`${href}/`);
                    return (
                      <motion.div
                        key={href}
                        initial={{ opacity: 0, x: 6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{
                          delay: 0.03 + i * 0.035,
                          duration: 0.22,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                      >
                        <NavLink
                          href={href}
                          label={label}
                          active={active}
                          onNavigate={() => setMenuOpen(false)}
                          className="w-full rounded-xl px-3 py-2.5 text-sm"
                        />
                      </motion.div>
                    );
                  })}
                </nav>
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
