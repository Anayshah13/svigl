import { readFile } from "fs/promises";
import { join } from "path";
import { ImageResponse } from "next/og";
import { AUTHOR_NAME, SITE_NAME } from "@/lib/seo";

export const alt = "Svigl — multiplayer SVG drawing game by Anay Shah";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const galindo = await readFile(join(process.cwd(), "public/Galindo-Regular.ttf"));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          backgroundColor: "#FAFAF8",
          backgroundImage:
            "radial-gradient(circle at 12% 20%, rgba(187, 227, 49, 0.22) 0%, transparent 42%), radial-gradient(circle at 88% 78%, rgba(112, 63, 147, 0.16) 0%, transparent 46%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <svg width="56" height="56" viewBox="0 0 32 32">
            <rect width="32" height="32" rx="8" fill="#1B1A2A" />
            <ellipse cx="16" cy="24.5" rx="7" ry="1.6" fill="#000" opacity="0.28" />
            <path d="M16 7.2 L23.4 11.5 L16 15.8 L8.6 11.5 Z" fill="#BBE331" />
            <path d="M8.6 11.5 L16 15.8 L16 24.4 L8.6 20.1 Z" fill="#10865C" />
            <path d="M16 15.8 L23.4 11.5 L23.4 20.1 L16 24.4 Z" fill="#703F93" />
          </svg>
          <span
            style={{
              fontSize: 28,
              color: "#703F93",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              fontWeight: 600,
            }}
          >
            {SITE_NAME}
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div
            style={{
              fontFamily: "Galindo",
              fontSize: 112,
              lineHeight: 0.95,
              color: "#703F93",
              letterSpacing: "-0.03em",
            }}
          >
            Svigl
          </div>
          <div
            style={{
              fontSize: 36,
              color: "#2C2C2C",
              maxWidth: 820,
              lineHeight: 1.25,
            }}
          >
            Multiplayer SVG drawing game
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 28,
            color: "#2C2C2C",
          }}
        >
          <span>
            Crafted by{" "}
            <span style={{ color: "#703F93", fontWeight: 700 }}>{AUTHOR_NAME}</span>
          </span>
          <span style={{ color: "#10865C" }}>svigl.com</span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "Galindo", data: galindo, style: "normal" }],
    },
  );
}
