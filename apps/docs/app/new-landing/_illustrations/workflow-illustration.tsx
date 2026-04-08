import { motion } from "motion/react";
import { useRef, useEffect, useState } from "react";
import svgPaths from "./imports/svg-kmc3faq2e5";

// Canvas dimensions — matches Figma base 740x463
const CW = 740;
const CH = 463;

// ─── Node box dimensions (from Figma ToolsNode) ─────────────────
const NODE_W = 157;
const NODE_H = 141;

// ─── Canvas Particle Field ───────────────────────────────────────
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
    }

    const particles: Particle[] = Array.from({ length: 40 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.15,
      vy: (Math.random() - 0.5) * 0.1,
      size: Math.random() * 1.2 + 0.3,
      baseAlpha: Math.random() * 0.3 + 0.05,
      pink: Math.random() < 0.2,
      phase: Math.random() * Math.PI * 2,
    }));

    let animId: number;
    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;
        p.phase += 0.015;
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
          ctx.fillStyle = `rgba(255,255,255,${alpha * 0.5})`;
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

// ─── Isometric Agent Node (div-based, Figma-exact) ──────────────
// Matches the imported ToolsNode design: proper 3D isometric box
// with top face, two side faces, back glow, and highlight overlay.
function AgentNode({
  label,
  subLabel,
  idSuffix,
}: {
  label: string;
  subLabel?: string;
  idSuffix: string;
}) {
  return (
    <div className="relative" style={{ width: NODE_W, height: NODE_H }}>
      {/* Back glow shadow (behind left side, flipped) */}
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
              fill={`url(#wf_back_${idSuffix})`}
              fillOpacity="0.4"
              stroke="white"
              strokeOpacity="0.2"
            />
            <defs>
              <linearGradient
                gradientUnits="userSpaceOnUse"
                id={`wf_back_${idSuffix}`}
                x1="0.5"
                x2="0.5"
                y1="0.85"
                y2="9550.85"
              >
                <stop stopColor="#9E1658" />
                <stop offset="1" stopColor="#0D0D0D" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>

      {/* Top face (isometric diamond) */}
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
              fill={`url(#wf_top_${idSuffix})`}
              stroke="white"
              strokeOpacity="0.9"
              strokeWidth="1.96497"
            />
            <defs>
              <linearGradient
                gradientUnits="userSpaceOnUse"
                id={`wf_top_${idSuffix}`}
                x1="2.0387"
                x2="2.0387"
                y1="1.12128"
                y2="8647.01"
              >
                <stop stopColor="#9E1658" />
                <stop offset="1" stopColor="#0D0D0D" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>

      {/* Front-right side face (appears on left side of screen) */}
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
              strokeOpacity="0.65"
              strokeWidth="1.57198"
            />
          </svg>
        </div>
      </div>

      {/* Front-left side face (appears on right side of screen) */}
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
              fill={`url(#wf_left_${idSuffix})`}
              stroke="white"
              strokeOpacity="0.75"
              strokeWidth="1.57198"
            />
            <defs>
              <linearGradient
                gradientUnits="userSpaceOnUse"
                id={`wf_left_${idSuffix}`}
                x1="0.78599"
                x2="0.78599"
                y1="1.32932"
                y2="9826.2"
              >
                <stop stopColor="#191410" />
                <stop offset="1" stopColor="#120E0B" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>

      {/* Top face glow overlay */}
      <div className="absolute" style={{ inset: "8.33% 6.79% 38.98% 6.37%" }}>
        <svg
          className="absolute block size-full"
          fill="none"
          preserveAspectRatio="none"
          viewBox="0 0 136.5 74.5413"
        >
          <path d={svgPaths.p2690bee2} fill={`url(#wf_glow_${idSuffix})`} />
          <defs>
            <linearGradient
              gradientUnits="userSpaceOnUse"
              id={`wf_glow_${idSuffix}`}
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

      {/* Text label */}
      <p
        className="absolute font-['Geist_Mono:Medium',sans-serif] leading-[normal] text-[9.751px] text-[rgba(255,255,255,0.7)] text-center"
        style={{
          inset: `${subLabel ? "24%" : "28.51%"} 25% ${subLabel ? "67%" : "62.3%"} 25%`,
        }}
      >
        {label}
      </p>
      {subLabel && (
        <p
          className="absolute font-['Geist_Mono:Medium',sans-serif] leading-[normal] text-[8px] text-[rgba(255,255,255,0.5)] text-center"
          style={{ inset: "34% 30% 57% 30%" }}
        >
          {subLabel}
        </p>
      )}
    </div>
  );
}

