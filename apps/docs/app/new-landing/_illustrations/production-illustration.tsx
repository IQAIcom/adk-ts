import { motion } from "motion/react";
import { useRef, useEffect, useState } from "react";
import svgPaths from "./imports/svg-mj2t39bum7";

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
      green: boolean;
      phase: number;
      speed: number;
    }

    const particles: Particle[] = [];
    for (let i = 0; i < 50; i++) {
      const rng = Math.random();
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.1,
        size: Math.random() * 1.5 + 0.3,
        baseAlpha: Math.random() * 0.22 + 0.04,
        pink: rng > 0.82,
        green: rng > 0.75 && rng <= 0.82,
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
        } else if (p.green) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(74,222,128,${alpha * 0.1})`;
          ctx.fill();
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(74,222,128,${alpha * 0.7})`;
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

// ─── System Header ───────────────────────────────────────────────
function SystemHeader() {
  return (
    <>
      <p className="absolute font-['Geist_Mono:Regular',sans-serif] font-normal inset-[8.26%_60.24%_89.37%_35.44%] leading-[normal] text-[8.804px] text-[rgba(255,255,255,0.4)] text-center">
        SYSTEM
      </p>
      <div className="absolute inset-[12.75%_55.42%_82.06%_30.95%]">
        <div className="absolute inset-[-2.5%_-0.6%]">
          <svg
            className="block size-full"
            fill="none"
            preserveAspectRatio="none"
            viewBox="0 0 102.043 25.2106"
          >
            <path
              d={svgPaths.p18c8e00}
              stroke="white"
              strokeOpacity="0.3"
              strokeWidth="1.20051"
            />
          </svg>
        </div>
      </div>
      {/* Status indicators with blinking green dot */}
      <div className="-translate-x-1/2 absolute h-[8.003px] left-[calc(50%-90.99px)] top-[67.04px] w-[48.01px]">
        <svg
          className="block size-full"
          fill="none"
          preserveAspectRatio="none"
          viewBox="0 0 48.0101 8.00337"
        >
          <path d={svgPaths.p23a71380} fill="white" fillOpacity="0.2" />
          <path d={svgPaths.p3da6b300} fill="white" fillOpacity="0.2" />
          <path d={svgPaths.p289fa200} fill="#4ADE80" opacity="0.87785">
            <animate
              attributeName="opacity"
              values="0.88;0.4;0.88"
              dur="2.5s"
              repeatCount="indefinite"
            />
          </path>
        </svg>
      </div>
    </>
  );
}

