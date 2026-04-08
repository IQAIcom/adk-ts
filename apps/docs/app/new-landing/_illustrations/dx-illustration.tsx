import { motion } from "motion/react";
import { useRef, useEffect, useState } from "react";
import svgPaths from "./imports/svg-kmc3faq2e5";

// ═══════════════════════════════════════════════════════════════════
// ╔═══════════════════════════════════════════════════════════════╗
// ║                    CANVAS & NODE CONSTANTS                    ║
// ╚═══════════════════════════════════════════════════════════════╝
// ═══════════════════════════════════════════════════════════════════

// Canvas dimensions
const CW = 740;
const CH = 463;

// Node box dimensions
const NODE_W = 100;
const NODE_H = 90;

// ═══════════════════════════════════════════════════════════════════
// ╔═══════════════════════════════════════════════════════════════╗
// ║                 WORKFLOW NODE DATA (2-1-3 LAYOUT)             ║
// ╚═══════════════════════════════════════════════════════════════╝
// ═══════════════════════════════════════════════════════════════════
// 6 flow boxes — 2 top, 1 center, 3 bottom
// Flow: Start → Step 1 → Suspend → Resume → Step 2 → End

const BOX_DATA = [
  // TOP ROW (2 boxes)
  { label: "Start", subLabel: "Trigger", left: 185, top: 30, id: "sta" },
  { label: "Step 1", subLabel: "Process", left: 445, top: 30, id: "st1" },

  // MIDDLE ROW (1 box - focal point)
  { label: "Suspend", subLabel: "Wait", left: 320, top: 178, id: "sus" },

  // BOTTOM ROW (3 boxes)
  { label: "Resume", subLabel: "Continue", left: 70, top: 330, id: "rsm" },
  { label: "Step 2", subLabel: "Process", left: 320, top: 330, id: "st2" },
  { label: "End", subLabel: "Complete", left: 570, top: 330, id: "end" },
] as const;

// ═══════════════════════════════════════════════════════════════════
// ╔═══════════════════════════════════════════════════════════════╗
// ║               CONNECTION PATH GEOMETRY HELPERS                ║
// ╚═══════════════════════════════════════════════════════════════╝
// ═══════════════════════════════════════════════════════════════════

// Edge coordinate helpers
const rEdge = (i: number) => ({
  x: BOX_DATA[i].left + NODE_W,
  y: BOX_DATA[i].top + NODE_H * 0.33,
});
const lEdge = (i: number) => ({
  x: BOX_DATA[i].left,
  y: BOX_DATA[i].top + NODE_H * 0.33,
});
const bCenter = (i: number) => ({
  x: BOX_DATA[i].left + NODE_W / 2,
  y: BOX_DATA[i].top + NODE_H,
});
const tCenter = (i: number) => ({
  x: BOX_DATA[i].left + NODE_W / 2,
  y: BOX_DATA[i].top,
});

// ═══════════════════════════════════════════════════════════════════
// ╔═══════════════════════════════════════════════════════════════╗
// ║              5 RAINBOW CONNECTION PATHS WITH BEZIERS          ║
// ╚═══════════════════════════════════════════════════════════════╝
// ═══════════════════════════════════════════════════════════════════

// PATH 0: Start(right) → Step1(left) — horizontal across top
const p0s = rEdge(0);
const p0e = lEdge(1);
const p0 = `M ${p0s.x},${p0s.y} C ${p0s.x + 50},${p0s.y - 20} ${p0e.x - 50},${p0e.y - 20} ${p0e.x},${p0e.y}`;

// PATH 1: Step1(bottom) → Suspend(top) — diagonal down-left
const p1s = bCenter(1);
const p1e = tCenter(2);
const p1 = `M ${p1s.x},${p1s.y} C ${p1s.x},${p1s.y + 40} ${p1e.x},${p1e.y - 40} ${p1e.x},${p1e.y}`;