// ─── Orchestrator Center Stack ──────────────────────────────────
const OX = 271;
const OY = 70;
const OW = 197.213;
const OH = 249.697;

const STACK_LAYERS = [
  {
    paths: ["p30a40100", "p31aa8cf0", "pa5f6600"] as const,
    y: [40, 40, 0, 0, 0, -20, 40],
    opacity: [0.4, 0.4, 1, 1, 1, 0.4, 0.4],
    times: [0, 0.05, 0.15, 0.3, 0.85, 0.95, 1],
  },
  {
    paths: ["p3db071f0", "p7b59900", "p23d6e400"] as const,
    y: [25, 25, 0, 0, 0, -15, 25],
    opacity: [0.4, 0.4, 1, 1, 1, 0.4, 0.4],
    times: [0, 0.1, 0.2, 0.3, 0.8, 0.9, 1],
  },
];

const TOP_LAYER_ANIM = {
  y: [10, 10, 0, 0, 0, -8, 10],
  times: [0, 0.2, 0.3, 0.5, 0.7, 0.8, 1],
};

function Orchestrator() {
  return (
    <div
      className="absolute"
      style={{ left: OX, top: OY, width: OW, height: OH, zIndex: 10 }}
    >
      {/* Dark layers */}
      {STACK_LAYERS.map((layer, i) => (
        <motion.div
          key={i}
          className="absolute inset-0"
          animate={{ y: layer.y, opacity: layer.opacity }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
            times: layer.times,
          }}
        >
          <svg
            className="block size-full"
            fill="none"
            preserveAspectRatio="none"
            viewBox={`0 0 ${OW} ${OH}`}
          >
            {layer.paths.map((p, j) => (
              <path key={j} d={svgPaths[p]} fill="#431D30" />
            ))}
          </svg>
        </motion.div>
      ))}

      {/* Top Pink Layer */}
      <motion.div
        className="absolute inset-0"
        animate={{ y: TOP_LAYER_ANIM.y }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut",
          times: TOP_LAYER_ANIM.times,
        }}
      >
        <svg
          className="block size-full"
          fill="none"
          preserveAspectRatio="none"
          viewBox={`0 0 ${OW} ${OH}`}
        >
          <path
            clipRule="evenodd"
            d={svgPaths.p1e070000}
            fill="#FF80BD"
            fillRule="evenodd"
          />
          <path d={svgPaths.pc988a00} fill="#FF80BD" />
          <path d={svgPaths.p3ef0ee00} fill="#FF80BD" />
          <path
            clipRule="evenodd"
            d={svgPaths.p345aa180}
            fill="#FF1A88"
            fillRule="evenodd"
          />
          <path
            clipRule="evenodd"
            d={svgPaths.p386a0480}
            fill="#5D1738"
            fillRule="evenodd"
          />
          <path
            clipRule="evenodd"
            d={svgPaths.p1c6c0300}
            fill="#FF1A88"
            fillRule="evenodd"
          />
          <path
            clipRule="evenodd"
            d={svgPaths.p1c55b300}
            fill="#5D1738"
            fillRule="evenodd"
          />
          <path
            clipRule="evenodd"
            d={svgPaths.p1c4b3480}
            fill="#5D1738"
            fillRule="evenodd"
          />
          <path
            clipRule="evenodd"
            d={svgPaths.p39c54280}
            fill="#FF1A88"
            fillRule="evenodd"
          />
        </svg>

        {/* Labels */}
        <div className="absolute inset-0 flex flex-col items-center pt-8 pointer-events-none">
          <p className="font-['Geist_Mono:Bold',sans-serif] text-[16px] text-white leading-tight">
            WORKFLOW
          </p>
          <p className="font-['Geist_Mono:Medium',sans-serif] text-[9.5px] text-white/70">
            Orchestrator
          </p>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Data Flow Overlay ───────────────────────────────────────────
