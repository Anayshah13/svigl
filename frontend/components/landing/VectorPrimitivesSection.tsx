"use client";



import { motion } from "framer-motion";

import { useRef } from "react";

import { FadeIn, FadeInItem, FadeInStagger } from "@/components/motion/FadeIn";

import { gsap, prefersReducedMotion, useGSAP } from "@/lib/gsap";

import { colors } from "@/lib/colors";



const PILLARS = [

  {

    title: "Shapes, not scribbles",

    desc: "Draw with clean geometry — rects, circles, and paths that connect at anchors. What you build actually looks like what you pictured, even under a timer.",

    accent: colors.chartreuse,

    icon: "geometry" as const,

  },

  {

    title: "Real SVG output",

    desc: "Every mark is live SVG markup. Copy the drawing, drop it in a repo, or share it in the gallery — vectors you can zoom forever.",

    accent: colors.plum,

    icon: "svg" as const,

  },

  {

    title: "Precision built in",

    desc: "Dot grid, anchor snapping, undo history, and fill/stroke controls. Figma-ish tooling without the learning curve.",

    accent: colors.pink,

    icon: "snap" as const,

  },

];



function GeometryVisual() {

  return (

    <svg viewBox="0 0 200 100" className="h-full w-full max-w-[220px]" aria-hidden>

      <path

        className="pv-ground"

        d="M 24 82 H 176"

        fill="none"

        stroke={colors.plum}

        strokeWidth="2"

        strokeLinecap="round"

        strokeDasharray="6 5"

        strokeOpacity={0.55}

      />



      <g className="pv-vehicle">

        <rect x="68" y="48" width="64" height="18" rx="2" fill={colors.pink} />

        <circle cx="100" cy="32" r="13" fill={colors.green} />

        <circle cx="105" cy="30" r="2.5" fill={colors.whitePure} />

        <rect x="97" y="42" width="6" height="8" rx="1" fill={colors.green} />

        <g className="pv-wheel" style={{ transformOrigin: "82px 72px" }}>

          <circle cx="82" cy="72" r="9" fill={colors.plum} />

          <circle cx="82" cy="66" r="2.5" fill={colors.whitePure} fillOpacity={0.4} />

        </g>

        <g className="pv-wheel" style={{ transformOrigin: "118px 72px" }}>

          <circle cx="118" cy="72" r="9" fill={colors.plum} />

          <circle cx="118" cy="66" r="2.5" fill={colors.whitePure} fillOpacity={0.4} />

        </g>

      </g>



      {/* messy scribble fades on hover — contrast */}

      <path

        className="pv-scribble"

        d="M 28 68 Q 42 58, 58 72 T 88 64"

        fill="none"

        stroke={colors.ink}

        strokeWidth="2"

        strokeLinecap="round"

        strokeOpacity={0.1}

        strokeDasharray="3 4"

      />

    </svg>

  );

}



function SvgOutputVisual() {

  return (

    <svg viewBox="0 0 220 100" className="h-full w-full max-w-[220px]" aria-hidden>

      <rect x="8" y="14" width="92" height="72" rx="6" fill={colors.whitePure} stroke={colors.plum} strokeOpacity={0.22} strokeWidth="1.5" />

      <text className="pv-code-line" x="16" y="32" fontSize="8" fontFamily="monospace" fill={colors.plum}>

        {"<svg>"}

      </text>

      <text className="pv-code-line" x="22" y="46" fontSize="7" fontFamily="monospace" fill={colors.ink} opacity={0.5}>

        {"<circle … />"}

      </text>

      <text className="pv-code-line" x="22" y="58" fontSize="7" fontFamily="monospace" fill={colors.ink} opacity={0.5}>

        {"<rect … />"}

      </text>

      <text className="pv-code-line" x="16" y="76" fontSize="8" fontFamily="monospace" fill={colors.plum}>

        {"</svg>"}

      </text>



      <path

        className="pv-arrow"

        d="M 108 50 H 128 M 122 46 L 128 50 L 122 54"

        stroke={colors.plum}

        strokeWidth="2"

        strokeLinecap="round"

        strokeLinejoin="round"

        fill="none"

        style={{ transformOrigin: "118px 50px" }}

      />



      <rect className="pv-output-frame" x="138" y="16" width="74" height="68" rx="6" fill={colors.whitePure} stroke={colors.plum} strokeOpacity={0.15} strokeWidth="1.5" />

      <circle className="pv-render" cx="162" cy="40" r="12" fill={colors.green} style={{ transformOrigin: "162px 40px" }} />

      <rect className="pv-render" x="178" y="52" width="24" height="20" rx="4" fill={colors.pink} style={{ transformOrigin: "190px 62px" }} />

    </svg>

  );

}