// PATH 2: Suspend(bottom) → Resume(top) — diagonal down-left
const p2s = bCenter(2);
const p2e = tCenter(3);
const p2 = `M ${p2s.x},${p2s.y} C ${p2s.x - 30},${p2s.y + 45} ${p2e.x + 30},${p2e.y - 45} ${p2e.x},${p2e.y}`;

// PATH 3: Resume(right) → Step2(left) — horizontal across bottom
const p3s = rEdge(3);
const p3e = lEdge(4);
const p3 = `M ${p3s.x},${p3s.y} C ${p3s.x + 45},${p3s.y - 18} ${p3e.x - 45},${p3e.y - 18} ${p3e.x},${p3e.y}`;

// PATH 4: Step2(right) → End(left) — horizontal across bottom
const p4s = rEdge(4);
const p4e = lEdge(5);
const p4 = `M ${p4s.x},${p4s.y} C ${p4s.x + 45},${p4s.y - 18} ${p4e.x - 45},${p4e.y - 18} ${p4e.x},${p4e.y}`;

const FLOW_PATHS = [p0, p1, p2, p3, p4];

// Arrowhead target points
const ARROW_TARGETS = [
  { ...p0e, dir: "right" },
  { ...p1e, dir: "down" },
  { ...p2e, dir: "down" },
  { ...p3e, dir: "right" },
  { ...p4e, dir: "right" },
] as const;

// ═══════════════════════════════════════════════════════════════════
// ╔═══════════════════════════════════════════════════════════════╗
// ║                   RAINBOW GRADIENT COLORS                     ║
// ╚═══════════════════════════════════════════════════════════════╝
// ═══════════════════════════════════════════════════════════════════

// Rainbow gradient colors for each connection
const FLOW_COLORS = [
  { from: "#12C2E9", to: "#6BCB77" },
  { from: "#6BCB77", to: "#FFD93D" },
  { from: "#FFD93D", to: "#64C8FF" },
  { from: "#64C8FF", to: "#C471ED" },
  { from: "#C471ED", to: "#F64F59" },
];

// ═══════════════════════════════════════════════════════════════════
// ╔═══════════════════════════════════════════════════════════════╗
// ║                   PARTICLE CANVAS BACKGROUND                  ║
// ╚═══════════════════════════════════════════════════════════════╝
// ═══════════════════════════════════════════════════════════════════