// Node center-x positions:
// Left nodes at left=60, width=157 → center-x = 60 + 78.5 ≈ 139
// Right nodes at left=520, width=157 → center-x = 520 + 78.5 ≈ 599
// Orchestrator center: (OX + OW/2, OY + OH/2) ≈ (370, 195)

const PATHS = {
  // Left sequential flow
  L1_2: "M 139,110 L 139,135",
  L2_3: "M 139,210 L 139,235",
  L3_O: "M 217,300 C 245,300 280,260 310,230",

  // Right parallel flow
  O_R1: "M 410,160 C 450,140 480,100 520,70",
  O_R2: "M 450,195 L 520,160",
  O_R3: "M 410,230 C 450,260 480,280 520,260",
};

// DataPacket must be defined BEFORE DataFlows
function DataPacket({
  path,
  color,
  delay,
  dur,
}: {
  path: string;
  color: string;
  delay: number;
  dur: number;
}) {
  return (
    <g filter="url(#wfGlow)">
      <circle r="3" fill={color}>
        <animateMotion
          path={path}
          dur={`${dur}s`}
          begin={`${delay}s`}
          repeatCount="indefinite"
        />
        <animate
          attributeName="opacity"
          values="0;1;1;0"
          dur={`${dur}s`}
          begin={`${delay}s`}
          repeatCount="indefinite"
        />
      </circle>
    </g>
  );
}

function DataFlows() {
  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      style={{ width: CW, height: CH, zIndex: 15 }}
      viewBox={`0 0 ${CW} ${CH}`}
      preserveAspectRatio="none"
    >
      <defs>
        <filter id="wfGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Gradients for flow lines */}
        <linearGradient id="wfGradL" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#12C2E9" />
          <stop offset="100%" stopColor="#C471ED" />
        </linearGradient>
        <linearGradient id="wfGradR" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#C471ED" />
          <stop offset="100%" stopColor="#F64F59" />
        </linearGradient>
      </defs>

      {/* Connection Paths (Background) */}
      <g opacity="0.2">
        <path
          d={PATHS.L1_2}
          stroke="url(#wfGradL)"
          strokeWidth="2"
          strokeDasharray="4 4"
          fill="none"
        />
        <path
          d={PATHS.L2_3}
          stroke="url(#wfGradL)"
          strokeWidth="2"
          strokeDasharray="4 4"
          fill="none"
        />
        <path
          d={PATHS.L3_O}
          stroke="url(#wfGradL)"
          strokeWidth="2"
          strokeDasharray="4 4"
          fill="none"
        />
        <path
          d={PATHS.O_R1}
          stroke="url(#wfGradR)"
          strokeWidth="2"
          strokeDasharray="4 4"
          fill="none"
        />
        <path
          d={PATHS.O_R2}
          stroke="url(#wfGradR)"
          strokeWidth="2"
          strokeDasharray="4 4"
          fill="none"
        />
        <path
          d={PATHS.O_R3}
          stroke="url(#wfGradR)"
          strokeWidth="2"
          strokeDasharray="4 4"
          fill="none"
        />
      </g>

      {/* Animated Data Packets */}
      {/* Sequential: Box 1 -> Box 2 -> Box 3 -> Center */}
      <DataPacket path={PATHS.L1_2} color="#12C2E9" delay={0} dur={2.5} />
      <DataPacket path={PATHS.L2_3} color="#12C2E9" delay={1.25} dur={2.5} />
      <DataPacket path={PATHS.L3_O} color="#C471ED" delay={2.5} dur={3} />

      {/* Parallel: Center -> (Box 4, 5, 6) simultaneously */}
      <DataPacket path={PATHS.O_R1} color="#F64F59" delay={5.5} dur={3} />
      <DataPacket path={PATHS.O_R2} color="#F64F59" delay={5.5} dur={3} />
      <DataPacket path={PATHS.O_R3} color="#F64F59" delay={5.5} dur={3} />
    </svg>
  );
}