function SnapVisual() {

  return (

    <svg viewBox="0 0 200 100" className="h-full w-full max-w-[220px]" aria-hidden>

      <line className="pv-guide pv-guide-v" x1="100" y1="18" x2="100" y2="86" stroke={colors.pink} strokeWidth="1.5" strokeOpacity={0.5} strokeDasharray="4 4" pathLength={1} />

      <line className="pv-guide pv-guide-h" x1="38" y1="56" x2="162" y2="56" stroke={colors.pink} strokeWidth="1.5" strokeOpacity={0.5} strokeDasharray="4 4" pathLength={1} />



      <rect className="pv-static-square" x="54" y="36" width="28" height="28" rx="3" fill={colors.green} fillOpacity={0.85} style={{ transformOrigin: "68px 50px" }} />



      <rect className="pv-snap-square" x="108" y="36" width="28" height="28" rx="3" fill={colors.plum} fillOpacity={0.9} style={{ transformOrigin: "122px 50px" }} />



      <circle className="pv-snap-ring" cx="122" cy="50" r="18" fill="none" stroke={colors.pink} strokeWidth="1.5" strokeOpacity={0} style={{ transformOrigin: "122px 50px" }} />



      <path

        className="pv-cursor"

        d="M 132 62 L 132 76 L 136 72 L 139 78 L 142 76 L 138 68 L 144 68 Z"

        fill={colors.pink}

        style={{ transformOrigin: "138px 70px" }}

      />

    </svg>

  );

}



function PillarVisual({ type }: { type: (typeof PILLARS)[number]["icon"] }) {

  if (type === "geometry") return <GeometryVisual />;

  if (type === "svg") return <SvgOutputVisual />;

  return <SnapVisual />;

}



