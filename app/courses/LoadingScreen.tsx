"use client";

import { useRef, useEffect, useState } from "react";
import gsap from "gsap";

// ─── Background line config ────────────────────────────────────────────────
const LINE_COUNT = 14;
interface BgLine { x: number; speed: number; opacity: number; width: number }
function makeBgLines(w: number): BgLine[] {
  return Array.from({ length: LINE_COUNT }, (_, i) => ({
    x: (w / LINE_COUNT) * i,
    speed: 0.18 + (i % 3) * 0.09,
    opacity: 0.06 + (i % 4) * 0.04,
    width: 1 + (i % 3) * 0.6,
  }));
}

interface Props {
  steps: string[];
  title: string;
}

const C = 150; // SVG canvas centre

// Eight orbital bodies — varied radius, period, size, starting angle, opacity
const ORBITS = [
  { r: 48,  period: 8,   size: 5,   phaseDeg: 0,   opacity: 1,    dir:  1 },
  { r: 68,  period: 13,  size: 3.5, phaseDeg: 130, opacity: 0.65, dir: -1 },
  { r: 85,  period: 18,  size: 4.5, phaseDeg: 260, opacity: 0.8,  dir:  1 },
  { r: 58,  period: 10,  size: 3,   phaseDeg: 30,  opacity: 0.5,  dir: -1 },
  { r: 75,  period: 7,   size: 4,   phaseDeg: 200, opacity: 0.75, dir:  1 },
  { r: 92,  period: 22,  size: 3,   phaseDeg: 324, opacity: 0.4,  dir: -1 },
  { r: 42,  period: 6,   size: 5.5, phaseDeg: 165, opacity: 0.9,  dir:  1 },
  { r: 80,  period: 15,  size: 3.5, phaseDeg: 95,  opacity: 0.55, dir: -1 },
];