// ─── Production Infrastructure Layer (bottom, layer 0) ───────────
function ProductionInfrastructureLayer() {
  return (
    <>
      {/* Top face */}
      <div className="absolute inset-[68.94%_36.28%_20.69%_9.65%]">
        <div className="absolute inset-[-1.67%_-0.72%]">
          <svg
            className="block size-full"
            fill="none"
            preserveAspectRatio="none"
            viewBox="0 0 405.948 49.6209"
          >
            <path
              d={svgPaths.p28c0f100}
              fill="url(#pi_prodTop)"
              stroke="white"
              strokeOpacity="0.4"
              strokeWidth="1.60067"
            />
            <defs>
              <linearGradient
                gradientUnits="userSpaceOnUse"
                id="pi_prodTop"
                x1="2.889"
                x2="2.889"
                y1="0.8"
                y2="4802.82"
              >
                <stop stopColor="#9E1658" />
                <stop offset="1" stopColor="#0D0D0D" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>
      {/* Right side face */}
      <div className="absolute inset-[68.94%_79.54%_3.41%_9.65%]">
        <div className="absolute inset-[-1.1%_-1%]">
          <svg
            className="block size-full"
            fill="none"
            preserveAspectRatio="none"
            viewBox="0 0 81.6344 130.881"
          >
            <path
              d={svgPaths.p5cbd380}
              fill="#050505"
              fillOpacity="0.95"
              stroke="white"
              strokeOpacity="0.4"
              strokeWidth="1.60067"
            />
          </svg>
        </div>
      </div>
      {/* Right face gradient highlight */}
      <div className="absolute flex inset-[69.44%_79.66%_3.67%_9.73%] items-center justify-center">
        <div className="-scale-y-100 flex-none h-[124.5px] w-[78.5px]">
          <div className="relative size-full">
            <div className="absolute inset-[-0.72%_-0.65%_-0.7%_-0.64%]">
              <svg
                className="block size-full"
                fill="none"
                preserveAspectRatio="none"
                viewBox="0 0 79.5072 126.265"
              >
                <path
                  d={svgPaths.p3aa22b00}
                  fill="url(#pi_prodRG)"
                  fillOpacity="0.4"
                  stroke="white"
                  strokeOpacity="0.2"
                />
                <defs>
                  <linearGradient
                    gradientUnits="userSpaceOnUse"
                    id="pi_prodRG"
                    x1="10.998"
                    x2="10.998"
                    y1="-12.109"
                    y2="9537.89"
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
      {/* Left side face */}
      <div className="absolute inset-[68.94%_36.28%_6.86%_52.91%]">
        <div className="absolute inset-[-1.26%_-1%_-1.49%_-1.75%]">
          <svg
            className="block size-full"
            fill="none"
            preserveAspectRatio="none"
            viewBox="0 0 82.2328 115.126"
          >
            <path
              d={svgPaths.p3e98a400}
              fill="#0C0C0C"
              fillOpacity="0.9"
              stroke="white"
              strokeOpacity="0.4"
              strokeWidth="1.60067"
            />
          </svg>
        </div>
      </div>
      {/* Front face */}
      <div className="absolute inset-[68.94%_36.28%_3.41%_20.46%]">
        <div className="absolute inset-[-0.62%_-0.25%_-0.66%_-0.25%]">
          <svg
            className="block size-full"
            fill="none"
            preserveAspectRatio="none"
            viewBox="0 0 321.736 129.696"
          >
            <path
              d={svgPaths.p3fdb2280}
              fill="#070707"
              fillOpacity="0.9"
              stroke="white"
              strokeOpacity="0.4"
              strokeWidth="1.60067"
            />
          </svg>
        </div>
      </div>
      {/* Label */}
      <p className="absolute font-['Geist_Mono:Regular',sans-serif] font-normal inset-[85.7%_47.48%_11.27%_31.44%] leading-[normal] text-[10.404px] text-[rgba(255,255,255,0.5)] text-center">
        Production Infrastructure
      </p>
      {/* Top face pink sweep highlight */}
      <div className="absolute inset-[68.9%_36.49%_21.6%_21.49%]">
        <svg
          className="block size-full"
          fill="none"
          preserveAspectRatio="none"
          viewBox="0 0 311 44"
        >
          <path d="M0 44L62.2 0H311L248.8 44H0Z" fill="url(#pi_prodHL)" />
          <defs>
            <linearGradient
              gradientUnits="userSpaceOnUse"
              id="pi_prodHL"
              x1="0"
              x2="31100"
              y1="0"
              y2="0"
            >
              <stop stopColor="#FF1A88" stopOpacity="0.15" />
              <stop offset="1" stopColor="#FF1A88" stopOpacity="0.02" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </>
  );
}

// ─── Telemetry Layer (layer 1) ───────────────────────────────────
function TelemetryLayer() {
  return (
    <>
      {/* Top face */}
      <div className="absolute inset-[58.56%_40.6%_34.52%_12.89%]">
        <div className="absolute inset-[-2.5%_-0.1%]">
          <svg
            className="block size-full"
            fill="none"
            preserveAspectRatio="none"
            viewBox="0 0 344.861 33.6142"
          >
            <path
              d={svgPaths.p20219f00}
              fill="#0A0A0A"
              fillOpacity="0.9"
              stroke="white"
              strokeOpacity="0.4"
              strokeWidth="1.60067"
            />
          </svg>
        </div>
      </div>
      {/* Right side face */}
      <div className="absolute inset-[58.53%_78.51%_19%_12.84%]">
        <div className="absolute inset-[-1.24%_-1.25%]">
          <svg
            className="block size-full"
            fill="none"
            preserveAspectRatio="none"
            viewBox="0 0 65.6277 106.634"
          >
            <path
              d={svgPaths.p30907e70}
              fill="#060606"
              fillOpacity="0.95"
              stroke="white"
              strokeOpacity="0.4"
              strokeWidth="1.60067"
            />
          </svg>
        </div>
      </div>
      {/* Right face gradient highlight */}
      <div className="absolute flex inset-[59.4%_78.58%_19.01%_12.97%] items-center justify-center">
        <div className="-scale-y-100 flex-none h-[100px] w-[62.5px]">
          <div className="relative size-full">
            <div className="absolute inset-[-0.82%_-0.8%_-0.77%_-0.8%]">
              <svg
                className="block size-full"
                fill="none"
                preserveAspectRatio="none"
                viewBox="0 0 63.5 101.595"
              >
                <path
                  d={svgPaths.p2ed02900}
                  fill="url(#pi_telRG)"
                  fillOpacity="0.4"
                  stroke="white"
                  strokeOpacity="0.2"
                />
                <defs>
                  <linearGradient
                    gradientUnits="userSpaceOnUse"
                    id="pi_telRG"
                    x1="5.998"
                    x2="5.998"
                    y1="-19.176"
                    y2="9530.82"
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
      {/* Left side face */}
      <div className="absolute inset-[58.56%_40.6%_18.96%_50.74%]">
        <div className="absolute inset-[-1.24%_-1.25%]">
          <svg
            className="block size-full"
            fill="none"
            preserveAspectRatio="none"
            viewBox="0 0 65.6277 106.634"
          >
            <path
              d={svgPaths.p47a6600}
              fill="#0E0E0E"
              fillOpacity="0.9"
              stroke="white"
              strokeOpacity="0.4"
              strokeWidth="1.60067"
            />
          </svg>
        </div>
      </div>
      {/* Front face */}
      <div className="absolute inset-[58.56%_40.6%_18.96%_21.54%]">
        <div className="absolute inset-[-0.77%_-0.29%]">
          <svg
            className="block size-full"
            fill="none"
            preserveAspectRatio="none"
            viewBox="0 0 281.719 105.645"
          >
            <path
              d={svgPaths.p12f66f00}
              fill="#080808"
              fillOpacity="0.9"
              stroke="white"
              strokeOpacity="0.4"
              strokeWidth="1.60067"
            />
          </svg>
        </div>
      </div>
      {/* Label */}
      <p className="absolute font-['Geist_Mono:Regular',sans-serif] font-normal inset-[70.15%_53.29%_26.83%_34.01%] leading-[normal] text-[10.404px] text-[rgba(255,255,255,0.5)] text-center">
        Telemetry Layer
      </p>
      {/* Top face pink sweep highlight */}
      <div className="absolute inset-[58.53%_40.54%_34.77%_22.03%]">
        <svg
          className="block size-full"
          fill="none"
          preserveAspectRatio="none"
          viewBox="0 0 277 31"
        >
          <path d="M0 31L55.4 0H277L221.6 31H0Z" fill="url(#pi_telHL)" />
          <defs>
            <linearGradient
              gradientUnits="userSpaceOnUse"
              id="pi_telHL"
              x1="0"
              x2="27700"
              y1="0"
              y2="0"
            >
              <stop stopColor="#FF1A88" stopOpacity="0.15" />
              <stop offset="1" stopColor="#FF1A88" stopOpacity="0.02" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </>
  );
}

