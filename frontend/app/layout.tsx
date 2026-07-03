import type { Metadata } from "next";
import { Caveat, DM_Sans, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppHeader } from "@/components/layout/AppHeader";
import { AuroraBackground } from "@/components/layout/AuroraBackground";
import { AuthProvider } from "@/components/auth/AuthProvider";

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

export const metadata: Metadata = {
  title: "Svigl — SVG drawing gallery",
  description: "SVG drawing gallery built from editable vector primitives.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${caveat.variable} ${geistMono.variable} h-full antialiased`}
      style={{ backgroundColor: "#FAFAF8" }}
    >
      <body
        className="relative flex min-h-full flex-col text-ink"
        style={{ backgroundColor: "#FAFAF8", color: "#2C2C2C" }}
      >
        <AuroraBackground />
        <AuthProvider>
          <AppHeader />
          <main className="relative z-0 flex flex-1 flex-col">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
