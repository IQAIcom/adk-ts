import { motion } from "motion/react";
import { useRef, useEffect } from "react";
import svgPaths from "./imports/svg-qnsv4ff7ba";

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
      color: "pink" | "blue" | "green" | "white";
      phase: number;
      speed: number;
    }

    const particles: Particle[] = [];
    for (let i = 0; i < 55; i++) {
      const rng = Math.random();
      let color: Particle["color"] = "white";
      if (rng > 0.85) color = "pink";
      else if (rng > 0.78) color = "blue";
      else if (rng > 0.71) color = "green";

      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.12,
        size: Math.random() * 1.6 + 0.3,
        baseAlpha: Math.random() * 0.25 + 0.05,
        color,
        phase: Math.random() * Math.PI * 2,
        speed: 0.004 + Math.random() * 0.008,
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

        const colorMap = {
          pink: `rgba(255,26,136,${alpha})`,
          blue: `rgba(100,200,255,${alpha})`,
          green: `rgba(0,255,136,${alpha})`,
          white: `rgba(255,255,255,${alpha * 0.5})`,
        };
        const glowMap = {
          pink: `rgba(255,26,136,${alpha * 0.12})`,
          blue: `rgba(100,200,255,${alpha * 0.12})`,
          green: `rgba(0,255,136,${alpha * 0.12})`,
          white: "",
        };

        if (p.color !== "white") {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 4, 0, Math.PI * 2);
          ctx.fillStyle = glowMap[p.color];
          ctx.fill();
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = colorMap[p.color];
        ctx.fill();
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

// ─── Gemini Block (left) ─────────────────────────────────────────
function GeminiBlock() {
  return (
    <motion.div
      className="absolute inset-0"
      animate={{
        y: [0, -6, 3, -8, 0],
        x: [0, 2, -1, 3, 0],
        scale: [1, 1.01, 0.997, 1.008, 1],
        rotateZ: [0, 0.5, -0.3, 0.8, 0],
      }}
      transition={{
        duration: 9,
        repeat: Infinity,
        ease: "easeInOut",
        times: [0, 0.25, 0.5, 0.75, 1],
      }}
    >
      {/* Side face with gradient highlight */}
      <div className="absolute flex inset-[43.15%_89.44%_32.65%_0.93%] items-center justify-center">
        <div className="-scale-y-100 flex-none h-[120px] w-[72.5px]">
          <div className="relative size-full">
            <div className="absolute inset-[-0.71%_-0.69%]">
              <svg
                className="block size-full"
                fill="none"
                preserveAspectRatio="none"
                viewBox="0 0 73.5 121.699"
              >
                <path
                  d={svgPaths.pcf2f700}
                  fill="url(#paint_gemini_side)"
                  fillOpacity="0.4"
                  stroke="white"
                  strokeOpacity="0.2"
                />
                <defs>
                  <linearGradient
                    gradientUnits="userSpaceOnUse"
                    id="paint_gemini_side"
                    x1="-0.5"
                    x2="-0.5"
                    y1="23.852"
                    y2="9573.85"
                  >
                    <stop stopColor="#9E1658" />
                    <stop offset="1" stopColor="#0D0D0D" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>
        </div>
      </div>
      {/* Top face filled */}
      <div className="absolute inset-[34.18%_79.28%_48.88%_0.8%]">
        <div className="absolute inset-[-1.34%]">
          <svg
            className="block size-full"
            fill="none"
            preserveAspectRatio="none"
            viewBox="0 0 154.022 86.2521"
          >
            <path
              d={svgPaths.p2ebafa00}
              fill="url(#paint_gemini_top)"
              stroke="white"
              strokeOpacity="0.9"
              strokeWidth="1.96497"
            />
            <defs>
              <linearGradient
                gradientUnits="userSpaceOnUse"
                id="paint_gemini_top"
                x1="2.01"
                x2="2.01"
                y1="1.13"
                y2="8401"
              >
                <stop stopColor="#9E1658" />
                <stop offset="1" stopColor="#0D0D0D" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>
      {/* Top face outline */}
      <div className="absolute inset-[34.18%_79.36%_49.09%_0.8%]">
        <div className="absolute inset-[-1.14%]">
          <svg
            className="block size-full"
            fill="none"
            preserveAspectRatio="none"
            viewBox="0 0 152.818 84.899"
          >
            <path
              d={svgPaths.p4224b80}
              fill="#0A0A0A"
              fillOpacity="0.6"
              stroke="white"
              strokeOpacity="0.4"
              strokeWidth="1.66"
            />
          </svg>
        </div>
      </div>
      {/* Left face pink highlight */}
      <div className="absolute inset-[42.55%_89.28%_32.35%_0.8%]">
        <div className="absolute inset-[-1.13%_-1.11%]">
          <svg
            className="block size-full"
            fill="none"
            preserveAspectRatio="none"
            viewBox="0 0 76.36 127.321"
          >
            <path
              d={svgPaths.p3548c7f0}
              fill="url(#paint_gemini_left)"
              stroke="white"
              strokeOpacity="0.4"
              strokeWidth="1.66"
            />
            <defs>
              <linearGradient
                gradientUnits="userSpaceOnUse"
                id="paint_gemini_left"
                x1="0.83"
                x2="0.83"
                y1="1.41"
                y2="12451"
              >
                <stop stopColor="#FF1A88" stopOpacity="0.6" />
                <stop offset="0.5" stopColor="#FF1A88" stopOpacity="0.3" />
                <stop offset="1" stopColor="#FF1A88" stopOpacity="0.05" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>
      {/* Front face light overlay */}
      <div className="absolute flex inset-[43.96%_89.44%_32.65%_2.06%] items-center justify-center">
        <div className="-scale-y-100 flex-none h-[116px] w-[64px]">
          <div className="relative size-full">
            <svg
              className="block size-full"
              fill="none"
              preserveAspectRatio="none"
              viewBox="0 0 64 116"
            >
              <path
                d="M64 80V0L0 35.5V116L64 80Z"
                fill="url(#paint_gemini_front)"
              />
              <defs>
                <linearGradient
                  gradientUnits="userSpaceOnUse"
                  id="paint_gemini_front"
                  x1="-1.33"
                  x2="-1.33"
                  y1="0"
                  y2="11600"
                >
                  <stop stopColor="white" stopOpacity="0.12" />
                  <stop offset="0.5" stopColor="white" stopOpacity="0.03" />
                  <stop offset="1" stopColor="white" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>
      </div>
      {/* Right face dark */}
      <div className="absolute inset-[42.55%_79.36%_32.35%_10.72%]">
        <div className="absolute inset-[-1.13%_-1.11%]">
          <svg
            className="block size-full"
            fill="none"
            preserveAspectRatio="none"
            viewBox="0 0 76.36 127.321"
          >
            <g>
              <path d={svgPaths.p8566500} fill="#0D0D0D" fillOpacity="0.6" />
              <path d={svgPaths.p8566500} fill="url(#paint_gemini_right)" />
              <path
                d={svgPaths.p8566500}
                stroke="white"
                strokeOpacity="0.4"
                strokeWidth="1.66"
              />
            </g>
            <defs>
              <linearGradient
                gradientUnits="userSpaceOnUse"
                id="paint_gemini_right"
                x1="0.83"
                x2="0.83"
                y1="1.41"
                y2="12451"
              >
                <stop stopColor="#191410" />
                <stop offset="1" stopColor="#120E0B" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>
      {/* Top face highlight */}
      <div className="absolute inset-[36.36%_80.94%_49.29%_2.26%]">
        <svg
          className="block size-full"
          fill="none"
          preserveAspectRatio="none"
          viewBox="0 0 126.5 71.21"
        >
          <path d={svgPaths.p36c67c80} fill="url(#paint_gemini_hl)" />
          <defs>
            <linearGradient
              gradientUnits="userSpaceOnUse"
              id="paint_gemini_hl"
              x1="-2.63"
              x2="-2.63"
              y1="0"
              y2="7121"
            >
              <stop stopColor="white" stopOpacity="0.12" />
              <stop offset="0.5" stopColor="white" stopOpacity="0.03" />
              <stop offset="1" stopColor="white" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      <p className="absolute font-['Geist_Mono:Regular',sans-serif] font-normal inset-[44.06%_86.72%_53.12%_8.1%] leading-[normal] text-[10.742px] text-[rgba(255,255,255,0.6)] text-center">
        Gemini
      </p>
    </motion.div>
  );
}

// ─── OpenAI Block (right) ────────────────────────────────────────
function OpenAIBlock() {
  return (
    <motion.div
      className="absolute inset-0"
      animate={{
        y: [0, 7, -4, 9, 0],
        x: [0, -3, 1, -2, 0],
        scale: [1, 0.995, 1.01, 0.998, 1],
        rotateZ: [0, -0.7, 0.4, -1.0, 0],
      }}
      transition={{
        duration: 10,
        repeat: Infinity,
        ease: "easeInOut",
        times: [0, 0.25, 0.5, 0.75, 1],
      }}
    >
      {/* Side face with gradient highlight */}
      <div className="absolute flex inset-[40.73%_13.8%_35.07%_76.57%] items-center justify-center">
        <div className="-scale-y-100 flex-none h-[120px] w-[72.5px]">
          <div className="relative size-full">
            <div className="absolute inset-[-0.71%_-0.69%]">
              <svg
                className="block size-full"
                fill="none"
                preserveAspectRatio="none"
                viewBox="0 0 73.5 121.699"
              >
                <path
                  d={svgPaths.pcf2f700}
                  fill="url(#paint_openai_side)"
                  fillOpacity="0.4"
                  stroke="white"
                  strokeOpacity="0.2"
                />
                <defs>
                  <linearGradient
                    gradientUnits="userSpaceOnUse"
                    id="paint_openai_side"
                    x1="-0.5"
                    x2="-0.5"
                    y1="23.852"
                    y2="9573.85"
                  >
                    <stop stopColor="#9E1658" />
                    <stop offset="1" stopColor="#0D0D0D" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>
        </div>
      </div>
      {/* Top face filled */}
      <div className="absolute inset-[31.76%_3.64%_51.3%_76.44%]">
        <div className="absolute inset-[-1.34%]">
          <svg
            className="block size-full"
            fill="none"
            preserveAspectRatio="none"
            viewBox="0 0 154.022 86.2521"
          >
            <path
              d={svgPaths.p2ebafa00}
              fill="url(#paint_openai_top)"
              stroke="white"
              strokeOpacity="0.9"
              strokeWidth="1.96497"
            />
            <defs>
              <linearGradient
                gradientUnits="userSpaceOnUse"
                id="paint_openai_top"
                x1="2.01"
                x2="2.01"
                y1="1.13"
                y2="8401"
              >
                <stop stopColor="#9E1658" />
                <stop offset="1" stopColor="#0D0D0D" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>
      {/* Top face outline */}
      <div className="absolute inset-[31.76%_3.72%_51.51%_76.44%]">
        <div className="absolute inset-[-1.14%]">
          <svg
            className="block size-full"
            fill="none"
            preserveAspectRatio="none"
            viewBox="0 0 152.818 84.899"
          >
            <path
              d={svgPaths.p4224b80}
              fill="#0A0A0A"
              fillOpacity="0.6"
              stroke="white"
              strokeOpacity="0.4"
              strokeWidth="1.66"
            />
          </svg>
        </div>
      </div>
      {/* Left face pink highlight */}
      <div className="absolute inset-[40.13%_13.64%_34.77%_76.44%]">
        <div className="absolute inset-[-1.13%_-1.11%]">
          <svg
            className="block size-full"
            fill="none"
            preserveAspectRatio="none"
            viewBox="0 0 76.36 127.321"
          >
            <path
              d={svgPaths.p3548c7f0}
              fill="url(#paint_openai_left)"
              stroke="white"
              strokeOpacity="0.4"
              strokeWidth="1.66"
            />
            <defs>
              <linearGradient
                gradientUnits="userSpaceOnUse"
                id="paint_openai_left"
                x1="0.83"
                x2="0.83"
                y1="1.41"
                y2="12451"
              >
                <stop stopColor="#FF1A88" stopOpacity="0.6" />
                <stop offset="0.5" stopColor="#FF1A88" stopOpacity="0.3" />
                <stop offset="1" stopColor="#FF1A88" stopOpacity="0.05" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>
      {/* Front face light overlay */}
      <div className="absolute flex inset-[41.54%_13.8%_35.07%_77.7%] items-center justify-center">
        <div className="-scale-y-100 flex-none h-[116px] w-[64px]">
          <div className="relative size-full">
            <svg
              className="block size-full"
              fill="none"
              preserveAspectRatio="none"
              viewBox="0 0 64 116"
            >
              <path
                d="M64 80V0L0 35.5V116L64 80Z"
                fill="url(#paint_openai_front)"
              />
              <defs>
                <linearGradient
                  gradientUnits="userSpaceOnUse"
                  id="paint_openai_front"
                  x1="-1.33"
                  x2="-1.33"
                  y1="0"
                  y2="11600"
                >
                  <stop stopColor="white" stopOpacity="0.12" />
                  <stop offset="0.5" stopColor="white" stopOpacity="0.03" />
                  <stop offset="1" stopColor="white" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>
      </div>
      {/* Right face dark */}
      <div className="absolute inset-[40.13%_3.72%_34.77%_86.36%]">
        <div className="absolute inset-[-1.13%_-1.11%]">
          <svg
            className="block size-full"
            fill="none"
            preserveAspectRatio="none"
            viewBox="0 0 76.36 127.321"
          >
            <g>
              <path d={svgPaths.p8566500} fill="#0D0D0D" fillOpacity="0.6" />
              <path d={svgPaths.p8566500} fill="url(#paint_openai_right)" />
              <path
                d={svgPaths.p8566500}
                stroke="white"
                strokeOpacity="0.4"
                strokeWidth="1.66"
              />
            </g>
            <defs>
              <linearGradient
                gradientUnits="userSpaceOnUse"
                id="paint_openai_right"
                x1="0.83"
                x2="0.83"
                y1="1.41"
                y2="12451"
              >
                <stop stopColor="#191410" />
                <stop offset="1" stopColor="#120E0B" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>
      {/* Top face highlight */}
      <div className="absolute inset-[33.94%_5.3%_51.71%_77.9%]">
        <svg
          className="block size-full"
          fill="none"
          preserveAspectRatio="none"
          viewBox="0 0 126.5 71.21"
        >
          <path d={svgPaths.p36c67c80} fill="url(#paint_openai_hl)" />
          <defs>
            <linearGradient
              gradientUnits="userSpaceOnUse"
              id="paint_openai_hl"
              x1="-2.63"
              x2="-2.63"
              y1="0"
              y2="7121"
            >
              <stop stopColor="white" stopOpacity="0.12" />
              <stop offset="0.5" stopColor="white" stopOpacity="0.03" />
              <stop offset="1" stopColor="white" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      <p className="absolute font-['Geist_Mono:Regular',sans-serif] font-normal inset-[41.64%_11.08%_55.54%_83.74%] leading-[normal] text-[10.742px] text-[rgba(255,255,255,0.6)] text-center">
        OpenAI
      </p>
    </motion.div>
  );
}

// ─── Agent Router Center (static shells) ─────────────────────────
function AgentRouterShells() {
  return (
    <div className="absolute contents">
      {/* Shadow/base pink union shape */}
      <div
        className="absolute h-[166.772px] left-[256.17px] top-[180.56px] w-[244.649px]"
        data-name="Union"
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
      {/* Side union */}
      <div
        className="absolute h-[88.067px] left-[266.6px] top-[176.47px] w-[55.059px]"
        data-name="Union"
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
      {/* Highlight stroke */}
      <div
        className="absolute h-[165.404px] left-[251px] top-[98.07px] w-[197.213px]"
        data-name="Highlight"
      >
        <div className="absolute inset-[-0.42%_-0.19%_-0.55%_-0.19%]">
          <svg
            className="block size-full"
            fill="none"
            preserveAspectRatio="none"
            viewBox="0 0 197.967 167.01"
          >
            <path
              d={svgPaths.p204f0c80}
              stroke="#FFB3D7"
              strokeWidth="1.59043"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}

// ─── Connection path definitions ─────────────────────────────────
const CONN_PATHS = {
  // Gemini (left) → Agent Router (center)
  gemini: "M 65 220 C 120 215 180 200 230 180 C 270 164 310 155 350 150",
  // OpenAI (right) → Agent Router (center)
  openai: "M 690 200 C 640 198 580 195 530 180 C 490 168 450 158 405 150",
};

// ─── Data Flow Connection Overlay ────────────────────────────────
function DataFlowConnections() {
  return (
    <svg
      className="absolute inset-0 pointer-events-none w-full h-full"
      preserveAspectRatio="none"
      viewBox="0 0 753 496"
      style={{ zIndex: 5 }}
    >
      <defs>
        {/* Glow filter for data packets */}
        <filter
          id="mlPacketGlow"
          x="-200%"
          y="-200%"
          width="500%"
          height="500%"
        >
          <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Softer glow for connection lines */}
        <filter id="mlLineGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="4" />
        </filter>

        {/* Radial glow for pulse waves */}
        <radialGradient id="mlPulseGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FF1A88" stopOpacity="0.25" />
          <stop offset="60%" stopColor="#FF1A88" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#FF1A88" stopOpacity="0" />
        </radialGradient>

        {/* Animated sweep gradient – blue (Gemini) */}
        <linearGradient id="mlFlowGemini">
          <stop offset="0%" stopColor="#64C8FF" stopOpacity="0">
            <animate
              attributeName="offset"
              values="-0.3;1.3"
              dur="4s"
              repeatCount="indefinite"
            />
          </stop>
          <stop offset="15%" stopColor="#64C8FF" stopOpacity="0.6">
            <animate
              attributeName="offset"
              values="-0.15;1.45"
              dur="4s"
              repeatCount="indefinite"
            />
          </stop>
          <stop offset="30%" stopColor="#64C8FF" stopOpacity="0">
            <animate
              attributeName="offset"
              values="0;1.6"
              dur="4s"
              repeatCount="indefinite"
            />
          </stop>
        </linearGradient>

        {/* Animated sweep gradient – green (OpenAI) */}
        <linearGradient id="mlFlowOpenAI">
          <stop offset="0%" stopColor="#00FF88" stopOpacity="0">
            <animate
              attributeName="offset"
              values="-0.3;1.3"
              dur="4.5s"
              repeatCount="indefinite"
            />
          </stop>
          <stop offset="15%" stopColor="#00FF88" stopOpacity="0.6">
            <animate
              attributeName="offset"
              values="-0.15;1.45"
              dur="4.5s"
              repeatCount="indefinite"
            />
          </stop>
          <stop offset="30%" stopColor="#00FF88" stopOpacity="0">
            <animate
              attributeName="offset"
              values="0;1.6"
              dur="4.5s"
              repeatCount="indefinite"
            />
          </stop>
        </linearGradient>

        {/* Secondary sweep – blue */}
        <linearGradient id="mlFlowGemini2">
          <stop offset="0%" stopColor="#64C8FF" stopOpacity="0">
            <animate
              attributeName="offset"
              values="0.5;1.3;-0.3;0.5"
              dur="4s"
              repeatCount="indefinite"
            />
          </stop>
          <stop offset="15%" stopColor="#64C8FF" stopOpacity="0.35">
            <animate
              attributeName="offset"
              values="0.65;1.45;-0.15;0.65"
              dur="4s"
              repeatCount="indefinite"
            />
          </stop>
          <stop offset="30%" stopColor="#64C8FF" stopOpacity="0">
            <animate
              attributeName="offset"
              values="0.8;1.6;0;0.8"
              dur="4s"
              repeatCount="indefinite"
            />
          </stop>
        </linearGradient>

        {/* Secondary sweep – green */}
        <linearGradient id="mlFlowOpenAI2">
          <stop offset="0%" stopColor="#00FF88" stopOpacity="0">
            <animate
              attributeName="offset"
              values="0.5;1.3;-0.3;0.5"
              dur="4.5s"
              repeatCount="indefinite"
            />
          </stop>
          <stop offset="15%" stopColor="#00FF88" stopOpacity="0.35">
            <animate
              attributeName="offset"
              values="0.65;1.45;-0.15;0.65"
              dur="4.5s"
              repeatCount="indefinite"
            />
          </stop>
          <stop offset="30%" stopColor="#00FF88" stopOpacity="0">
            <animate
              attributeName="offset"
              values="0.8;1.6;0;0.8"
              dur="4.5s"
              repeatCount="indefinite"
            />
          </stop>
        </linearGradient>
      </defs>

      {/* ── Agent Router center pulse waves ── */}
      <circle cx="377" cy="145" r="20" fill="url(#mlPulseGrad)" opacity="0">
        <animate
          attributeName="r"
          values="20;80"
          dur="3.5s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="opacity"
          values="0.6;0"
          dur="3.5s"
          repeatCount="indefinite"
        />
      </circle>
      <circle cx="377" cy="145" r="20" fill="url(#mlPulseGrad)" opacity="0">
        <animate
          attributeName="r"
          values="20;80"
          dur="3.5s"
          begin="1.75s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="opacity"
          values="0.4;0"
          dur="3.5s"
          begin="1.75s"
          repeatCount="indefinite"
        />
      </circle>

      {/* ── Connection glow underlays ── */}
      <path
        d={CONN_PATHS.gemini}
        fill="none"
        stroke="#64C8FF"
        strokeWidth="8"
        strokeLinecap="round"
        opacity="0.04"
        filter="url(#mlLineGlow)"
      />
      <path
        d={CONN_PATHS.openai}
        fill="none"
        stroke="#00FF88"
        strokeWidth="8"
        strokeLinecap="round"
        opacity="0.04"
        filter="url(#mlLineGlow)"
      />

      {/* ── Base connection paths (static dotted) ── */}
      <path
        d={CONN_PATHS.gemini}
        fill="none"
        stroke="rgba(100,200,255,0.15)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray="5 4"
      />
      <path
        d={CONN_PATHS.openai}
        fill="none"
        stroke="rgba(0,255,136,0.15)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray="5 4"
      />

      {/* ── Primary gradient sweeps ── */}
      <path
        d={CONN_PATHS.gemini}
        fill="none"
        stroke="url(#mlFlowGemini)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="5 4"
      />
      <path
        d={CONN_PATHS.openai}
        fill="none"
        stroke="url(#mlFlowOpenAI)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="5 4"
      />

      {/* ── Secondary gradient sweeps ── */}
      <path
        d={CONN_PATHS.gemini}
        fill="none"
        stroke="url(#mlFlowGemini2)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray="5 4"
      />
      <path
        d={CONN_PATHS.openai}
        fill="none"
        stroke="url(#mlFlowOpenAI2)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray="5 4"
      />

      {/* ── Traveling data packets – Gemini (blue) ── */}
      {["0s", "2s"].map((delay, di) => (
        <g key={`gemini-packet-${di}`} filter="url(#mlPacketGlow)">
          <circle
            r="6"
            fill="none"
            stroke="#64C8FF"
            strokeWidth="1"
            opacity="0.3"
          >
            <animateMotion
              dur="3.5s"
              begin={delay}
              repeatCount="indefinite"
              path={CONN_PATHS.gemini}
              rotate="auto"
            />
          </circle>
          <circle r="2.5" fill="#64C8FF" opacity="0.9">
            <animateMotion
              dur="3.5s"
              begin={delay}
              repeatCount="indefinite"
              path={CONN_PATHS.gemini}
              rotate="auto"
            />
          </circle>
          <circle r="1" fill="#B8E8FF" opacity="1">
            <animateMotion
              dur="3.5s"
              begin={delay}
              repeatCount="indefinite"
              path={CONN_PATHS.gemini}
              rotate="auto"
            />
          </circle>
        </g>
      ))}

      {/* ── Traveling data packets – OpenAI (green) ── */}
      {["0.5s", "2.8s"].map((delay, di) => (
        <g key={`openai-packet-${di}`} filter="url(#mlPacketGlow)">
          <circle
            r="6"
            fill="none"
            stroke="#00FF88"
            strokeWidth="1"
            opacity="0.3"
          >
            <animateMotion
              dur="3.8s"
              begin={delay}
              repeatCount="indefinite"
              path={CONN_PATHS.openai}
              rotate="auto"
            />
          </circle>
          <circle r="2.5" fill="#00FF88" opacity="0.9">
            <animateMotion
              dur="3.8s"
              begin={delay}
              repeatCount="indefinite"
              path={CONN_PATHS.openai}
              rotate="auto"
            />
          </circle>
          <circle r="1" fill="#B8FFD8" opacity="1">
            <animateMotion
              dur="3.8s"
              begin={delay}
              repeatCount="indefinite"
              path={CONN_PATHS.openai}
              rotate="auto"
            />
          </circle>
        </g>
      ))}

      {/* ── Endpoint glow halos ── */}
      {[
        { cx: 65, cy: 220, color: "#64C8FF" },
        { cx: 690, cy: 200, color: "#00FF88" },
        { cx: 377, cy: 145, color: "#FF1A88" },
      ].map((pt, i) => (
        <circle
          key={`halo-${i}`}
          cx={pt.cx}
          cy={pt.cy}
          r="8"
          fill="none"
          stroke={pt.color}
          strokeWidth="1"
          opacity="0"
        >
          <animate
            attributeName="opacity"
            values="0;0.4;0"
            dur={`${3 + i * 0.5}s`}
            repeatCount="indefinite"
          />
          <animate
            attributeName="r"
            values="6;16;6"
            dur={`${3 + i * 0.5}s`}
            repeatCount="indefinite"
          />
        </circle>
      ))}

      {/* ── Left connection line dots (Figma-accurate) ── */}
      <g transform="translate(69, 163)">
        <svg
          viewBox="0 0 190.336 55.927"
          width="190.336"
          height="55.927"
          fill="none"
        >
          <path d={svgPaths.p18e16f80} fill="#64C8FF" fillOpacity="0.8" />
          <path d={svgPaths.p23c0e700} fill="#64C8FF" fillOpacity="0.8" />
        </svg>
      </g>

      {/* ── Right connection line dots (Figma-accurate, rotated) ── */}
      <g transform="translate(437, 152) rotate(-175.62)">
        <svg
          viewBox="0 0 139.754 58.927"
          width="139.754"
          height="58.927"
          fill="none"
        >
          <path d={svgPaths.p28d57d00} fill="#00FF88" fillOpacity="0.8" />
          <path d={svgPaths.p29718200} fill="#00FF88" fillOpacity="0.8" />
        </svg>
      </g>

      {/* ── Provider Labels ── */}
      <text
        x="57"
        y="370"
        fill="white"
        fillOpacity="0.5"
        fontFamily="'Geist Mono', monospace"
        fontSize="8.263"
        textAnchor="middle"
      >
        Provider 1
      </text>
      <text
        x="700"
        y="360"
        fill="white"
        fillOpacity="0.5"
        fontFamily="'Geist Mono', monospace"
        fontSize="8.263"
        textAnchor="middle"
      >
        Provider 2
      </text>

      {/* ── Multi-provider runtime label ── */}
      <text
        x="377"
        y="380"
        fill="white"
        fillOpacity="0.4"
        fontFamily="'Geist Mono', monospace"
        fontSize="9.916"
        textAnchor="middle"
      >
        Multi-provider runtime
      </text>
    </svg>
  );
}

// ─── Main Illustration ───────────────────────────────────────────
export function MultiLlmIllustration() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 1.2 }}
      className="w-full flex items-center justify-center"
    >
      <div className="relative w-full max-w-[700px] aspect-[753/496]">
        {/* Ambient particle field */}
        <ParticleCanvas />

        {/* Ambient radial glow behind Agent Router */}
        <motion.div
          className="absolute pointer-events-none"
          style={{
            left: "50%",
            top: "25%",
            width: "200px",
            height: "200px",
            transform: "translate(-50%, -50%)",
            background:
              "radial-gradient(circle, rgba(255,26,136,0.12) 0%, rgba(255,26,136,0.04) 40%, transparent 70%)",
            borderRadius: "50%",
            zIndex: 1,
          }}
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.6, 1, 0.6],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Provider blocks with organic floating */}
        <GeminiBlock />
        <OpenAIBlock />

        {/* Agent Router stacking layers */}
        <motion.div
          className="absolute h-[249.697px] left-[251px] top-[44px] w-[197.213px]"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.5 }}
          style={{ zIndex: 3 }}
        >
          {/* Dark stacking layers */}
          {[
            {
              paths: [
                svgPaths.p30a40100,
                svgPaths.p31aa8cf0,
                svgPaths.pa5f6600,
              ],
              y: [50, 50, 0, 0, 0, -25, 50],
              opacity: [0.4, 0.4, 1, 1, 1, 0.4, 0.4],
              times: [0, 0.02, 0.09, 0.3, 0.91, 0.98, 1],
            },
            {
              paths: [
                svgPaths.p3db071f0,
                svgPaths.p7b59900,
                svgPaths.p23d6e400,
              ],
              y: [35, 35, 0, 0, 0, -20, 35],
              opacity: [0.4, 0.4, 1, 1, 1, 0.4, 0.4],
              times: [0, 0.09, 0.16, 0.3, 0.84, 0.91, 1],
            },
            {
              paths: [
                svgPaths.p12d44ef0,
                svgPaths.p364fb6c0,
                svgPaths.p1f1a6680,
              ],
              y: [22, 22, 0, 0, 0, -14, 22],
              opacity: [0.4, 0.4, 1, 1, 1, 0.4, 0.4],
              times: [0, 0.16, 0.23, 0.3, 0.77, 0.84, 1],
            },
          ].map((layer, i) => (
            <motion.div
              key={i}
              className="absolute inset-0"
              animate={{
                y: layer.y,
                opacity: layer.opacity,
              }}
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
                <g>
                  {layer.paths.map((path, j) => (
                    <path key={j} d={path} fill="#431D30" />
                  ))}
                </g>
              </svg>
            </motion.div>
          ))}

          {/* Top pink layer + AGENT/Router text */}
          <motion.div
            className="absolute inset-0"
            animate={{
              y: [12, 12, 0, 0, 0, -10, 12],
              opacity: [1, 1, 1, 1, 1, 1, 1],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut",
              times: [0, 0.23, 0.3, 0.5, 0.7, 0.77, 1],
              repeatDelay: 0.5,
            }}
          >
            <svg
              className="block size-full"
              fill="none"
              preserveAspectRatio="none"
              viewBox="0 0 197.213 249.697"
            >
              <g>
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
              </g>
            </svg>
            {/* AGENT / Router text — rides with top pink layer */}
            <p
              className="absolute left-1/2 -translate-x-1/2 font-['Geist_Mono:Bold',sans-serif] text-[16.527px] text-center text-white whitespace-nowrap pointer-events-none"
              style={{ top: "18%", zIndex: 10 }}
            >
              AGENT
            </p>
            <p
              className="absolute left-1/2 -translate-x-1/2 font-['Geist_Mono:Regular',sans-serif] font-normal text-[9.916px] text-[rgba(255,255,255,0.95)] text-center whitespace-nowrap pointer-events-none"
              style={{ top: "27%", zIndex: 10 }}
            >
              Router
            </p>
          </motion.div>
        </motion.div>

        {/* Data flow connections with packets */}
        <DataFlowConnections />

        {/* Agent Router shells and highlight */}
        <AgentRouterShells />

        {/* Subtle horizontal scan line */}
        <motion.div
          className="absolute inset-x-0 pointer-events-none"
          style={{
            height: "1px",
            background:
              "linear-gradient(90deg, transparent 0%, rgba(196,113,237,0.15) 20%, rgba(255,26,136,0.25) 50%, rgba(0,255,136,0.15) 80%, transparent 100%)",
            zIndex: 10,
          }}
          animate={{
            top: ["0%", "100%"],
            opacity: [0, 0.6, 0.6, 0],
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