// ─── Cache & Session Layer (layer 2) ─────────────────────────────
function CacheAndSessionLayer() {
  return (
    <>
      {/* Top face */}
      <div className="absolute inset-[46.46%_46.01%_48.35%_16.14%]">
        <div className="absolute inset-[-3.33%_-0.13%]">
          <svg
            className="block size-full"
            fill="none"
            preserveAspectRatio="none"
            viewBox="0 0 280.834 25.6108"
          >
            <path
              d={svgPaths.p13cc4f00}
              fill="url(#pi_cacheTop)"
              stroke="white"
              strokeOpacity="0.4"
              strokeWidth="1.60067"
            />
            <defs>
              <linearGradient
                gradientUnits="userSpaceOnUse"
                id="pi_cacheTop"
                x1="0.358"
                x2="0.358"
                y1="0.8"
                y2="2401.81"
              >
                <stop stopColor="#9E1658" />
                <stop offset="1" stopColor="#0D0D0D" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>
      {/* Right side face */}
      <div className="absolute inset-[46.44%_77.43%_34.55%_16.08%]">
        <div className="absolute inset-[-1.47%_-1.67%]">
          <svg
            className="block size-full"
            fill="none"
            preserveAspectRatio="none"
            viewBox="0 0 49.6209 90.6271"
          >
            <path
              d={svgPaths.p34f28500}
              fill="#070707"
              fillOpacity="0.95"
              stroke="white"
              strokeOpacity="0.4"
              strokeWidth="1.60067"
            />
          </svg>
        </div>
      </div>
      {/* Right face gradient highlight */}
      <div className="absolute flex inset-[46.76%_77.57%_34.77%_16.15%] items-center justify-center">
        <div className="-scale-y-100 flex-none h-[85.5px] w-[46.5px]">
          <div className="relative size-full">
            <div className="absolute inset-[-0.96%_-1.08%_-0.92%_-1.08%]">
              <svg
                className="block size-full"
                fill="none"
                preserveAspectRatio="none"
                viewBox="0 0 47.5 87.1104"
              >
                <path
                  d={svgPaths.p1add6940}
                  fill="url(#pi_cacheRG)"
                  fillOpacity="0.4"
                  stroke="white"
                  strokeOpacity="0.2"
                />
                <defs>
                  <linearGradient
                    gradientUnits="userSpaceOnUse"
                    id="pi_cacheRG"
                    x1="5.998"
                    x2="5.998"
                    y1="-27.679"
                    y2="9522.32"
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
      {/* Left side face */}
      <div className="absolute inset-[46.46%_46.01%_34.52%_47.5%]">
        <div className="absolute inset-[-1.47%_-1.67%]">
          <svg
            className="block size-full"
            fill="none"
            preserveAspectRatio="none"
            viewBox="0 0 49.6209 90.6271"
          >
            <path
              d={svgPaths.p3040d230}
              fill="#101010"
              fillOpacity="0.9"
              stroke="white"
              strokeOpacity="0.4"
              strokeWidth="1.60067"
            />
          </svg>
        </div>
      </div>
      {/* Front face */}
      <div className="absolute inset-[46.44%_46.07%_34.55%_22.57%]">
        <div className="absolute inset-[-0.91%_-0.34%]">
          <svg
            className="block size-full"
            fill="none"
            preserveAspectRatio="none"
            viewBox="0 0 233.699 89.6378"
          >
            <path
              d={svgPaths.p25c60400}
              fill="#0A0A0A"
              fillOpacity="0.9"
              stroke="white"
              strokeOpacity="0.4"
              strokeWidth="1.60067"
            />
          </svg>
        </div>
      </div>
      {/* Labels */}
      <p className="absolute font-['Geist_Mono:Regular',sans-serif] font-normal inset-[57.35%_75.62%_40.05%_20.46%] leading-[normal] text-[9.604px] text-[rgba(255,255,255,0.5)]">
        Cache
      </p>
      <p className="absolute font-['Geist_Mono:Regular',sans-serif] font-normal inset-[57.35%_49.12%_40.05%_45.34%] leading-[normal] text-[9.604px] text-[rgba(255,255,255,0.5)]">
        Session
      </p>
    </>
  );
}

