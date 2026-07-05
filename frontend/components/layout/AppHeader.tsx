"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { AuthControls } from "@/components/auth/AuthControls";
import { SviglLogo } from "@/components/layout/SviglLogo";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/gallery", label: "Gallery" },
  { href: "/profile", label: "Profile" },
  { href: "/settings", label: "Settings" },
];

const MINIMAL_HEADER_PATHS = ["/sign-in", "/auth/callback"];

export function AppHeader() {
  const pathname = usePathname();

  if (MINIMAL_HEADER_PATHS.some((path) => pathname.startsWith(path))) {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 border-b border-white/60 bg-white/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <SviglLogo />

        <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 md:flex">
          {NAV.map(({ href, label }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "relative rounded-full px-4 py-2 text-sm font-medium transition-colors",
                  active ? "text-plum" : "text-ink-muted hover:text-ink",
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
          })}
        </nav>

        <div className="flex items-center gap-3">
          <AuthControls />
        </div>
      </div>
    </header>
  );
}
