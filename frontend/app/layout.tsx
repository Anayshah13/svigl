import type { Metadata } from "next";
import { GoogleAnalytics } from "@next/third-parties/google";
import { Caveat, DM_Sans, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { AppHeader } from "@/components/layout/AppHeader";
import { AuroraBackground } from "@/components/layout/AuroraBackground";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { ActiveRoomBar } from "@/components/room/ActiveRoomBar";
import { RoomPresenceKeeper } from "@/components/room/RoomPresenceKeeper";

/** GA4 Measurement ID — never hardcode; omit component when unset (local/dev). */
const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const galindo = localFont({
  src: "../public/Galindo-Regular.ttf",
  variable: "--font-galindo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Svigl - Challenge your Friends",
  description: "SVG drawing gallery built from editable vector primitives.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${dmSans.variable} ${caveat.variable} ${geistMono.variable} ${galindo.variable} h-full antialiased`}
      style={{ backgroundColor: "#FAFAF8" }}
    >
      <body
        className="relative flex min-h-full flex-col text-ink"
        style={{
          backgroundColor: "#FAFAF8",
          color: "#2C2C2C",
          paddingTop: "env(safe-area-inset-top, 0px)",
          paddingLeft: "env(safe-area-inset-left, 0px)",
          paddingRight: "env(safe-area-inset-right, 0px)",
        }}
      >
        <AuroraBackground />
        <AuthProvider>
          <AppHeader />
          <main className="relative z-0 flex flex-1 flex-col">{children}</main>
          <RoomPresenceKeeper />
          <ActiveRoomBar />
        </AuthProvider>
      </body>
      {/*
        Loads gtag after hydration. SPA page_view is handled by GA4 Enhanced
        Measurement (browser history) — do not add a manual pageview listener.
      */}
      {gaMeasurementId ? <GoogleAnalytics gaId={gaMeasurementId} /> : null}
    </html>
  );
}