// ─── Runtime Engine Block (top, layer 3) ─────────────────────────
function RuntimeEngineBlock() {
  return (
    <>
      {/* Top face */}
      <div className="absolute inset-[26.16%_52.01%_69.34%_23.22%]">
        <div className="absolute inset-[-4%_-0.2%]">
          <svg
            className="block size-full"
            fill="none"
            preserveAspectRatio="none"
            viewBox="0 0 184.079 22.5"
          >
            <path
              d={svgPaths.p2834b600}
              fill="#0F0F0F"
              fillOpacity="0.8"
              stroke="white"
              strokeOpacity="0.5"
              strokeWidth="1.66667"
            />
          </svg>
        </div>
      </div>
      {/* Right side face */}
      <div className="absolute inset-[26.16%_71.15%_52.24%_23.22%]">
        <div className="absolute inset-[-1.35%_-2%]">
          <svg
            className="block size-full"
            fill="none"
            preserveAspectRatio="none"
            viewBox="0 0 43.3333 102.697"
          >
            <path
              d={svgPaths.p3c74ef00}
              fill="#0A0A0A"
              fillOpacity="0.85"
              stroke="white"
              strokeOpacity="0.5"
              strokeWidth="1.66667"
            />
          </svg>
        </div>
      </div>
      {/* Right face gradient highlight */}
      <div className="absolute flex inset-[26.81%_71.22%_52.59%_23.31%] items-center justify-center">
        <div className="-scale-y-100 flex-none h-[95.372px] w-[40.5px]">
          <div className="relative size-full">
            <div className="absolute inset-[-0.83%_-1.23%_-0.82%_-1.23%]">
              <svg
                className="block size-full"
                fill="none"
                preserveAspectRatio="none"
                viewBox="0 0 41.5 96.9518"
              >
                <path
                  d={svgPaths.p60a62f0}
                  fill="url(#pi_rtRG)"
                  fillOpacity="0.4"
                  stroke="white"
                  strokeOpacity="0.2"
                />
                <defs>
                  <linearGradient
                    gradientUnits="userSpaceOnUse"
                    id="pi_rtRG"
                    x1="5.998"
                    x2="5.998"
                    y1="-16.204"
                    y2="9533.79"
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
      {/* Left side face */}
      <div className="absolute inset-[26.16%_52.01%_52.24%_42.36%]">
        <div className="absolute inset-[-1.35%_-2%]">
          <svg
            className="block size-full"
            fill="none"
            preserveAspectRatio="none"
            viewBox="0 0 43.3333 102.697"
          >
            <path
              d={svgPaths.p8f0ef0}
              fill="#121212"
              fillOpacity="0.8"
              stroke="white"
              strokeOpacity="0.5"
              strokeWidth="1.66667"
            />
          </svg>
        </div>
      </div>
      {/* Front face */}
      <div className="absolute inset-[26.16%_52.01%_52.24%_28.85%]">
        <div className="absolute inset-[-0.83%_-0.59%]">
          <svg
            className="block size-full"
            fill="none"
            preserveAspectRatio="none"
            viewBox="0 0 143.333 101.667"
          >
            <path
              d={svgPaths.p3a35800}
              fill="#0C0C0C"
              fillOpacity="0.85"
              stroke="white"
              strokeOpacity="0.5"
              strokeWidth="1.66667"
            />
          </svg>
        </div>
      </div>
      {/* Pink highlight on top face */}
      <div className="absolute inset-[26.16%_52.01%_69.34%_23.22%]">
        <svg
          className="block size-full"
          fill="none"
          preserveAspectRatio="none"
          viewBox="0 0 183.333 20.8333"
        >
          <path d={svgPaths.pd37de40} fill="url(#pi_rtPinkHL)" />
          <defs>
            <linearGradient
              gradientUnits="userSpaceOnUse"
              id="pi_rtPinkHL"
              x1="0"
              x2="0"
              y1="0"
              y2="2083.33"
            >
              <stop stopColor="#FF1A88" stopOpacity="0.6" />
              <stop offset="0.5" stopColor="#FF1A88" stopOpacity="0.3" />
              <stop offset="1" stopColor="#FF1A88" stopOpacity="0.05" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      {/* Pink dashed border — top */}
      <div className="absolute inset-[26.16%_52.01%_69.34%_23.22%]">
        <div className="absolute inset-[-5%_-0.25%_-4.47%_-0.25%]">
          <svg
            className="block size-full"
            fill="none"
            preserveAspectRatio="none"
            viewBox="0 0 184.265 22.8067"
          >
            <path
              d={svgPaths.p2fe99d40}
              stroke="#FF1A88"
              strokeDasharray="0.83 0.83"
              strokeWidth="2.08333"
            />
          </svg>
        </div>
      </div>
      {/* Pink dashed border — right vertical */}
      <div className="absolute inset-[30.66%_76.78%_56.74%_23.22%]">
        <div className="absolute inset-[0_-1.04px]">
          <svg
            className="block size-full"
            fill="none"
            preserveAspectRatio="none"
            viewBox="0 0 2.08333 58.3333"
          >
            <path
              d="M1.04167 0V58.3333"
              stroke="#FF1A88"
              strokeDasharray="0.83 0.83"
              strokeWidth="2.08333"
            />
          </svg>
        </div>
      </div>
      {/* Pink dashed border — left vertical */}
      <div className="absolute inset-[26.16%_52.01%_52.24%_47.99%]">
        <div className="absolute inset-[0_-1.04px]">
          <svg
            className="block size-full"
            fill="none"
            preserveAspectRatio="none"
            viewBox="0 0 2.08333 100"
          >
            <path
              d="M1.04167 0V100"
              stroke="#FF1A88"
              strokeDasharray="0.83 0.83"
              strokeWidth="2.08333"
            />
          </svg>
        </div>
      </div>
      {/* Grid line — horizontal */}
      <div className="absolute inset-[36.96%_52.01%_63.04%_28.85%]">
        <div className="absolute inset-[-0.42px_0]">
          <svg
            className="block size-full"
            fill="none"
            preserveAspectRatio="none"
            viewBox="0 0 141.667 0.833333"
          >
            <path
              d="M0 0.416667H141.667"
              stroke="white"
              strokeOpacity="0.15"
              strokeWidth="0.833333"
            />
          </svg>
        </div>
      </div>
      {/* Grid line — vertical */}
      <div className="absolute inset-[26.16%_61.58%_52.24%_38.42%]">
        <div className="absolute inset-[0_-0.42px]">
          <svg
            className="block size-full"
            fill="none"
            preserveAspectRatio="none"
            viewBox="0 0 0.833333 100"
          >
            <path
              d="M0.416667 0V100"
              stroke="white"
              strokeOpacity="0.15"
              strokeWidth="0.833333"
            />
          </svg>
        </div>
      </div>
      {/* RUNTIME / Core Engine text */}
      <p className="absolute font-['Geist_Mono:Bold',sans-serif] inset-[32.1%_56.96%_63.37%_33.85%] leading-[normal] not-italic text-[16.007px] text-center text-white">
        RUNTIME
      </p>
      <p className="absolute font-['Geist_Mono:Regular',sans-serif] font-normal inset-[36.78%_57.62%_60.85%_34.41%] leading-[normal] text-[8.804px] text-[rgba(255,255,255,0.8)] text-center">
        Core Engine
      </p>
      {/* Pink accent dot */}
      <div className="absolute inset-[30.48%_60.91%_67.36%_37.74%]">
        <svg
          className="block size-full"
          fill="none"
          preserveAspectRatio="none"
          viewBox="0 0 10 10"
        >
          <path d={svgPaths.p46c6500} fill="#FF1A88" opacity="0.672">
            <animate
              attributeName="opacity"
              values="0.67;1;0.67"
              dur="2s"
              repeatCount="indefinite"
            />
          </path>
        </svg>
      </div>
    </>
  );
}

