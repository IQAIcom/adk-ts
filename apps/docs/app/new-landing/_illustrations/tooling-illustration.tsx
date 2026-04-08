import { motion } from "motion/react";
import { useRef, useEffect, useState } from "react";
import svgPaths from "./imports/svg-zbi1mf8hv5";

// Canvas: 720×437 (tightened from 806 to match visual scale of other illustrations)
// All X positions shifted left by 40px from original Figma coordinates
const CW = 720;
const CH = 437;
// X offset applied to all original positions
const XO = -40;

// ─── Canvas Particle Field ───────────────────────────────────────
function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = canvas.offsetWidth;
    let height = canvas.offsetHeight;
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
        size: Math.random() * 1.5 + 0.3,
        baseAlpha: Math.random() * 0.22 + 0.04,
        pink: Math.random() > 0.82,
        phase: Math.random() * Math.PI * 2,
        speed: 0.003 + Math.random() * 0.007,
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

// ─── Function Tools Block (left isometric cube) ─────────────────
function FunctionToolsBlock() {
  return (
    <div
      className="absolute"
      style={{ left: 40.5 + XO, top: 76.3, width: 186, height: 177 }}
    >
      <div className="absolute inset-[-0.28%_-0.83%_-0.56%_-0.55%]">
        <svg
          className="block size-full"
          fill="none"
          preserveAspectRatio="none"
          viewBox="0 0 188.563 178.501"
        >
          <path
            d={svgPaths.p10edd400}
            fill="url(#tl_ft_top)"
            stroke="white"
            strokeOpacity="0.9"
          />
          <path
            d={svgPaths.p212b6880}
            fill="url(#tl_ft_front)"
            stroke="white"
            strokeWidth="2"
          />
          <path d={svgPaths.p971c600} fill="url(#tl_ft_face)" />
          <path d={svgPaths.p2d321190} fill="url(#tl_ft_topHL)" />
          <path
            d={svgPaths.p399f0200}
            fill="#0F0F0F"
            fillOpacity="0.8"
            stroke="white"
            strokeOpacity="0.6"
            strokeWidth="2.5033"
          />
          {/* Horizontal bar indicator */}
          <path d={svgPaths.p34e66600} fill="white" fillOpacity="0.25" />
          {/* Pink bar */}
          <path d={svgPaths.p9187600} fill="#FF1A88" fillOpacity="0.7" />
          {/* Status dots */}
          <path
            d={svgPaths.p1a67e500}
            fill="white"
            fillOpacity="0.4"
            opacity="0.629"
          />
          <path
            d={svgPaths.p22776180}
            fill="white"
            fillOpacity="0.4"
            opacity="0.488"
          />
          <path
            d={svgPaths.p1b30a800}
            fill="white"
            fillOpacity="0.4"
            opacity="0.407"
          />
          <path
            d={svgPaths.p2a7bc970}
            fill="white"
            fillOpacity="0.4"
            opacity="0.461"
          />
          <path
            d={svgPaths.p4cb5600}
            fill="white"
            fillOpacity="0.4"
            opacity="0.552"
          />
          <defs>
            <linearGradient
              gradientUnits="userSpaceOnUse"
              id="tl_ft_top"
              x1="-22.316"
              x2="-22.316"
              y1="-43.583"
              y2="11003.9"
            >
              <stop stopColor="#9E1658" />
              <stop offset="1" stopColor="#0D0D0D" />
            </linearGradient>
            <linearGradient
              gradientUnits="userSpaceOnUse"
              id="tl_ft_front"
              x1="-19.215"
              x2="-19.215"
              y1="227.786"
              y2="-24537.9"
            >
              <stop stopColor="#FF1A88" stopOpacity="0.6" />
              <stop offset="0.5" stopColor="#FF1A88" stopOpacity="0.3" />
              <stop offset="1" stopColor="#FF1A88" stopOpacity="0.05" />
            </linearGradient>
            <linearGradient
              gradientUnits="userSpaceOnUse"
              id="tl_ft_face"
              x1="24.381"
              x2="24.381"
              y1="177.501"
              y2="-15122.5"
            >
              <stop stopColor="white" stopOpacity="0.12" />
              <stop offset="0.5" stopColor="white" stopOpacity="0.03" />
              <stop offset="1" stopColor="white" stopOpacity="0" />
            </linearGradient>
            <linearGradient
              gradientUnits="userSpaceOnUse"
              id="tl_ft_topHL"
              x1="24.307"
              x2="24.307"
              y1="7.501"
              y2="1497.35"
            >
              <stop stopColor="white" stopOpacity="0.12" />
              <stop offset="0.5" stopColor="white" stopOpacity="0.03" />
              <stop offset="1" stopColor="white" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
}

// ─── Auto Schema Block (right isometric cube) ───────────────────
function AutoSchemaBlock() {
  return (
    <div
      className="absolute"
      style={{ left: 614.5 + XO, top: 124, width: 144, height: 139 }}
    >
      <div className="absolute inset-[-0.71%_-1.26%_-0.56%_-0.55%]">
        <svg
          className="block size-full"
          fill="none"
          preserveAspectRatio="none"
          viewBox="0 0 146.614 141.063"
        >
          <path
            d={svgPaths.p1ac1c000}
            fill="url(#tl_as_top)"
            stroke="white"
            strokeOpacity="0.9"
            strokeWidth="1.979"
          />
          <path
            d={svgPaths.p1d972780}
            fill="url(#tl_as_front)"
            stroke="white"
            strokeWidth="1.565"
          />
          <path d={svgPaths.p296a8040} fill="url(#tl_as_face)" />
          <path d={svgPaths.p4060f00} fill="url(#tl_as_topHL)" />
          <path
            d={svgPaths.p17dda4f0}
            fill="#0F0F0F"
            fillOpacity="0.8"
            stroke="white"
            strokeOpacity="0.6"
            strokeWidth="1.959"
          />
          {/* Schema lines */}
          <path
            d="M34.796 60.645H59.943"
            stroke="white"
            strokeOpacity="0.35"
            strokeWidth="1.945"
          />
          <path
            d="M34.796 80.095H71.696"
            stroke="white"
            strokeOpacity="0.35"
            strokeWidth="1.945"
          />
          <path
            d="M34.796 99.545H86.178"
            stroke="white"
            strokeOpacity="0.35"
            strokeWidth="1.945"
          />
          <defs>
            <linearGradient
              gradientUnits="userSpaceOnUse"
              id="tl_as_top"
              x1="-17.39"
              x2="-17.39"
              y1="-33.76"
              y2="8674.84"
            >
              <stop stopColor="#9E1658" />
              <stop offset="1" stopColor="#0D0D0D" />
            </linearGradient>
            <linearGradient
              gradientUnits="userSpaceOnUse"
              id="tl_as_front"
              x1="-15.141"
              x2="-15.141"
              y1="179.823"
              y2="-19294.8"
            >
              <stop stopColor="#FF1A88" stopOpacity="0.6" />
              <stop offset="0.5" stopColor="#FF1A88" stopOpacity="0.3" />
              <stop offset="1" stopColor="#FF1A88" stopOpacity="0.05" />
            </linearGradient>
            <linearGradient
              gradientUnits="userSpaceOnUse"
              id="tl_as_face"
              x1="17.516"
              x2="17.516"
              y1="139.498"
              y2="-11834.4"
            >
              <stop stopColor="white" stopOpacity="0.12" />
              <stop offset="0.5" stopColor="white" stopOpacity="0.03" />
              <stop offset="1" stopColor="white" stopOpacity="0" />
            </linearGradient>
            <linearGradient
              gradientUnits="userSpaceOnUse"
              id="tl_as_topHL"
              x1="17.496"
              x2="17.496"
              y1="6.027"
              y2="1214.73"
            >
              <stop stopColor="white" stopOpacity="0.12" />
              <stop offset="0.5" stopColor="white" stopOpacity="0.03" />
              <stop offset="1" stopColor="white" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
}

// ─── Connection Curve (rainbow gradient dashed) ─────────────────
function ConnectionCurve() {
  return (
    <div
      className="absolute"
      style={{ left: 196 + XO, top: 123.23, width: 418, height: 95 }}
    >
      <div className="absolute inset-[11.82%_-0.12%_9.24%_-0.11%]">
        <svg
          className="block size-full"
          fill="none"
          preserveAspectRatio="none"
          viewBox="0 0 418.959 74.9952"
        >
          <path
            d={svgPaths.pe652a98}
            stroke="url(#tl_curve)"
            strokeDasharray="4 4"
            strokeWidth="2"
          />
          <defs>
            <linearGradient
              gradientUnits="userSpaceOnUse"
              id="tl_curve"
              x1="0.469"
              x2="418.469"
              y1="36.275"
              y2="36.275"
            >
              <stop stopColor="#12C2E9" />
              <stop offset="0.5" stopColor="#C471ED" />
              <stop offset="1" stopColor="#F64F59" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
}

// ─── Pink Union Shapes (diamond decorations) ─────────────────────
function PinkUnionShapes() {
  return (
    <>
      {/* Large union */}
      <div
        className="absolute"
        style={{
          left: 338.17 + XO,
          top: 180.79,
          width: 244.65,
          height: 166.77,
        }}
      >
        <svg
          className="block size-full"
          fill="none"
          preserveAspectRatio="none"
          viewBox="0 0 244.649 166.772"
        >
          <path d={svgPaths.p21b7a500} fill="#FF5CAA" />
        </svg>
      </div>
      {/* Small union */}
      <div
        className="absolute"
        style={{ left: 348.6 + XO, top: 176.7, width: 55.06, height: 88.07 }}
      >
        <svg
          className="block size-full"
          fill="none"
          preserveAspectRatio="none"
          viewBox="0 0 55.0586 88.0674"
        >
          <path d={svgPaths.p108b1200} fill="#FF5CAA" />
        </svg>
      </div>
    </>
  );
}

// ─── Highlight Outline (around Agent Core) ──────────────────────
function HighlightOutline() {
  return (
    <div
      className="absolute"
      style={{ left: 333 + XO, top: 98.31, width: 197.213, height: 165.404 }}
    >
      <div className="absolute inset-[-0.42%_-0.19%_-0.55%_-0.19%]">
        <svg
          className="block size-full"
          fill="none"
          preserveAspectRatio="none"
          viewBox="0 0 197.967 167.01"
        >
          <path d={svgPaths.p204f0c80} stroke="#FFB3D7" strokeWidth="1.59" />
        </svg>
      </div>
    </div>
  );
}

// ─── Status Dots (between blocks) ────────────────────────────────
function StatusDots() {
  return (
    <div
      className="absolute"
      style={{ left: 194 + XO, top: 168.3, width: 427, height: 39.9 }}
    >
      <svg
        className="block size-full"
        fill="none"
        preserveAspectRatio="none"
        viewBox="0 0 427 39.9"
      >
        {/* Left white dot */}
        <path d={svgPaths.p35152780} fill="white" fillOpacity="0.5" />
        {/* Pink dot */}
        <path d={svgPaths.p279b0000} fill="#FF1A88" fillOpacity="0.8" />
        {/* Right white dot */}
        <path d={svgPaths.p305d600} fill="white" fillOpacity="0.5" />
        {/* Green dot */}
        <path d={svgPaths.p2f138e00} fill="#00FF88" fillOpacity="0.8" />
      </svg>
    </div>
  );
}

// ─── Agent Core Stacking Layers ─────────────────────────────────
// Position in canvas: left=333, top=43.23, size=197.213×249.697

const STACK_LAYERS = [
  {
    // Layer 0 (bottom): arrives first, departs last
    paths: ["p30a40100", "p31aa8cf0", "pa5f6600"] as const,
    y: [50, 50, 0, 0, 0, -25, 50],
    opacity: [0.4, 0.4, 1, 1, 1, 0.4, 0.4],
    times: [0, 0.02, 0.09, 0.3, 0.91, 0.98, 1],
  },
  {
    // Layer 1 (middle lower)
    paths: ["p3db071f0", "p7b59900", "p23d6e400"] as const,
    y: [35, 35, 0, 0, 0, -20, 35],
    opacity: [0.4, 0.4, 1, 1, 1, 0.4, 0.4],
    times: [0, 0.09, 0.16, 0.3, 0.84, 0.91, 1],
  },
  {
    // Layer 2 (middle upper)
    paths: ["p12d44ef0", "p364fb6c0", "p1f1a6680"] as const,
    y: [22, 22, 0, 0, 0, -14, 22],
    opacity: [0.4, 0.4, 1, 1, 1, 0.4, 0.4],
    times: [0, 0.16, 0.23, 0.3, 0.77, 0.84, 1],
  },
];

// Top pink layer (arrives last, departs first)
const TOP_LAYER = {
  y: [12, 12, 0, 0, 0, -10, 12],
  opacity: [1, 1, 1, 1, 1, 1, 1],
  times: [0, 0.23, 0.3, 0.5, 0.7, 0.77, 1],
};

function AgentCoreStack() {
  return (
    <div
      className="absolute"
      style={{ left: 333 + XO, top: 43.23, width: 197.213, height: 249.697 }}
    >
      {/* Dark stacking layers */}
      {STACK_LAYERS.map((layer, i) => (
        <motion.div
          key={i}
          className="absolute inset-0"
          animate={{ y: layer.y, opacity: layer.opacity }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
            times: layer.times,
            repeatDelay: 0.5,
          }}
        >
          <svg
            className="block size-full"
            fill="none"
            preserveAspectRatio="none"
            viewBox="0 0 197.213 249.697"
          >
            {layer.paths.map((key, j) => (
              <path key={j} d={svgPaths[key]} fill="#431D30" />
            ))}
          </svg>
        </motion.div>
      ))}

      {/* Top pink layer with AGENT text */}
      <motion.div
        className="absolute inset-0"
        animate={{ y: TOP_LAYER.y, opacity: TOP_LAYER.opacity }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
          times: TOP_LAYER.times,
          repeatDelay: 0.5,
        }}
      >
        <svg
          className="block size-full"
          fill="none"
          preserveAspectRatio="none"
          viewBox="0 0 197.213 249.697"
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
      </motion.div>
    </div>
  );
}

// ─── Data Flow Overlay ───────────────────────────────────────────
function DataFlowOverlay() {
  // Precise curve path in canvas coordinates (left → right), X shifted by XO (-40)
  const curvePathLR =
    "M 157,180 L 205,206 C 217,212 232,206 237,193 L 246,165 C 250,151 269,151 275,164 C 280,178 300,177 304,163 L 307,150 C 310,141 318,135 328,136 L 451,145 C 458,146 465,150 468,157 L 478,176 C 486,192 508,191 516,176 C 521,165 534,161 545,167 L 575,184";

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      viewBox={`0 0 ${CW} ${CH}`}
      preserveAspectRatio="none"
      style={{ zIndex: 8, width: CW, height: CH }}
    >
      <defs>
        <filter id="tlPktGlow" x="-200%" y="-200%" width="500%" height="500%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <radialGradient id="tlPulseGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FF1A88" stopOpacity="0.2" />
          <stop offset="60%" stopColor="#FF1A88" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#FF1A88" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Pulse waves from Agent Core center */}
      <circle
        cx={431 + XO}
        cy="130"
        r="15"
        fill="url(#tlPulseGrad)"
        opacity="0"
      >
        <animate
          attributeName="r"
          values="15;65"
          dur="3.5s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="opacity"
          values="0.5;0"
          dur="3.5s"
          repeatCount="indefinite"
        />
      </circle>
      <circle
        cx={431 + XO}
        cy="130"
        r="15"
        fill="url(#tlPulseGrad)"
        opacity="0"
      >
        <animate
          attributeName="r"
          values="15;65"
          dur="3.5s"
          begin="1.75s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="opacity"
          values="0.35;0"
          dur="3.5s"
          begin="1.75s"
          repeatCount="indefinite"
        />
      </circle>

      {/* Data packets along curve (left → right) */}
      {["0s", "2s"].map((delay, di) => (
        <g key={`lr-${di}`} filter="url(#tlPktGlow)">
          <circle
            r="5"
            fill="none"
            stroke="#C471ED"
            strokeWidth="1"
            opacity="0.3"
          >
            <animateMotion
              dur="4s"
              begin={delay}
              repeatCount="indefinite"
              path={curvePathLR}
              rotate="auto"
            />
          </circle>
          <circle r="2" fill="#C471ED" opacity="0.8">
            <animateMotion
              dur="4s"
              begin={delay}
              repeatCount="indefinite"
              path={curvePathLR}
              rotate="auto"
            />
          </circle>
          <circle r="0.8" fill="#E8D0FF" opacity="1">
            <animateMotion
              dur="4s"
              begin={delay}
              repeatCount="indefinite"
              path={curvePathLR}
              rotate="auto"
            />
          </circle>
        </g>
      ))}

      {/* Data packets along curve (right → left) */}
      {["1s", "3s"].map((delay, di) => (
        <g key={`rl-${di}`} filter="url(#tlPktGlow)">
          <circle
            r="4"
            fill="none"
            stroke="#12C2E9"
            strokeWidth="1"
            opacity="0.25"
          >
            <animateMotion
              dur="4.5s"
              begin={delay}
              repeatCount="indefinite"
              path={curvePathLR}
              rotate="auto"
              keyPoints="1;0"
              keyTimes="0;1"
            />
          </circle>
          <circle r="1.5" fill="#12C2E9" opacity="0.8">
            <animateMotion
              dur="4.5s"
              begin={delay}
              repeatCount="indefinite"
              path={curvePathLR}
              rotate="auto"
              keyPoints="1;0"
              keyTimes="0;1"
            />
          </circle>
        </g>
      ))}

      {/* Endpoint glow halos */}
      {[
        { cx: 156, cy: 169, color: "#12C2E9" },
        { cx: 391, cy: 130, color: "#FF1A88" },
        { cx: 574, cy: 148, color: "#F64F59" },
      ].map((pt, i) => (
        <circle
          key={`halo-${i}`}
          cx={pt.cx}
          cy={pt.cy}
          r="6"
          fill="none"
          stroke={pt.color}
          strokeWidth="1"
          opacity="0"
        >
          <animate
            attributeName="opacity"
            values="0;0.35;0"
            dur={`${3 + i * 0.4}s`}
            repeatCount="indefinite"
          />
          <animate
            attributeName="r"
            values="4;14;4"
            dur={`${3 + i * 0.4}s`}
            repeatCount="indefinite"
          />
        </circle>
      ))}
    </svg>
  );
}

