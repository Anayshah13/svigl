"use client";

import { LandingPage } from "@/features/landing/LandingPage";

/**
 * Homepage entry. The marketing landing is public so signed-out humans and
 * crawlers get the same HTML — no user-agent cloaking and no bounce to
 * `/sign-in`. Signed-in users stay here; this is also the app home
 * (create / join room). App-only routes stay gated elsewhere.
 */
export function HomeGate() {
  return <LandingPage />;
}