// ─── Stream Module (floating independently) ──────────────────────
function StreamModule() {
  return (
    <>
      {/* Top face */}
      <div className="absolute inset-[30.91%_13.56%_65.64%_66.97%]">
        <div className="absolute inset-[-5%_-0.25%]">
          <svg
            className="block size-full"
            fill="none"
            preserveAspectRatio="none"
            viewBox="0 0 144.777 17.6074"
          >
            <path
              d={svgPaths.p3a67cf00}
              fill="url(#pi_streamTop)"
              stroke="white"
              strokeOpacity="0.4"
              strokeWidth="1.60067"
            />
            <defs>
              <linearGradient
                gradientUnits="userSpaceOnUse"
                id="pi_streamTop"
                x1="0.358"
                x2="0.358"
                y1="0.8"
                y2="1601.48"
              >
                <stop stopColor="#9E1658" />
                <stop offset="1" stopColor="#0D0D0D" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>
      {/* Right side face */}
      <div className="absolute inset-[30.91%_28.71%_48.35%_66.97%]">
        <div className="absolute inset-[-1.35%_-2.5%]">
          <svg
            className="block size-full"
            fill="none"
            preserveAspectRatio="none"
            viewBox="0 0 33.6142 98.6304"
          >
            <g>
              <path d={svgPaths.p3e8e7200} fill="#070707" fillOpacity="0.95" />
              <path d={svgPaths.p3e8e7200} fill="url(#pi_streamR)" />
              <path
                d={svgPaths.p3e8e7200}
                stroke="white"
                strokeOpacity="0.4"
                strokeWidth="1.60067"
              />
            </g>
            <defs>
              <linearGradient
                gradientUnits="userSpaceOnUse"
                id="pi_streamR"
                x1="0.8"
                x2="0.8"
                y1="1.295"
                y2="9605.34"
              >
                <stop stopColor="#9E1658" />
                <stop offset="1" stopColor="#0D0D0D" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>
      {/* Left side face */}
      <div className="absolute inset-[30.91%_13.56%_51.81%_82.11%]">
        <div className="absolute inset-[-1.62%_-2.5%]">
          <svg
            className="block size-full"
            fill="none"
            preserveAspectRatio="none"
            viewBox="0 0 33.6142 82.6237"
          >
            <g>
              <path d={svgPaths.p280ca740} fill="#101010" fillOpacity="0.9" />
              <path d={svgPaths.p280ca740} fill="url(#pi_streamL)" />
              <path
                d={svgPaths.p280ca740}
                stroke="white"
                strokeOpacity="0.4"
                strokeWidth="1.60067"
              />
            </g>
            <defs>
              <linearGradient
                gradientUnits="userSpaceOnUse"
                id="pi_streamL"
                x1="0.8"
                x2="0.8"
                y1="1.295"
                y2="8004.67"
              >
                <stop stopColor="#9E1658" />
                <stop offset="1" stopColor="#0D0D0D" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>
      {/* Front face */}
      <div className="absolute inset-[30.91%_13.56%_48.35%_71.29%]">
        <div className="absolute inset-[-0.83%_-0.71%_-1.1%_-0.71%]">
          <svg
            className="block size-full"
            fill="none"
            preserveAspectRatio="none"
            viewBox="0 0 113.648 97.9019"
          >
            <path
              d={svgPaths.p230aab80}
              fill="#0A0A0A"
              fillOpacity="0.9"
              stroke="white"
              strokeOpacity="0.4"
              strokeWidth="1.60067"
            />
          </svg>
        </div>
      </div>
      {/* Label */}
      <p className="absolute font-['Geist_Mono:Regular',sans-serif] font-normal inset-[40.07%_20.92%_57.34%_74.35%] leading-[normal] text-[9.604px] text-[rgba(255,255,255,0.5)] text-center">
        Stream
      </p>
    </>
  );
}