function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      baseAlpha: number;
      pink: boolean;
      phase: number;
      speed: number;
    }

    const particles: Particle[] = [];
    for (let i = 0; i < 50; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.1,
        size: Math.random() * 1.3 + 0.3,
        baseAlpha: Math.random() * 0.25 + 0.04,
        pink: Math.random() > 0.82,
        phase: Math.random() * Math.PI * 2,
        speed: 0.003 + Math.random() * 0.008,
      });
    }

    let animId: number;
    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.phase += p.speed;
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;
        if (p.y < -10) p.y = height + 10;
        if (p.y > height + 10) p.y = -10;
        const flicker = 0.5 + 0.5 * Math.sin(p.phase);
        const alpha = p.baseAlpha * flicker;
        if (p.pink) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 4, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,26,136,${alpha * 0.12})`;
          ctx.fill();
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,26,136,${alpha})`;
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,255,255,${alpha * 0.45})`;
          ctx.fill();
        }
      }
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════
// ╔═══════════════════════════════════════════════════════════════╗
// ║               ISOMETRIC BOX NODE COMPONENT                    ║
// ╚═══════════════════════════════════════════════════════════════╝
// ═══════════════════════════════════════════════════════════════════
// Renders each workflow node as an isometric 3D box with:
// - Custom colors for Suspend (blue) vs normal nodes (pink)
// - Dashed borders for Suspend node
// - Icon overlay (pause, play, checkmark, circle, arrow)

function IsoBox({
  label,
  subLabel,
  idSuffix,
  isSuspend,
}: {
  label: string;
  subLabel?: string;
  idSuffix: string;
  isSuspend?: boolean;
}) {
  const topColor = isSuspend ? "#16509E" : "#9E1658";
  const sideColor = isSuspend ? "#0E1A30" : "#191410";
  const sideDark = isSuspend ? "#0B1220" : "#120E0B";
  const dash = isSuspend ? "5 4" : "none";

  return (
    <div className="relative" style={{ width: NODE_W, height: NODE_H }}>
      {/* Back glow */}
      <div className="absolute" style={{ inset: "32.04% 50.69% 0.46% 0.33%" }}>
        <div className="w-full h-full -scale-y-100">
          <svg
            className="block size-full"
            fill="none"
            preserveAspectRatio="none"
            viewBox="0 0 78 97.2002"
          >
            <path
              d={svgPaths.p819ab80}
              fill={`url(#dx_bk_${idSuffix})`}
              fillOpacity="0.4"
              stroke="white"
              strokeOpacity="0.2"
            />
            <defs>
              <linearGradient
                gradientUnits="userSpaceOnUse"
                id={`dx_bk_${idSuffix}`}
                x1="0.5"
                x2="0.5"
                y1="0.85"
                y2="9550.85"
              >
                <stop stopColor={topColor} />
                <stop offset="1" stopColor="#0D0D0D" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>

      {/* Top face */}
      <div className="absolute" style={{ inset: "0 0 38.89% 0" }}>
        <div className="absolute" style={{ inset: "-1.3%" }}>
          <svg
            className="block size-full"
            fill="none"
            preserveAspectRatio="none"
            viewBox="0 0 161.275 88.7014"
          >
            <path
              d={svgPaths.p24559400}
              fill={`url(#dx_tp_${idSuffix})`}
              stroke="white"
              strokeOpacity={isSuspend ? 0.55 : 0.9}
              strokeWidth="1.96497"
              strokeDasharray={dash}
            />
            <defs>
              <linearGradient
                gradientUnits="userSpaceOnUse"
                id={`dx_tp_${idSuffix}`}
                x1="2.0387"
                x2="2.0387"
                y1="1.12128"
                y2="8647.01"
              >
                <stop stopColor={topColor} />
                <stop offset="1" stopColor="#0D0D0D" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>

      {/* Right side face */}
      <div
        className="absolute bottom-0 left-0 right-1/2"
        style={{ top: "30.56%" }}
      >
        <div className="absolute" style={{ inset: "-1.35% -1%" }}>
          <svg
            className="block size-full"
            fill="none"
            preserveAspectRatio="none"
            viewBox="0 0 80.1709 100.907"
          >
            <path
              d={svgPaths.p33c9e570}
              fill="#0A0A0A"
              fillOpacity="0.4"
              stroke="white"
              strokeOpacity={isSuspend ? 0.4 : 0.65}
              strokeWidth="1.57198"
              strokeDasharray={dash}
            />
          </svg>
        </div>
      </div>

      {/* Left side face */}
      <div
        className="absolute bottom-0 left-1/2 right-0"
        style={{ top: "30.56%" }}
      >
        <div className="absolute" style={{ inset: "-1.35% -1%" }}>
          <svg
            className="block size-full"
            fill="none"
            preserveAspectRatio="none"
            viewBox="0 0 80.1709 100.907"
          >
            <path
              d={svgPaths.p367d4b40}
              fill={`url(#dx_sd_${idSuffix})`}
              stroke="white"
              strokeOpacity={isSuspend ? 0.45 : 0.75}
              strokeWidth="1.57198"
              strokeDasharray={dash}
            />
            <defs>
              <linearGradient
                gradientUnits="userSpaceOnUse"
                id={`dx_sd_${idSuffix}`}
                x1="0.78599"
                x2="0.78599"
                y1="1.32932"
                y2="9826.2"
              >
                <stop stopColor={sideColor} />
                <stop offset="1" stopColor={sideDark} />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>

      {/* Top glow overlay */}
      <div className="absolute" style={{ inset: "8.33% 6.79% 38.98% 6.37%" }}>
        <svg
          className="absolute block size-full"
          fill="none"
          preserveAspectRatio="none"
          viewBox="0 0 136.5 74.5413"
        >
          <path d={svgPaths.p2690bee2} fill={`url(#dx_gl_${idSuffix})`} />
          <defs>
            <linearGradient
              gradientUnits="userSpaceOnUse"
              id={`dx_gl_${idSuffix}`}
              x1="-2.83279"
              x2="-2.83279"
              y1="0"
              y2="7454.13"
            >
              <stop stopColor="white" stopOpacity="0.12" />
              <stop offset="0.5" stopColor="white" stopOpacity="0.03" />
              <stop offset="1" stopColor="white" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* ─── ICON OVERLAYS ─── */}
      {isSuspend && (
        <div
          className="absolute flex items-center justify-center pointer-events-none"
          style={{ left: "28%", top: "48%", width: "44%", height: "34%" }}
        >
          <svg width="18" height="20" viewBox="0 0 18 20" fill="none">
            <rect
              x="2"
              y="2"
              width="5"
              height="16"
              rx="1.5"
              fill="rgba(100,200,255,0.55)"
            />
            <rect
              x="11"
              y="2"
              width="5"
              height="16"
              rx="1.5"
              fill="rgba(100,200,255,0.55)"
            />
          </svg>
        </div>
      )}
      {label === "Start" && (
        <div
          className="absolute flex items-center justify-center pointer-events-none"
          style={{ left: "32%", top: "50%", width: "36%", height: "30%" }}
        >
          <svg width="14" height="16" viewBox="0 0 14 16" fill="none">
            <path
              d="M2 1.5L12 8L2 14.5V1.5Z"
              fill="rgba(255,255,255,0.35)"
              stroke="rgba(255,255,255,0.2)"
              strokeWidth="1"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )}
      {label === "Resume" && (
        <div
          className="absolute flex items-center justify-center pointer-events-none"
          style={{ left: "28%", top: "48%", width: "44%", height: "34%" }}
        >
          <svg width="18" height="14" viewBox="0 0 18 14" fill="none">
            <path
              d="M1 7H14M11 3L15 7L11 11"
              stroke="rgba(100,200,255,0.5)"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )}
      {label === "End" && (
        <div
          className="absolute flex items-center justify-center pointer-events-none"
          style={{ left: "32%", top: "50%", width: "36%", height: "30%" }}
        >
          <svg width="16" height="14" viewBox="0 0 16 14" fill="none">
            <path
              d="M2 7L6 11.5L14 2"
              stroke="rgba(255,255,255,0.4)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )}
      {(label === "Step 1" || label === "Step 2") && (
        <div
          className="absolute flex items-center justify-center pointer-events-none"
          style={{ left: "32%", top: "50%", width: "36%", height: "30%" }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle
              cx="7"
              cy="7"
              r="5"
              stroke="rgba(255,255,255,0.3)"
              strokeWidth="1.5"
            />
            <circle cx="7" cy="7" r="1.8" fill="rgba(255,255,255,0.35)" />
          </svg>
        </div>
      )}

      {/* ─── TEXT LABELS ─── */}
      <p
        className="absolute font-['Geist_Mono:Medium',sans-serif] leading-[normal] text-center"
        style={{
          fontSize: "9px",
          inset: `${subLabel ? "18%" : "25%"} 12% ${subLabel ? "72%" : "66%"} 12%`,
          color: isSuspend ? "rgba(100,200,255,0.85)" : "rgba(255,255,255,0.7)",
        }}
      >
        {label}
      </p>
      {subLabel && (
        <p
          className="absolute font-['Geist_Mono:Medium',sans-serif] leading-[normal] text-center"
          style={{
            fontSize: "7px",
            inset: "29% 15% 62% 15%",
            color: isSuspend
              ? "rgba(100,200,255,0.5)"
              : "rgba(255,255,255,0.45)",
          }}
        >
          {subLabel}
        </p>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ╔═══════════════════════════════════════════════════════════════╗
// ║            ANIMATED DATA PACKET (SVG ANIMATION)               ║
// ╚═══════════════════════════════════════════════════════════════╝
// ═══════════════════════════════════════════════════════════════════
// Renders a glowing dot that travels along a connection path

function DataPacket({
  path,
  color,
  dur,
  delay,
}: {
  path: string;
  color: string;
  dur: number;
  delay: number;
}) {
  return (
    <g filter="url(#dxPktGlow)">
      <circle r="5" fill="none" stroke={color} strokeWidth="1" opacity="0.3">
        <animateMotion
          dur={`${dur}s`}
          begin={`${delay}s`}
          repeatCount="indefinite"
          path={path}
          rotate="auto"
          keyPoints="0;1"
          keyTimes="0;1"
        />
      </circle>
      <circle r="2" fill={color} opacity="0.85">
        <animateMotion
          dur={`${dur}s`}
          begin={`${delay}s`}
          repeatCount="indefinite"
          path={path}
          rotate="auto"
          keyPoints="0;1"
          keyTimes="0;1"
        />
      </circle>
      <circle r="0.8" fill="white" opacity="0.9">
        <animateMotion
          dur={`${dur}s`}
          begin={`${delay}s`}
          repeatCount="indefinite"
          path={path}
          rotate="auto"
          keyPoints="0;1"
          keyTimes="0;1"
        />
      </circle>
    </g>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ╔═══════════════════════════════════════════════════════════════╗
// ║              DATA FLOW SVG OVERLAY (PATHS & EFFECTS)         ║
// ╚═══════════════════════════════════════════════════════════════╝
// ═══════════════════════════════════════════════════════════════════
// Contains:
// - 5 rainbow gradient connection paths with animated sweeps
// - Animated data packets traveling along paths
// - Pulsing rings around Suspend node
// - Arrow heads at path endpoints
// - Endpoint glow halos
// - Text labels for Suspend/Resume

function DataFlowOverlay() {
  const susCx = BOX_DATA[2].left + NODE_W / 2;
  const susCy = BOX_DATA[2].top + NODE_H / 2;

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      style={{ width: CW, height: CH, zIndex: 15 }}
      viewBox={`0 0 ${CW} ${CH}`}
      preserveAspectRatio="none"
    >
      <defs>
        {/* ─── FILTER: Packet glow effect ─── */}
        <filter id="dxPktGlow" x="-200%" y="-200%" width="500%" height="500%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* ─── FILTER: Line glow effect ─── */}
        <filter id="dxLineGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="4" />
        </filter>

        {/* ─── GRADIENT: Suspend pulse ─── */}
        <radialGradient id="dxSusPulse" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#64C8FF" stopOpacity="0.2" />
          <stop offset="60%" stopColor="#64C8FF" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#64C8FF" stopOpacity="0" />
        </radialGradient>

        {/* ─── GRADIENTS: Path static gradients ─── */}
        {FLOW_COLORS.map((c, i) => {
          // Use correct start/end coords per path
          const starts = [p0s, p1s, p2s, p3s, p4s];
          const ends = [p0e, p1e, p2e, p3e, p4e];
          return (
            <linearGradient
              key={`g${i}`}
              id={`dxFG${i}`}
              gradientUnits="userSpaceOnUse"
              x1={starts[i].x}
              y1={starts[i].y}
              x2={ends[i].x}
              y2={ends[i].y}
            >
              <stop offset="0%" stopColor={c.from} />
              <stop offset="100%" stopColor={c.to} />
            </linearGradient>
          );
        })}

        {/* ─── GRADIENTS: Animated sweep gradients ─── */}
        {FLOW_COLORS.map((c, i) => (
          <linearGradient key={`sw${i}`} id={`dxSW${i}`}>
            <stop offset="0%" stopColor={c.from} stopOpacity="0">
              <animate
                attributeName="offset"
                values="-0.3;1.3"
                dur={`${3 + i * 0.3}s`}
                repeatCount="indefinite"
              />
            </stop>
            <stop offset="15%" stopColor={c.from} stopOpacity="0.7">
              <animate
                attributeName="offset"
                values="-0.15;1.45"
                dur={`${3 + i * 0.3}s`}
                repeatCount="indefinite"
              />
            </stop>
            <stop offset="30%" stopColor={c.from} stopOpacity="0">
              <animate
                attributeName="offset"
                values="0;1.6"
                dur={`${3 + i * 0.3}s`}
                repeatCount="indefinite"
              />
            </stop>
          </linearGradient>
        ))}
      </defs>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ─── SUSPEND FOCAL POINT ZONE ─────────────────────────────── */}
      {/* ═══════════════════════════════════════════════════════════ */}

      {/* Dashed blue border around Suspend node */}
      <rect
        x={BOX_DATA[2].left - 14}
        y={BOX_DATA[2].top - 16}
        width={NODE_W + 28}
        height={NODE_H + 32}
        rx="10"
        fill="none"
        stroke="#64C8FF"
        strokeWidth="1"
        strokeDasharray="6 4"
        opacity="0.2"
      />

      {/* Pulsing dashed rings - ring 1 */}
      <circle
        cx={susCx}
        cy={susCy}
        r="20"
        fill="none"
        stroke="#64C8FF"
        strokeWidth="1"
        strokeDasharray="4 3"
        opacity="0"
      >
        <animate
          attributeName="r"
          values="30;65"
          dur="3s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="opacity"
          values="0.4;0"
          dur="3s"
          repeatCount="indefinite"
        />
      </circle>

      {/* Pulsing dashed rings - ring 2 */}
      <circle
        cx={susCx}
        cy={susCy}
        r="20"
        fill="none"
        stroke="#64C8FF"
        strokeWidth="1"
        strokeDasharray="4 3"
        opacity="0"
      >
        <animate
          attributeName="r"
          values="30;65"
          dur="3s"
          begin="1.5s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="opacity"
          values="0.25;0"
          dur="3s"
          begin="1.5s"
          repeatCount="indefinite"
        />
      </circle>

      {/* Suspend ambient glow */}
      <circle
        cx={susCx}
        cy={susCy}
        r="55"
        fill="url(#dxSusPulse)"
        opacity="0.6"
      >
        <animate
          attributeName="opacity"
          values="0.4;0.7;0.4"
          dur="4s"
          repeatCount="indefinite"
        />
      </circle>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ─── 5 RAINBOW CONNECTION PATHS ────────────────────────────── */}
      {/* ═══════════════════════════════════════════════════════════ */}

      {FLOW_PATHS.map((path, i) => (
        <g key={`fp-${i}`}>
          {/* Glow underlay */}
          <path
            d={path}
            fill="none"
            stroke={FLOW_COLORS[i].from}
            strokeWidth="8"
            strokeLinecap="round"
            opacity="0.04"
            filter="url(#dxLineGlow)"
          />

          {/* Static dashed path */}
          <path
            d={path}
            fill="none"
            stroke={`url(#dxFG${i})`}
            strokeWidth="1.5"
            strokeDasharray="5 4"
            strokeLinecap="round"
            opacity="0.35"
          />

          {/* Animated sweep */}
          <path
            d={path}
            fill="none"
            stroke={`url(#dxSW${i})`}
            strokeWidth="2"
            strokeDasharray="5 4"
            strokeLinecap="round"
          />

          {/* Data packets - 2 per path */}
          <DataPacket
            path={path}
            color={FLOW_COLORS[i].to}
            dur={2.8 + i * 0.2}
            delay={i * 0.7}
          />
          <DataPacket
            path={path}
            color={FLOW_COLORS[i].from}
            dur={3.2 + i * 0.15}
            delay={i * 0.7 + 1.8}
          />
        </g>
      ))}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ─── ARROW HEADS AT PATH ENDPOINTS ────────────────────────── */}
      {/* ═══════════════════════════════════════════════════════════ */}

      {ARROW_TARGETS.map((t, i) => {
        if (t.dir === "right") {
          return (
            <polygon
              key={`a-${i}`}
              points={`${t.x - 6},${t.y - 4} ${t.x},${t.y} ${t.x - 6},${t.y + 4}`}
              fill={FLOW_COLORS[i].to}
              opacity="0.5"
            />
          );
        }
        // down
        return (
          <polygon
            key={`a-${i}`}
            points={`${t.x - 4},${t.y - 6} ${t.x},${t.y} ${t.x + 4},${t.y - 6}`}
            fill={FLOW_COLORS[i].to}
            opacity="0.5"
          />
        );
      })}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ─── ENDPOINT GLOW HALOS (PULSING RINGS ON EACH NODE) ────── */}
      {/* ═══════════════════════════════════════════════════════════ */}

      {BOX_DATA.map((box, i) => {
        const cx = box.left + NODE_W / 2;
        const cy = box.top + NODE_H * 0.33;
        const color =
          box.id === "sus" || box.id === "rsm"
            ? "#64C8FF"
            : box.id === "sta"
              ? "#12C2E9"
              : box.id === "end"
                ? "#F64F59"
                : "#FF1A88";
        return (
          <circle
            key={`h-${i}`}
            cx={cx}
            cy={cy}
            r="8"
            fill="none"
            stroke={color}
            strokeWidth="1"
            opacity="0"
          >
            <animate
              attributeName="opacity"
              values="0;0.35;0"
              dur={`${3 + i * 0.35}s`}
              repeatCount="indefinite"
            />
            <animate
              attributeName="r"
              values="6;16;6"
              dur={`${3 + i * 0.35}s`}
              repeatCount="indefinite"
            />
          </circle>
        );
      })}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ─── TEXT LABELS: SUSPEND / RESUME ─────────────────────────── */}
      {/* ═══════════════════════════════════════════════════════════ */}

      <text
        x={susCx}
        y={BOX_DATA[2].top + NODE_H + 20}
        fill="#64C8FF"
        fillOpacity="0.55"
        fontFamily="'Geist Mono', monospace"
        fontSize="8"
        textAnchor="middle"
      >
        ⏸ State Persisted
      </text>
      <text
        x={BOX_DATA[3].left + NODE_W / 2}
        y={BOX_DATA[3].top - 10}
        fill="#64C8FF"
        fillOpacity="0.45"
        fontFamily="'Geist Mono', monospace"
        fontSize="8"
        textAnchor="middle"
      >
        ▶ Restored
      </text>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ─── BOTTOM FLOW SUMMARY ───────────────────────────────────── */}
      {/* ═══════════════════════════════════════════════════════════ */}

      <text
        x={CW / 2}
        y={CH - 22}
        fill="white"
        fillOpacity="0.2"
        fontFamily="'Geist Mono', monospace"
        fontSize="9.5"
        textAnchor="middle"
      >
        Suspend → persist state → resume from checkpoint
      </text>
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ╔═══════════════════════════════════════════════════════════════╗
// ║         LISSAJOUS FLOATING ANIMATION DATA (PER BOX)           ║
// ╚═══════════════════════════════════════════════════════════════╝
// ═══════════════════════════════════════════════════════════════════

const FLOAT = [
  { dx: [0, 3, -2, 4, 0], dy: [0, -5, 2, -4, 0], dur: 11 },
  { dx: [0, -2, 4, -3, 0], dy: [0, -6, 1, -5, 0], dur: 12 },
  { dx: [0, 2, -1, 3, 0], dy: [0, -3, 2, -5, 0], dur: 10 },
  { dx: [0, -3, 2, -2, 0], dy: [0, -5, 2, -4, 0], dur: 13 },
  { dx: [0, 2, -3, 1, 0], dy: [0, -4, 1, -5, 0], dur: 11 },
  { dx: [0, -2, 3, -4, 0], dy: [0, -6, 2, -3, 0], dur: 14 },
];

// ═══════════════════════════════════════════════════════════════════
// ╔═══════════════════════════════════════════════════════════════╗
// ║                 MAIN ILLUSTRATION COMPONENT                   ║
// ╚═══════════════════════════════════════════════════════════════╝
// ═══════════════════════════════════════════════════════════════════

export function DxIllustration() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  // ─── RESIZE OBSERVER: Scale to fit container ───
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        setScale(entry.contentRect.width / CW);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.2 }}
      className="w-full flex items-center justify-center"
    >
      <div
        ref={containerRef}
        className="relative w-full max-w-[740px] aspect-[740/463]"
      >
        {/* ─── BACKGROUND: Particle canvas ─── */}
        <ParticleCanvas />

        {/* ═══════════════════════════════════════════════════════ */}
        {/* ─── AMBIENT GLOW: Pink center ───────────────────────── */}
        {/* ═══════════════════════════════════════════════════════ */}
        <motion.div
          className="absolute pointer-events-none"
          style={{
            left: "50%",
            top: "45%",
            width: "320px",
            height: "280px",
            transform: "translate(-50%, -50%)",
            background:
              "radial-gradient(ellipse, rgba(255,26,136,0.08) 0%, rgba(255,26,136,0.02) 50%, transparent 75%)",
            borderRadius: "50%",
            zIndex: 1,
          }}
          animate={{ scale: [1, 1.12, 1], opacity: [0.5, 0.9, 0.5] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* ═══════════════════════════════════════════════════════ */}
        {/* ─── AMBIENT GLOW: Blue Suspend area ─────────────────── */}
        {/* ═══════════════════════════════════════════════════════ */}
        <div
          className="absolute pointer-events-none"
          style={{
            left: `${((BOX_DATA[2].left + NODE_W / 2) / CW) * 100}%`,
            top: `${((BOX_DATA[2].top + NODE_H / 2) / CH) * 100}%`,
            width: "200px",
            height: "200px",
            transform: "translate(-50%, -50%)",
            background:
              "radial-gradient(circle, rgba(100,200,255,0.1) 0%, transparent 65%)",
            borderRadius: "50%",
            zIndex: 1,
          }}
        />

        {/* ═══════════════════════════════════════════════════════ */}
        {/* ─── SCALED SCENE (All node boxes + data flow overlay) ─ */}
        {/* ═══════════════════════════════════════════════════════ */}
        <div
          className="absolute inset-0 origin-top-left"
          style={{ transform: `scale(${scale})`, width: CW, height: CH }}
        >
          {/* ─── WORKFLOW NODE BOXES WITH LISSAJOUS FLOATING ─── */}
          {BOX_DATA.map((box, i) => (
            <motion.div
              key={box.id}
              className="absolute"
              style={{ left: box.left, top: box.top, zIndex: 8 }}
              animate={{
                x: FLOAT[i].dx,
                y: FLOAT[i].dy,
                scale: [1, 1.005, 0.998, 1.004, 1],
                rotateZ: [0, 0.3, -0.2, 0.4, 0],
              }}
              transition={{
                duration: FLOAT[i].dur,
                repeat: Infinity,
                ease: "easeInOut",
                times: [0, 0.25, 0.5, 0.75, 1],
              }}
            >
              <IsoBox
                label={box.label}
                subLabel={box.subLabel}
                idSuffix={box.id}
                isSuspend={box.id === "sus"}
              />
            </motion.div>
          ))}

          {/* ─── DATA FLOW: Paths, packets, arrows, effects ─── */}
          <DataFlowOverlay />
        </div>

        {/* ═══════════════════════════════════════════════════════ */}
        {/* ─── SCAN LINE EFFECT ──────────────────────────────────── */}
        {/* ═══════════════════════════════════════════════════════ */}
        <motion.div
          className="absolute inset-x-0 pointer-events-none"
          style={{
            height: "1px",
            background:
              "linear-gradient(90deg, transparent 0%, rgba(196,113,237,0.12) 20%, rgba(255,26,136,0.2) 50%, rgba(196,113,237,0.12) 80%, transparent 100%)",
            zIndex: 20,
          }}
          animate={{ top: ["0%", "100%"], opacity: [0, 0.5, 0.5, 0] }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "linear",
            times: [0, 0.05, 0.95, 1],
          }}
        />
      </div>
    </motion.div>
  );
}