// ─── Main Illustration ───────────────────────────────────────────
export function ToolingIllustration() {
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
      transition={{ duration: 1.2 }}
      className="w-full flex items-center justify-center"
    >
      <div
        ref={containerRef}
        className="relative w-full max-w-[700px] aspect-[752/526]"
      >
        {/* Ambient particle field */}
        <ParticleCanvas />

        {/* Ambient radial glow behind Agent Core */}
        <motion.div
          className="absolute pointer-events-none"
          style={{
            left: "53%",
            top: "38%",
            width: "200px",
            height: "200px",
            transform: "translate(-50%, -50%)",
            background:
              "radial-gradient(circle, rgba(255,26,136,0.12) 0%, rgba(255,26,136,0.04) 40%, transparent 70%)",
            borderRadius: "50%",
            zIndex: 1,
          }}
          animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Scaled canvas (806×437 native, centered vertically in taller container) */}
        <div
          className="absolute left-0 origin-top-left overflow-visible"
          style={{
            width: CW,
            height: CH,
            transform: `scale(${scale})`,
            top: `${(((scale * 526) / 752) * CW - scale * CH) / 2}px`,
          }}
        >
          {/* Rainbow gradient connection curve — always visible */}
          <div className="absolute inset-0" style={{ zIndex: 2 }}>
            <ConnectionCurve />
          </div>

          {/* Pink union shapes / diamond decorations — always visible */}
          <div className="absolute inset-0" style={{ zIndex: 2 }}>
            <PinkUnionShapes />
          </div>

          {/* Highlight outline around Agent Core — always visible */}
          <div className="absolute inset-0" style={{ zIndex: 2 }}>
            <HighlightOutline />
          </div>

          {/* Status dots (pink, green, white) — always visible */}
          <div className="absolute inset-0" style={{ zIndex: 3 }}>
            <StatusDots />
          </div>

          {/* Function Tools block — Lissajous floating */}
          <motion.div
            className="absolute inset-0"
            style={{ zIndex: 4 }}
            animate={{
              x: [0, 3, -2, 4, 0],
              y: [0, -4, 2, -6, 0],
              scale: [1, 1.006, 0.998, 1.004, 1],
              rotateZ: [0, 0.3, -0.15, 0.45, 0],
            }}
            transition={{
              duration: 11,
              repeat: Infinity,
              ease: "easeInOut",
              times: [0, 0.25, 0.5, 0.75, 1],
            }}
          >
            <FunctionToolsBlock />
            {/* Label */}
            <p
              className="absolute font-['Geist_Mono:Regular',sans-serif] font-normal text-[12.642px] text-[rgba(255,255,255,0.5)] whitespace-nowrap"
              style={{ left: 88.5 + XO, top: 42.4 }}
            >
              Function Tools
            </p>
          </motion.div>

          {/* Auto Schema block — Lissajous floating (offset phase) */}
          <motion.div
            className="absolute inset-0"
            style={{ zIndex: 4 }}
            animate={{
              x: [0, -2, 3, -4, 0],
              y: [0, -5, 1, -3, 0],
              scale: [1, 1.005, 0.997, 1.003, 1],
              rotateZ: [0, -0.25, 0.2, -0.4, 0],
            }}
            transition={{
              duration: 12,
              repeat: Infinity,
              ease: "easeInOut",
              times: [0, 0.25, 0.5, 0.75, 1],
            }}
          >
            <AutoSchemaBlock />
            {/* Label */}
            <p
              className="absolute font-['Geist_Mono:Regular',sans-serif] font-normal text-[12.642px] text-[rgba(255,255,255,0.5)] whitespace-nowrap"
              style={{ left: 653.25 + XO, top: 90.6 }}
            >
              Auto Schema
            </p>
          </motion.div>

          {/* Agent Core stacking layers */}
          <div className="absolute inset-0" style={{ zIndex: 5 }}>
            <AgentCoreStack />
            {/* Agent Core label — rides with top layer timing */}
            <motion.p
              className="absolute font-['Geist_Mono:Regular',sans-serif] font-normal text-[12.642px] text-[rgba(255,255,255,0.5)] whitespace-nowrap"
              style={{ left: 394 + XO, top: 87.2 }}
              animate={{ y: TOP_LAYER.y, opacity: TOP_LAYER.opacity }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: "easeInOut",
                times: TOP_LAYER.times,
                repeatDelay: 0.5,
              }}
            >
              Agent Core
            </motion.p>
          </div>

          {/* Data flow overlay */}
          <DataFlowOverlay />

          {/* Bottom description text */}
          <p
            className="absolute font-['Geist_Mono:Regular',sans-serif] font-normal text-[12.642px] text-[rgba(255,255,255,0.35)] text-center whitespace-nowrap"
            style={{
              left: 404.5 + XO,
              top: 385,
              transform: "translateX(-50%)",
              zIndex: 3,
            }}
          >
            Automatic schema inference for function calling
          </p>
        </div>

        {/* Subtle horizontal scan line */}
        <motion.div
          className="absolute inset-x-0 pointer-events-none"
          style={{
            height: "1px",
            background:
              "linear-gradient(90deg, transparent 0%, rgba(196,113,237,0.12) 20%, rgba(255,26,136,0.2) 50%, rgba(196,113,237,0.12) 80%, transparent 100%)",
            zIndex: 10,
          }}
          animate={{
            top: ["0%", "100%"],
            opacity: [0, 0.5, 0.5, 0],
          }}
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