// ─── Runtime Accent Lines (rainbow gradient dashed) ──────────────
function RuntimeAccents() {
  return (
    <>
      {/* Accent 01 — diagonal: Runtime → Stream */}
      <div className="absolute inset-[36.67%_33.03%_60.45%_47.5%]">
        <div className="absolute inset-[0_0_-5.99%_0]">
          <svg
            className="block size-full"
            fill="none"
            preserveAspectRatio="none"
            viewBox="0 0 144.194 14.1131"
          >
            <g>
              <path
                d={svgPaths.p17cb4820}
                stroke="white"
                strokeDasharray="6.4 4.8"
                strokeOpacity="0.3"
                strokeWidth="1.60067"
              />
              <path
                d={svgPaths.p17cb4820}
                stroke="url(#pi_accent1)"
                strokeDasharray="6.4 4.8"
                strokeWidth="1.60067"
              />
            </g>
            <path d={svgPaths.p2909180} fill="#FF1A88" />
            <defs>
              <linearGradient
                gradientUnits="userSpaceOnUse"
                id="pi_accent1"
                x1="0.066"
                x2="144.127"
                y1="7.313"
                y2="7.313"
              >
                <stop stopColor="#12C2E9" />
                <stop offset="0.5" stopColor="#C471ED" />
                <stop offset="1" stopColor="#F64F59" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>
      {/* Accent 02 — vertical: below Runtime */}
      <div className="absolute inset-[47.33%_61.26%_39.71%_37.87%]">
        <svg
          className="block size-full"
          fill="none"
          preserveAspectRatio="none"
          viewBox="0 0 6.4027 60.0253"
        >
          <g>
            <path
              d="M3.20131 2.40063e-05V60.0253"
              stroke="white"
              strokeDasharray="4.8 3.2"
              strokeOpacity="0.25"
              strokeWidth="1.60067"
            />
            <path
              d="M3.20131 2.40063e-05V60.0253"
              stroke="url(#pi_accent2)"
              strokeDasharray="4.8 3.2"
              strokeWidth="1.60067"
            />
          </g>
          <path d={svgPaths.p1b3b0a80} fill="#FF1A88" />
          <defs>
            <linearGradient
              gradientUnits="userSpaceOnUse"
              id="pi_accent2"
              x1="3.201"
              x2="4.201"
              y1="30.013"
              y2="30.013"
            >
              <stop stopColor="#12C2E9" />
              <stop offset="0.5" stopColor="#C471ED" />
              <stop offset="1" stopColor="#F64F59" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </>
  );
}