export default function LoadingScreen({ steps, title }: Props) {
  const groupRefs   = useRef<(SVGGElement      | null)[]>([]);
  const dotRefs     = useRef<(SVGCircleElement  | null)[]>([]);
  const coreRef     = useRef<SVGCircleElement   | null>(null);
  const rippleRefs  = useRef<(SVGCircleElement  | null)[]>([]);
  const textRef     = useRef<HTMLParagraphElement | null>(null);
  const canvasRef   = useRef<HTMLCanvasElement  | null>(null);

  const [displayed, setDisplayed] = useState(steps[0]);
  const stepIndexRef = useRef(0);

  // ─── Background drifting lines ────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let lines: BgLine[] = [];

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width  = rect.width  || window.innerWidth;
      canvas.height = rect.height || window.innerHeight;
      lines = makeBgLines(canvas.width);
    };
    resize();
    window.addEventListener("resize", resize);

    // Diagonal angle offset per line (px shift up from bottom)
    const SLANT = 0.4; // rise/run — gentle diagonal

    const tick = () => {
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const h = canvas.height;
      const w = canvas.width;
      lines.forEach((line) => {
        line.x = (line.x + line.speed) % (w + 120);
        const x0 = line.x - h * SLANT;
        const x1 = line.x;
        ctx.beginPath();
        ctx.moveTo(x0, 0);
        ctx.lineTo(x1, h);
        ctx.strokeStyle = `rgba(255,255,255,${line.opacity})`;
        ctx.lineWidth = line.width;
        ctx.stroke();
      });
    };

    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
      window.removeEventListener("resize", resize);
    };
  }, []);

  // ─── Main orbital + ripple animation (mount only) ─────────────────────────
  useEffect(() => {
    const ctx = gsap.context(() => {

      // Core breathes
      gsap.to(coreRef.current, {
        attr: { r: 23 },
        duration: 2.6,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
      });

      // Three staggered ripple rings emanate outward
      rippleRefs.current.forEach((ring, i) => {
        gsap.fromTo(
          ring,
          { attr: { r: 20 }, opacity: 0.5 },
          {
            attr: { r: 110 },
            opacity: 0,
            duration: 3.2,
            ease: "power1.out",
            repeat: -1,
            delay: i * 1.07,
          }
        );
      });

      // Orbital bodies
      ORBITS.forEach((orbit, i) => {
        const group = groupRefs.current[i];
        const dot   = dotRefs.current[i];
        if (!group || !dot) return;

        // Lock transform-origin to SVG centre, set starting angle
        gsap.set(group, { svgOrigin: `${C} ${C}`, rotation: orbit.phaseDeg });

        // Continuous rotation (alternating direction for visual depth)
        gsap.to(group, {
          rotation: orbit.phaseDeg + orbit.dir * 360,
          svgOrigin: `${C} ${C}`,
          duration: orbit.period,
          ease: "none",
          repeat: -1,
        });

        // Each dot pulses independently (scale via r attribute)
        gsap.to(dot, {
          attr: { r: orbit.size * 1.7 },
          opacity: orbit.opacity * 0.25,
          duration: 1.1 + i * 0.22,
          ease: "sine.inOut",
          repeat: -1,
          yoyo: true,
          delay: i * 0.17,
        });
      });
    });

    return () => ctx.revert();
  }, []);

  // ─── Infinite text cycling ────────────────────────────────────────────────
  useEffect(() => {
    const el = textRef.current;
    if (!el) return;

    function advanceStep() {
      if (!el) return;
      gsap.to(el, {
        opacity: 0,
        y: -10,
        duration: 0.28,
        ease: "power2.in",
        onComplete: () => {
          stepIndexRef.current = (stepIndexRef.current + 1) % steps.length;
          setDisplayed(steps[stepIndexRef.current]);
          gsap.fromTo(
            el,
            { opacity: 0, y: 12 },
            { opacity: 1, y: 0, duration: 0.45, ease: "power2.out" }
          );
        },
      });
    }

    const id = setInterval(advanceStep, 3000);
    return () => clearInterval(id);
  }, [steps]);

  return (
    <div className="relative flex-1 flex flex-col items-center justify-center px-6 py-16 select-none overflow-hidden">

      {/* ── Background lines canvas ──────────────────────────────────────── */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        aria-hidden="true"
      />

      {/* ── Orbital SVG ─────────────────────────────────────────────────── */}
      <svg
        width="300"
        height="300"
        viewBox="0 0 300 300"
        style={{ overflow: "visible" }}
        className="mb-8"
      >
        <defs>
          {/* Soft glow filter for the core */}
          <filter id="core-glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Ripple rings */}
        {[0, 1, 2].map((i) => (
          <circle
            key={`ripple-${i}`}
            ref={(el) => { rippleRefs.current[i] = el; }}
            cx={C} cy={C} r={20}
            fill="none"
            stroke="#111"
            strokeWidth="0.8"
          />
        ))}

        {/* Faint orbit-path guides */}
        {ORBITS.map((o, i) => (
          <circle
            key={`path-${i}`}
            cx={C} cy={C} r={o.r}
            fill="none"
            stroke="#ececec"
            strokeWidth="0.6"
          />
        ))}

        {/* Orbital bodies */}
        {ORBITS.map((o, i) => (
          <g key={`orbit-${i}`} ref={(el) => { groupRefs.current[i] = el; }}>
            <circle
              ref={(el) => { dotRefs.current[i] = el; }}
              cx={C + o.r}
              cy={C}
              r={o.size}
              fill="#111"
              opacity={o.opacity}
            />
          </g>
        ))}

        {/* Core — rendered last so it sits on top */}
        <circle
          ref={coreRef}
          cx={C} cy={C} r={18}
          fill="#0a0a0a"
          filter="url(#core-glow)"
        />
      </svg>

      {/* ── Text ────────────────────────────────────────────────────────── */}
      <h2 className="text-2xl font-bold text-center text-white mb-3">
        {title}
      </h2>

      <p
        ref={textRef}
        className="text-sm text-gray-300 text-center max-w-xs"
        style={{ minHeight: "1.25rem" }}
      >
        {displayed}
      </p>
    </div>
  );
}