// ─── Main Illustration ───────────────────────────────────────────
export function WorkflowIllustration() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

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
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 1 }}
      className="w-full flex items-center justify-center p-8 bg-black/40 rounded-xl"
    >
      <div
        ref={containerRef}
        className="relative w-full max-w-[740px] aspect-[740/463]"
      >
        <ParticleCanvas />

        {/* Ambient Glow */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-[#FF1A88]/5 rounded-full blur-[80px] pointer-events-none" />

        {/* Scaled Scene */}
        <div
          className="absolute inset-0 origin-top-left"
          style={{ transform: `scale(${scale})`, width: CW, height: CH }}
        >
          {/* Static Background Pink Elements */}
          <div
            className="absolute"
            style={{
              left: OX + 5,
              top: OY + 136,
              width: 244,
              height: 166,
              opacity: 0.3,
            }}
          >
            <svg viewBox="0 0 244 166" className="size-full">
              <path d={svgPaths.p21b7a500} fill="#FF5CAA" />
            </svg>
          </div>

          <Orchestrator />

          {/* ─── Sequential Left Stack (3 boxes stacked) ─────── */}
          <motion.div
            className="absolute inset-0"
            style={{ zIndex: 5 }}
            animate={{
              x: [0, 4, -2, 3, 0],
              y: [0, -6, 2, -4, 0],
            }}
            transition={{
              duration: 12,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            {/* Bottom box (furthest from viewer) */}
            <div className="absolute" style={{ left: 60, top: 225, zIndex: 1 }}>
              <AgentNode label="Summarize" idSuffix="sum" />
            </div>
            {/* Middle box */}
            <div className="absolute" style={{ left: 60, top: 135, zIndex: 2 }}>
              <AgentNode label="Analyze" idSuffix="ana" />
            </div>
            {/* Top box (closest to viewer in isometric, drawn on top) */}
            <div className="absolute" style={{ left: 60, top: 45, zIndex: 3 }}>
              <AgentNode label="Research" idSuffix="res" />
            </div>

            {/* Sequential Connectors (dashed lines between boxes) */}
            <svg
              className="absolute left-0 top-0 pointer-events-none"
              style={{ width: CW, height: CH, zIndex: 0 }}
            >
              <g opacity="0.4">
                <line
                  x1={139}
                  y1={130}
                  x2={139}
                  y2={148}
                  stroke="#64C8FF"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                />
                <circle cx={139} cy={130} r="3" fill="#64C8FF" />
                <line
                  x1={139}
                  y1={220}
                  x2={139}
                  y2={238}
                  stroke="#64C8FF"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                />
                <circle cx={139} cy={220} r="3" fill="#64C8FF" />
              </g>
            </svg>
          </motion.div>

          {/* ─── Parallel Right Stack (3 boxes stacked) ──────── */}
          <motion.div
            className="absolute inset-0"
            style={{ zIndex: 5 }}
            animate={{
              x: [0, -3, 2, -4, 0],
              y: [0, -5, 3, -6, 0],
            }}
            transition={{
              duration: 14,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            {/* Bottom box */}
            <div
              className="absolute"
              style={{ left: 520, top: 215, zIndex: 1 }}
            >
              <AgentNode label="Translate" subLabel="ES" idSuffix="es" />
            </div>
            {/* Middle box */}
            <div
              className="absolute"
              style={{ left: 520, top: 130, zIndex: 2 }}
            >
              <AgentNode label="Translate" subLabel="FR" idSuffix="fr" />
            </div>
            {/* Top box */}
            <div className="absolute" style={{ left: 520, top: 45, zIndex: 3 }}>
              <AgentNode label="Translate" subLabel="EN" idSuffix="en" />
            </div>
          </motion.div>

          <DataFlows />
        </div>
      </div>
    </motion.div>
  );
}