// ─── Pink connector shape (Vector 865) ───────────────────────────
function PinkConnector() {
  return (
    <div className="absolute h-[32px] left-[528px] top-[208px] w-[111.5px]">
      <div className="absolute inset-[-1.5%_-0.21%_-1.53%_-0.12%]">
        <svg
          className="block size-full"
          fill="none"
          preserveAspectRatio="none"
          viewBox="0 0 111.867 32.9714"
        >
          <path
            d={svgPaths.p17ffee80}
            fill="#9D1658"
            stroke="white"
            strokeOpacity="0.4"
          />
        </svg>
      </div>
    </div>
  );
}

// ─── Data Flow Overlay (SVG-based pulses & packets) ──────────────
function DataFlowOverlay() {
  // Diagonal accent line runs from ~(352,171) to ~(496,183) in the 740×463 canvas
  const accentDiag = "M 352 171 L 496 183";
  // Vertical accent runs from ~(283,219) to ~(283,279) in the 740×463 canvas
  const accentVert = "M 283 219 L 283 279";

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      viewBox="0 0 740 463"
      preserveAspectRatio="none"
      style={{ zIndex: 8, width: 740, height: 463 }}
    >
      <defs>
        <filter id="piPktGlow" x="-200%" y="-200%" width="500%" height="500%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <radialGradient id="piPulseGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FF1A88" stopOpacity="0.2" />
          <stop offset="60%" stopColor="#FF1A88" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#FF1A88" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Pulse waves from Runtime center */}
      <circle cx="284" cy="165" r="15" fill="url(#piPulseGrad)" opacity="0">
        <animate
          attributeName="r"
          values="15;60"
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
      <circle cx="284" cy="165" r="15" fill="url(#piPulseGrad)" opacity="0">
        <animate
          attributeName="r"
          values="15;60"
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

      {/* Data packets — diagonal (Runtime → Stream) */}
      {["0s", "1.8s"].map((delay, di) => (
        <g key={`d-${di}`} filter="url(#piPktGlow)">
          <circle
            r="5"
            fill="none"
            stroke="#C471ED"
            strokeWidth="1"
            opacity="0.3"
          >
            <animateMotion
              dur="3s"
              begin={delay}
              repeatCount="indefinite"
              path={accentDiag}
              rotate="auto"
            />
          </circle>
          <circle r="2" fill="#C471ED" opacity="0.8">
            <animateMotion
              dur="3s"
              begin={delay}
              repeatCount="indefinite"
              path={accentDiag}
              rotate="auto"
            />
          </circle>
          <circle r="0.8" fill="#E8D0FF" opacity="1">
            <animateMotion
              dur="3s"
              begin={delay}
              repeatCount="indefinite"
              path={accentDiag}
              rotate="auto"
            />
          </circle>
        </g>
      ))}

      {/* Data packets — vertical (Runtime → Cache) */}
      {["0.5s", "2.5s"].map((delay, di) => (
        <g key={`v-${di}`} filter="url(#piPktGlow)">
          <circle
            r="4"
            fill="none"
            stroke="#FF1A88"
            strokeWidth="1"
            opacity="0.25"
          >
            <animateMotion
              dur="2.8s"
              begin={delay}
              repeatCount="indefinite"
              path={accentVert}
              rotate="auto"
            />
          </circle>
          <circle r="1.8" fill="#FF1A88" opacity="0.8">
            <animateMotion
              dur="2.8s"
              begin={delay}
              repeatCount="indefinite"
              path={accentVert}
              rotate="auto"
            />
          </circle>
        </g>
      ))}

      {/* Endpoint glow halos */}
      {[
        { cx: 352, cy: 171, color: "#FF1A88" },
        { cx: 496, cy: 183, color: "#C471ED" },
        { cx: 283, cy: 279, color: "#12C2E9" },
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

// ─── Stacking animation config ───────────────────────────────────
const STACK_LAYERS = [
  {
    // Layer 0: Production Infrastructure (bottom — builds first)
    y: [50, 50, 0, 0, 0, -25, 50],
    opacity: [0.4, 0.4, 1, 1, 1, 0.4, 0.4],
    times: [0, 0.02, 0.09, 0.3, 0.91, 0.98, 1],
  },
  {
    // Layer 1: Telemetry
    y: [35, 35, 0, 0, 0, -20, 35],
    opacity: [0.4, 0.4, 1, 1, 1, 0.4, 0.4],
    times: [0, 0.09, 0.16, 0.3, 0.84, 0.91, 1],
  },
  {
    // Layer 2: Cache & Session
    y: [22, 22, 0, 0, 0, -14, 22],
    opacity: [0.4, 0.4, 1, 1, 1, 0.4, 0.4],
    times: [0, 0.16, 0.23, 0.3, 0.77, 0.84, 1],
  },
  {
    // Layer 3: Runtime Engine (top — builds last)
    y: [12, 12, 0, 0, 0, -10, 12],
    opacity: [1, 1, 1, 1, 1, 1, 1],
    times: [0, 0.23, 0.3, 0.5, 0.7, 0.77, 1],
  },
];

const LAYER_COMPONENTS = [
  ProductionInfrastructureLayer,
  TelemetryLayer,
  CacheAndSessionLayer,
  RuntimeEngineBlock,
];

// ─── Main Illustration ───────────────────────────────────────────
export function ProductionIllustration() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        setScale(entry.contentRect.width / 740);
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
        className="relative w-full max-w-[700px] aspect-[740/463]"
      >
        {/* Ambient particle field */}
        <ParticleCanvas />

        {/* Ambient radial glow behind Runtime block */}
        <motion.div
          className="absolute pointer-events-none"
          style={{
            left: "39%",
            top: "28%",
            width: "180px",
            height: "180px",
            transform: "translate(-50%, -50%)",
            background:
              "radial-gradient(circle, rgba(255,26,136,0.1) 0%, rgba(255,26,136,0.03) 40%, transparent 70%)",
            borderRadius: "50%",
            zIndex: 1,
          }}
          animate={{ scale: [1, 1.12, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Scaled Figma canvas (740×463 at native, scaled to container) */}
        <div
          className="absolute top-0 left-0 origin-top-left overflow-visible"
          style={{ width: 740, height: 463, transform: `scale(${scale})` }}
        >
          {/* System Header — always visible, no stacking */}
          <div className="absolute inset-0" style={{ zIndex: 1 }}>
            <SystemHeader />
          </div>

          {/* Stacking layers: Production → Telemetry → Cache → Runtime */}
          {STACK_LAYERS.map((cfg, i) => {
            const LayerComp = LAYER_COMPONENTS[i];
            return (
              <motion.div
                key={i}
                className="absolute inset-0"
                style={{ zIndex: 2 + i }}
                animate={{ y: cfg.y, opacity: cfg.opacity }}
                transition={{
                  duration: 8,
                  repeat: Infinity,
                  ease: "easeInOut",
                  times: cfg.times,
                  repeatDelay: 0.5,
                }}
              >
                <LayerComp />
              </motion.div>
            );
          })}

          {/* Runtime accent lines — ride with nothing, always visible */}
          <div className="absolute inset-0" style={{ zIndex: 7 }}>
            <RuntimeAccents />
          </div>

          {/* Pink connector shape */}
          <div className="absolute inset-0" style={{ zIndex: 7 }}>
            <PinkConnector />
          </div>

          {/* Stream module — organic floating */}
          <motion.div
            className="absolute inset-0"
            style={{ zIndex: 6 }}
            animate={{
              y: [0, -5, 3, -7, 0],
              x: [0, 2, -1, 3, 0],
              scale: [1, 1.008, 0.997, 1.005, 1],
              rotateZ: [0, 0.4, -0.2, 0.6, 0],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "easeInOut",
              times: [0, 0.25, 0.5, 0.75, 1],
            }}
          >
            <StreamModule />
          </motion.div>

          {/* Data flow overlay — inside scaled canvas so coordinates match */}
          <DataFlowOverlay />
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