export function VectorPrimitivesSection() {

  const sectionRef = useRef<HTMLElement>(null);



  useGSAP(

    () => {

      const reduced = prefersReducedMotion();

      const cleanups: Array<() => void> = [];



      const svgCard = sectionRef.current?.querySelector("[data-pillar='svg']");

      if (svgCard) {

        const tl = gsap.timeline({

          scrollTrigger: { trigger: svgCard, start: "top 82%", once: true },

        });

        tl.from(svgCard.querySelectorAll(".pv-code-line"), {

          opacity: 0,

          x: -8,

          duration: reduced ? 0 : 0.45,

          ease: "power2.out",

          stagger: 0.12,

        })

          .from(svgCard.querySelector(".pv-arrow"), {

            opacity: 0,

            x: -14,

            duration: reduced ? 0 : 0.4,

            ease: "power3.out",

          })

          .from(svgCard.querySelector(".pv-output-frame"), {

            opacity: 0,

            scale: 0.92,

            duration: reduced ? 0 : 0.35,

            ease: "power2.out",

          })

          .from(svgCard.querySelectorAll(".pv-render"), {

            scale: 0,

            duration: reduced ? 0 : 0.55,

            ease: "back.out(2.2)",

            stagger: 0.1,

          }, "-=0.1");

      }



      const snapCard = sectionRef.current?.querySelector("[data-pillar='snap']");

      if (snapCard) {

        const tl = gsap.timeline({

          scrollTrigger: { trigger: snapCard, start: "top 82%", once: true },

        });

        tl.fromTo(

          snapCard.querySelectorAll(".pv-guide"),

          { strokeDashoffset: 1, strokeDasharray: "1 1" },

          {

            strokeDashoffset: 0,

            duration: reduced ? 0 : 0.9,

            ease: "power2.inOut",

            stagger: 0.18,

            onComplete: () => {

              gsap.set(snapCard.querySelectorAll(".pv-guide"), {

                strokeDasharray: "4 4",

                clearProps: "strokeDashoffset",

              });

            },

          },

        ).from(

          snapCard.querySelector(".pv-cursor"),

          { opacity: 0, x: 12, y: 12, duration: reduced ? 0 : 0.45, ease: "power3.out" },

          "-=0.35",

        );

      }



      if (reduced) return;



      const geoCard = sectionRef.current?.querySelector("[data-pillar='geometry']");

      if (geoCard) {

        const vehicle = geoCard.querySelector(".pv-vehicle");

        const wheels = geoCard.querySelectorAll(".pv-wheel");

        const scribble = geoCard.querySelector(".pv-scribble");

        const onEnter = () => {

          gsap

            .timeline({ overwrite: "auto" })

            .to(scribble, { opacity: 0, duration: 0.25, ease: "power2.out" }, 0)

            .to(vehicle, { x: 38, duration: 1, ease: "power2.inOut" }, 0)

            .to(vehicle, { x: 0, duration: 1.2, ease: "power2.inOut" }, ">+=0.1")

            .to(scribble, { opacity: 0.1, duration: 0.3, ease: "power2.in" }, ">");

          gsap.to(wheels, { rotation: "+=720", duration: 2.3, ease: "none" });

        };

        geoCard.addEventListener("mouseenter", onEnter);

        cleanups.push(() => geoCard.removeEventListener("mouseenter", onEnter));

      }



      if (svgCard) {

        const arrow = svgCard.querySelector(".pv-arrow");

        const renders = svgCard.querySelectorAll(".pv-render");

        const onEnter = () => {

          gsap

            .timeline({ overwrite: "auto" })

            .to(arrow, { scale: 1.35, x: 6, duration: 0.2, ease: "power2.out" })

            .to(arrow, { scale: 1, x: 0, duration: 0.55, ease: "elastic.out(1, 0.45)" })

            .to(renders, { scale: 1.08, duration: 0.22, ease: "power2.out", stagger: 0.06, yoyo: true, repeat: 1 }, 0.15);

        };

        svgCard.addEventListener("mouseenter", onEnter);

        cleanups.push(() => svgCard.removeEventListener("mouseenter", onEnter));

      }



      if (snapCard) {

        const square = snapCard.querySelector(".pv-snap-square");

        const ring = snapCard.querySelector(".pv-snap-ring");

        const cursor = snapCard.querySelector(".pv-cursor");

        const staticSq = snapCard.querySelector(".pv-static-square");

        const onEnter = () => {

          gsap

            .timeline({ overwrite: "auto" })

            .to(square, { x: -6, y: 2, duration: 0.22, ease: "power2.inOut" })

            .to(ring, { strokeOpacity: 0.7, scale: 1.15, duration: 0.18, ease: "power2.out" }, "-=0.1")

            .to(square, { x: 0, y: 0, scale: 1.06, duration: 0.35, ease: "elastic.out(1.3, 0.5)" })

            .to(ring, { strokeOpacity: 0, scale: 1, duration: 0.4, ease: "power2.in" }, "-=0.25")

            .to(square, { scale: 1, duration: 0.3, ease: "power2.out" });

          gsap.to(cursor, { x: -6, y: -4, duration: 0.25, ease: "power2.out", yoyo: true, repeat: 1 });

          gsap.to(staticSq, { scale: 0.96, duration: 0.15, ease: "power2.in", yoyo: true, repeat: 1 });

        };

        snapCard.addEventListener("mouseenter", onEnter);

        cleanups.push(() => snapCard.removeEventListener("mouseenter", onEnter));

      }



      return () => cleanups.forEach((fn) => fn());

    },

    { scope: sectionRef },

  );



  return (

    <section ref={sectionRef} className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:py-20">

      <FadeIn>

        <div className="mx-auto max-w-2xl text-center">

          <p className="text-xs font-bold uppercase tracking-widest text-plum">UNDER THE HOOD</p>

          <h2 className="mt-2 text-[clamp(1.75rem,5.5vw,2.5rem)] font-bold tracking-tight text-ink sm:mt-3 lg:text-5xl">

            Why vector primitives?

          </h2>

          <p className="mt-3 text-sm leading-relaxed text-ink-muted sm:mt-4 sm:text-base">

            Brush tools blur under pressure. Svigl keeps it structural{" "}

            <span className="script-accent text-xl italic">— CAD vibes, party-game speed.</span>

          </p>

        </div>

      </FadeIn>



      <FadeInStagger className="mt-8 grid gap-4 sm:mt-12 sm:gap-5 md:grid-cols-3">

        {PILLARS.map((pillar) => (

          <FadeInItem key={pillar.title}>

            <motion.article

              whileHover={{ y: -6, boxShadow: `0 24px 48px -14px ${pillar.accent}45` }}

              transition={{ type: "spring", stiffness: 400, damping: 26 }}

              className="pillar-card glass-panel group flex h-full flex-col overflow-hidden rounded-2xl"

              data-pillar={pillar.icon}

            >

              <div className="p-5 sm:p-6 lg:p-7">

                <h3 className="text-base font-bold text-ink sm:text-lg">{pillar.title}</h3>

                <p className="mt-2 text-sm leading-relaxed text-ink-muted">{pillar.desc}</p>

              </div>



              <div

                className="dot-grid flex h-36 w-full items-center justify-center px-4 py-3 transition-colors duration-300 group-hover:bg-white/95 sm:h-44 sm:py-4"

                style={{ borderTop: `2px solid ${pillar.accent}` }}

              >

                <PillarVisual type={pillar.icon} />

              </div>

            </motion.article>

          </FadeInItem>

        ))}

      </FadeInStagger>

    </section>

  );

}

