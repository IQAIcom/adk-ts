import { motion } from "motion/react";
import { useRef, useEffect } from "react";
import svgPaths from "./imports/svg-cf4dnionap";

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
    for (let i = 0; i < 55; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.12,
        size: Math.random() * 1.6 + 0.3,
        baseAlpha: Math.random() * 0.25 + 0.05,
        pink: Math.random() > 0.72,
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

// ─── TOOLS Block (top-left) ──────────────────────────────────────
function Group() {
  return (
    <motion.div
      className="absolute inset-0"
      animate={{
        y: [0, -6, 2, -8, 0],
        x: [0, 2, -1, 3, 0],
        scale: [1, 1.012, 0.997, 1.008, 1],
        rotateZ: [0, 0.6, -0.3, 0.9, 0],
      }}
      transition={{
        duration: 9,
        repeat: Infinity,
        ease: "easeInOut",
        times: [0, 0.25, 0.5, 0.75, 1],
      }}
    >
      <div
        className="absolute inset-[0.73%_74.04%_80.58%_0]"
        data-name="Vector"
      >
        <div className="absolute inset-[-0.75%]">
          <svg
            className="block size-full"
            fill="none"
            preserveAspectRatio="none"
            viewBox="0 0 198.127 99.0637"
          >
            <path
              d={svgPaths.p817000}
              fill="url(#paint0_linear_2029_805)"
              id="Vector"
              stroke="var(--stroke-0, white)"
              strokeOpacity="0.5"
              strokeWidth="1.30145"
            />
            <defs>
              <linearGradient
                gradientUnits="userSpaceOnUse"
                id="paint0_linear_2029_805"
                x1="1.45506"
                x2="1.45506"
                y1="0.727532"
                y2="9761.59"
              >
                <stop stopColor="#373737" />
                <stop offset="1" stopColor="#232323" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>
      <div
        className="absolute inset-[10.08%_87.02%_69.36%_0]"
        data-name="Vector"
      >
        <div className="absolute inset-[-0.98%_-0.67%]">
          <svg
            className="block size-full"
            fill="none"
            preserveAspectRatio="none"
            viewBox="0 0 98.9101 109.475"
          >
            <path
              d={svgPaths.p1a59b5e0}
              fill="url(#paint0_linear_2029_837)"
              id="Vector"
              stroke="var(--stroke-0, white)"
              strokeOpacity="0.5"
              strokeWidth="1.30145"
            />
            <defs>
              <linearGradient
                gradientUnits="userSpaceOnUse"
                id="paint0_linear_2029_837"
                x1="0.650724"
                x2="0.650724"
                y1="1.05289"
                y2="10738"
              >
                <stop stopColor="#FF1A88" stopOpacity="0.6" />
                <stop offset="0.5" stopColor="#FF1A88" stopOpacity="0.3" />
                <stop offset="1" stopColor="#FF1A88" stopOpacity="0.05" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>
      <div className="absolute flex inset-[11.28%_87.06%_69.43%_1.63%] items-center justify-center">
        <div className="-scale-y-100 flex-none h-[100.711px] w-[85.011px]">
          <div className="relative size-full">
            <svg
              className="block size-full"
              fill="none"
              preserveAspectRatio="none"
              viewBox="0 0 85.0108 100.711"
            >
              <path
                d={svgPaths.pe4e4680}
                fill="url(#paint0_linear_2029_809)"
                id="Vector 863"
              />
              <defs>
                <linearGradient
                  gradientUnits="userSpaceOnUse"
                  id="paint0_linear_2029_809"
                  x1="-1.76424"
                  x2="-1.76424"
                  y1="0"
                  y2="10071.1"
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
      <div
        className="absolute inset-[10.08%_74.04%_69.36%_12.98%]"
        data-name="Vector"
      >
        <div className="absolute inset-[-0.98%_-0.67%]">
          <svg
            className="block size-full"
            fill="none"
            preserveAspectRatio="none"
            viewBox="0 0 98.9101 109.475"
          >
            <path
              d={svgPaths.p3d35e500}
              fill="url(#paint0_linear_2029_833)"
              id="Vector"
              stroke="var(--stroke-0, white)"
              strokeOpacity="0.5"
              strokeWidth="1.30145"
            />
            <defs>
              <linearGradient
                gradientUnits="userSpaceOnUse"
                id="paint0_linear_2029_833"
                x1="0.650724"
                x2="0.650724"
                y1="1.05289"
                y2="10738"
              >
                <stop stopColor="#1C1C1C" />
                <stop offset="1" stopColor="#121212" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>
      <div
        className="absolute inset-[0.73%_74.04%_80.58%_0]"
        data-name="Vector"
      >
        <svg
          className="block size-full"
          fill="none"
          preserveAspectRatio="none"
          viewBox="0 0 195.217 97.6087"
        >
          <path
            d={svgPaths.p17bb9080}
            fill="url(#paint0_linear_2029_831)"
            id="Vector"
          />
          <defs>
            <linearGradient
              gradientUnits="userSpaceOnUse"
              id="paint0_linear_2029_831"
              x1="0"
              x2="0"
              y1="0"
              y2="9760.87"
            >
              <stop stopColor="#FF1A88" stopOpacity="0.6" />
              <stop offset="0.5" stopColor="#FF1A88" stopOpacity="0.3" />
              <stop offset="1" stopColor="#FF1A88" stopOpacity="0.05" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      <div
        className="absolute inset-[0.73%_74.04%_89.92%_0]"
        data-name="Vector"
      >
        <div className="absolute inset-[-1.86%_-0.19%_-1.49%_-0.19%]">
          <svg
            className="block size-full"
            fill="none"
            preserveAspectRatio="none"
            viewBox="0 0 195.945 50.4413"
          >
            <path
              d={svgPaths.p23f2a800}
              id="Vector"
              stroke="var(--stroke-0, #FF1A88)"
              strokeWidth="1.62681"
            />
          </svg>
        </div>
      </div>
      <div
        className="absolute bottom-[78.71%] left-0 right-full top-[10.08%]"
        data-name="Vector"
      >
        <div className="absolute inset-[0_-0.81px]">
          <svg
            className="block size-full"
            fill="none"
            preserveAspectRatio="none"
            viewBox="0 0 1.62681 58.5652"
          >
            <path
              d="M0.813405 0V58.5652"
              id="Vector"
              stroke="var(--stroke-0, #FF1A88)"
              strokeWidth="1.62681"
            />
          </svg>
        </div>
      </div>
      <div
        className="absolute inset-[10.08%_74.04%_78.71%_25.96%]"
        data-name="Vector"
      >
        <div className="absolute inset-[0_-0.81px]">
          <svg
            className="block size-full"
            fill="none"
            preserveAspectRatio="none"
            viewBox="0 0 1.62681 58.5652"
          >
            <path
              d="M0.813405 0V58.5652"
              id="Vector"
              stroke="var(--stroke-0, #FF1A88)"
              strokeWidth="1.62681"
            />
          </svg>
        </div>
      </div>
      <div
        className="absolute inset-[3.23%_75.77%_80.41%_1.73%]"
        data-name="Vector"
      >
        <svg
          className="block size-full"
          fill="none"
          preserveAspectRatio="none"
          viewBox="0 0 169.188 85.4702"
        >
          <path
            d={svgPaths.p35cac00}
            fill="url(#paint0_linear_2029_807)"
            id="Vector"
          />
          <defs>
            <linearGradient
              gradientUnits="userSpaceOnUse"
              id="paint0_linear_2029_807"
              x1="-3.51118"
              x2="-3.51118"
              y1="0"
              y2="8547.02"
            >
              <stop stopColor="white" stopOpacity="0.12" />
              <stop offset="0.5" stopColor="white" stopOpacity="0.03" />
              <stop offset="1" stopColor="white" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      <p className="absolute font-['Geist_Mono:Regular',sans-serif] font-normal inset-[9.09%_85.11%_88.42%_10.9%] leading-[normal] text-[9.985px] text-[rgba(255,255,255,0.6)] text-center">
        TOOLS
      </p>
    </motion.div>
  );
}

// ─── LLM Block (bottom-left) ─────────────────────────────────────
function Group1() {
  return (
    <motion.div
      className="absolute inset-0"
      animate={{
        y: [0, 8, -3, 10, 0],
        x: [0, -3, 1, -2, 0],
        scale: [1, 0.995, 1.01, 0.998, 1],
        rotateZ: [0, -0.8, 0.4, -1.2, 0],
      }}
      transition={{
        duration: 10,
        repeat: Infinity,
        ease: "easeInOut",
        times: [0, 0.25, 0.5, 0.75, 1],
      }}
    >
      <div
        className="absolute inset-[64.34%_58.48%_16.97%_15.56%]"
        data-name="Vector"
      >
        <div className="absolute inset-[-0.75%]">
          <svg
            className="block size-full"
            fill="none"
            preserveAspectRatio="none"
            viewBox="0 0 198.127 99.0637"
          >
            <path
              d={svgPaths.p817000}
              fill="url(#paint0_linear_2029_805_2)"
              id="Vector"
              stroke="var(--stroke-0, white)"
              strokeOpacity="0.5"
              strokeWidth="1.30145"
            />
            <defs>
              <linearGradient
                gradientUnits="userSpaceOnUse"
                id="paint0_linear_2029_805_2"
                x1="1.45506"
                x2="1.45506"
                y1="0.727532"
                y2="9761.59"
              >
                <stop stopColor="#373737" />
                <stop offset="1" stopColor="#232323" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>
      <div
        className="absolute inset-[73.68%_71.46%_5.76%_15.56%]"
        data-name="Vector"
      >
        <div className="absolute inset-[-0.98%_-0.67%]">
          <svg
            className="block size-full"
            fill="none"
            preserveAspectRatio="none"
            viewBox="0 0 98.9101 109.475"
          >
            <path
              d={svgPaths.p1a59b5e0}
              fill="url(#paint0_linear_2029_837_2)"
              id="Vector"
              stroke="var(--stroke-0, white)"
              strokeOpacity="0.5"
              strokeWidth="1.30145"
            />
            <defs>
              <linearGradient
                gradientUnits="userSpaceOnUse"
                id="paint0_linear_2029_837_2"
                x1="0.650724"
                x2="0.650724"
                y1="1.05289"
                y2="10738"
              >
                <stop stopColor="#FF1A88" stopOpacity="0.6" />
                <stop offset="0.5" stopColor="#FF1A88" stopOpacity="0.3" />
                <stop offset="1" stopColor="#FF1A88" stopOpacity="0.05" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>
      <div className="absolute flex inset-[74.88%_71.5%_5.83%_17.19%] items-center justify-center">
        <div className="-scale-y-100 flex-none h-[100.711px] w-[85.011px]">
          <div className="relative size-full">
            <svg
              className="block size-full"
              fill="none"
              preserveAspectRatio="none"
              viewBox="0 0 85.0108 100.711"
            >
              <path
                d={svgPaths.pe4e4680}
                fill="url(#paint0_linear_2029_809_2)"
                id="Vector 863"
              />
              <defs>
                <linearGradient
                  gradientUnits="userSpaceOnUse"
                  id="paint0_linear_2029_809_2"
                  x1="-1.76424"
                  x2="-1.76424"
                  y1="0"
                  y2="10071.1"
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
      <div
        className="absolute inset-[73.68%_58.48%_5.76%_28.54%]"
        data-name="Vector"
      >
        <div className="absolute inset-[-0.98%_-0.67%]">
          <svg
            className="block size-full"
            fill="none"
            preserveAspectRatio="none"
            viewBox="0 0 98.9101 109.475"
          >
            <path
              d={svgPaths.p3d35e500}
              fill="url(#paint0_linear_2029_833_2)"
              id="Vector"
              stroke="var(--stroke-0, white)"
              strokeOpacity="0.5"
              strokeWidth="1.30145"
            />
            <defs>
              <linearGradient
                gradientUnits="userSpaceOnUse"
                id="paint0_linear_2029_833_2"
                x1="0.650724"
                x2="0.650724"
                y1="1.05289"
                y2="10738"
              >
                <stop stopColor="#1C1C1C" />
                <stop offset="1" stopColor="#121212" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>
      <div
        className="absolute inset-[64.34%_58.48%_16.97%_15.56%]"
        data-name="Vector"
      >
        <svg
          className="block size-full"
          fill="none"
          preserveAspectRatio="none"
          viewBox="0 0 195.217 97.6087"
        >
          <path
            d={svgPaths.p17bb9080}
            fill="url(#paint0_linear_2029_831_2)"
            id="Vector"
          />
          <defs>
            <linearGradient
              gradientUnits="userSpaceOnUse"
              id="paint0_linear_2029_831_2"
              x1="0"
              x2="0"
              y1="0"
              y2="9760.87"
            >
              <stop stopColor="#FF1A88" stopOpacity="0.6" />
              <stop offset="0.5" stopColor="#FF1A88" stopOpacity="0.3" />
              <stop offset="1" stopColor="#FF1A88" stopOpacity="0.05" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      <div
        className="absolute inset-[64.34%_58.48%_26.32%_15.56%]"
        data-name="Vector"
      >
        <div className="absolute inset-[-1.86%_-0.19%_-1.49%_-0.19%]">
          <svg
            className="block size-full"
            fill="none"
            preserveAspectRatio="none"
            viewBox="0 0 195.945 50.4413"
          >
            <path
              d={svgPaths.p23f2a800}
              id="Vector"
              stroke="var(--stroke-0, #FF1A88)"
              strokeWidth="1.62681"
            />
          </svg>
        </div>
      </div>
      <div
        className="absolute inset-[73.68%_84.44%_15.11%_15.56%]"
        data-name="Vector"
      >
        <div className="absolute inset-[0_-0.81px]">
          <svg
            className="block size-full"
            fill="none"
            preserveAspectRatio="none"
            viewBox="0 0 1.62681 58.5652"
          >
            <path
              d="M0.813405 0V58.5652"
              id="Vector"
              stroke="var(--stroke-0, #FF1A88)"
              strokeWidth="1.62681"
            />
          </svg>
        </div>
      </div>
      <div
        className="absolute inset-[73.68%_58.48%_15.11%_41.52%]"
        data-name="Vector"
      >
        <div className="absolute inset-[0_-0.81px]">
          <svg
            className="block size-full"
            fill="none"
            preserveAspectRatio="none"
            viewBox="0 0 1.62681 58.5652"
          >
            <path
              d="M0.813405 0V58.5652"
              id="Vector"
              stroke="var(--stroke-0, #FF1A88)"
              strokeWidth="1.62681"
            />
          </svg>
        </div>
      </div>
      <div
        className="absolute inset-[66.83%_60.21%_16.81%_17.29%]"
        data-name="Vector"
      >
        <svg
          className="block size-full"
          fill="none"
          preserveAspectRatio="none"
          viewBox="0 0 169.188 85.4702"
        >
          <path
            d={svgPaths.p35cac00}
            fill="url(#paint0_linear_2029_807_2)"
            id="Vector"
          />
          <defs>
            <linearGradient
              gradientUnits="userSpaceOnUse"
              id="paint0_linear_2029_807_2"
              x1="-3.51118"
              x2="-3.51118"
              y1="0"
              y2="8547.02"
            >
              <stop stopColor="white" stopOpacity="0.12" />
              <stop offset="0.5" stopColor="white" stopOpacity="0.03" />
              <stop offset="1" stopColor="white" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      <p className="absolute font-['Geist_Mono:Regular',sans-serif] font-normal inset-[72.55%_70.34%_24.96%_27.27%] leading-[normal] text-[9.985px] text-[rgba(255,255,255,0.6)] text-center">
        LLM
      </p>
    </motion.div>
  );
}

// ─── MEM Block (right) ───────────────────────────────────────────
function Group2() {
  return (
    <motion.div
      className="absolute left-0 right-0"
      style={{ top: "13%", bottom: "-13%" }}
      animate={{
        y: [0, -5, 4, -7, 0],
        x: [0, 4, -2, 5, 0],
        scale: [1, 1.008, 0.993, 1.005, 1],
        rotateZ: [0, 0.5, -0.6, 1.0, 0],
      }}
      transition={{
        duration: 8.5,
        repeat: Infinity,
        ease: "easeInOut",
        times: [0, 0.25, 0.5, 0.75, 1],
      }}
    >
      <div
        className="absolute inset-[36.37%_0_44.94%_74.04%]"
        data-name="Vector"
      >
        <div className="absolute inset-[-0.75%]">
          <svg
            className="block size-full"
            fill="none"
            preserveAspectRatio="none"
            viewBox="0 0 198.127 99.0637"
          >
            <path
              d={svgPaths.p817000}
              fill="url(#paint0_linear_2029_805_3)"
              id="Vector"
              stroke="var(--stroke-0, white)"
              strokeOpacity="0.5"
              strokeWidth="1.30145"
            />
            <defs>
              <linearGradient
                gradientUnits="userSpaceOnUse"
                id="paint0_linear_2029_805_3"
                x1="1.45506"
                x2="1.45506"
                y1="0.727532"
                y2="9761.59"
              >
                <stop stopColor="#373737" />
                <stop offset="1" stopColor="#232323" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>
      <div
        className="absolute inset-[45.71%_12.98%_33.73%_74.04%]"
        data-name="Vector"
      >
        <div className="absolute inset-[-0.98%_-0.67%]">
          <svg
            className="block size-full"
            fill="none"
            preserveAspectRatio="none"
            viewBox="0 0 98.9101 109.475"
          >
            <path
              d={svgPaths.p1a59b5e0}
              fill="url(#paint0_linear_2029_837_3)"
              id="Vector"
              stroke="var(--stroke-0, white)"
              strokeOpacity="0.5"
              strokeWidth="1.30145"
            />
            <defs>
              <linearGradient
                gradientUnits="userSpaceOnUse"
                id="paint0_linear_2029_837_3"
                x1="0.650724"
                x2="0.650724"
                y1="1.05289"
                y2="10738"
              >
                <stop stopColor="#FF1A88" stopOpacity="0.6" />
                <stop offset="0.5" stopColor="#FF1A88" stopOpacity="0.3" />
                <stop offset="1" stopColor="#FF1A88" stopOpacity="0.05" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>
      <div className="absolute flex inset-[46.92%_13.02%_33.8%_75.67%] items-center justify-center">
        <div className="-scale-y-100 flex-none h-[100.711px] w-[85.011px]">
          <div className="relative size-full">
            <svg
              className="block size-full"
              fill="none"
              preserveAspectRatio="none"
              viewBox="0 0 85.0108 100.711"
            >
              <path
                d={svgPaths.pe4e4680}
                fill="url(#paint0_linear_2029_809_3)"
                id="Vector 863"
              />
              <defs>
                <linearGradient
                  gradientUnits="userSpaceOnUse"
                  id="paint0_linear_2029_809_3"
                  x1="-1.76424"
                  x2="-1.76424"
                  y1="0"
                  y2="10071.1"
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
      <div
        className="absolute inset-[45.71%_0_33.73%_87.02%]"
        data-name="Vector"
      >
        <div className="absolute inset-[-0.98%_-0.67%]">
          <svg
            className="block size-full"
            fill="none"
            preserveAspectRatio="none"
            viewBox="0 0 98.9101 109.475"
          >
            <path
              d={svgPaths.p3d35e500}
              fill="url(#paint0_linear_2029_833_3)"
              id="Vector"
              stroke="var(--stroke-0, white)"
              strokeOpacity="0.5"
              strokeWidth="1.30145"
            />
            <defs>
              <linearGradient
                gradientUnits="userSpaceOnUse"
                id="paint0_linear_2029_833_3"
                x1="0.650724"
                x2="0.650724"
                y1="1.05289"
                y2="10738"
              >
                <stop stopColor="#1C1C1C" />
                <stop offset="1" stopColor="#121212" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>
      <div
        className="absolute inset-[36.37%_0_44.94%_74.04%]"
        data-name="Vector"
      >
        <svg
          className="block size-full"
          fill="none"
          preserveAspectRatio="none"
          viewBox="0 0 195.217 97.6087"
        >
          <path
            d={svgPaths.p17bb9080}
            fill="url(#paint0_linear_2029_831_3)"
            id="Vector"
          />
          <defs>
            <linearGradient
              gradientUnits="userSpaceOnUse"
              id="paint0_linear_2029_831_3"
              x1="0"
              x2="0"
              y1="0"
              y2="9760.87"
            >
              <stop stopColor="#FF1A88" stopOpacity="0.6" />
              <stop offset="0.5" stopColor="#FF1A88" stopOpacity="0.3" />
              <stop offset="1" stopColor="#FF1A88" stopOpacity="0.05" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      <div
        className="absolute inset-[36.37%_0_54.29%_74.04%]"
        data-name="Vector"
      >
        <div className="absolute inset-[-1.86%_-0.19%_-1.49%_-0.19%]">
          <svg
            className="block size-full"
            fill="none"
            preserveAspectRatio="none"
            viewBox="0 0 195.945 50.4413"
          >
            <path
              d={svgPaths.p23f2a800}
              id="Vector"
              stroke="var(--stroke-0, #FF1A88)"
              strokeWidth="1.62681"
            />
          </svg>
        </div>
      </div>
      <div
        className="absolute inset-[45.71%_25.96%_43.07%_74.04%]"
        data-name="Vector"
      >
        <div className="absolute inset-[0_-0.81px]">
          <svg
            className="block size-full"
            fill="none"
            preserveAspectRatio="none"
            viewBox="0 0 1.62681 58.5652"
          >
            <path
              d="M0.813405 0V58.5652"
              id="Vector"
              stroke="var(--stroke-0, #FF1A88)"
              strokeWidth="1.62681"
            />
          </svg>
        </div>
      </div>
      <div
        className="absolute bottom-[43.07%] left-full right-0 top-[45.71%]"
        data-name="Vector"
      >
        <div className="absolute inset-[0_-0.81px]">
          <svg
            className="block size-full"
            fill="none"
            preserveAspectRatio="none"
            viewBox="0 0 1.62681 58.5652"
          >
            <path
              d="M0.813405 0V58.5652"
              id="Vector"
              stroke="var(--stroke-0, #FF1A88)"
              strokeWidth="1.62681"
            />
          </svg>
        </div>
      </div>
      <div
        className="absolute inset-[38.86%_1.73%_44.77%_75.77%]"
        data-name="Vector"
      >
        <svg
          className="block size-full"
          fill="none"
          preserveAspectRatio="none"
          viewBox="0 0 169.188 85.4702"
        >
          <path
            d={svgPaths.p35cac00}
            fill="url(#paint0_linear_2029_807_3)"
            id="Vector"
          />
          <defs>
            <linearGradient
              gradientUnits="userSpaceOnUse"
              id="paint0_linear_2029_807_3"
              x1="-3.51118"
              x2="-3.51118"
              y1="0"
              y2="8547.02"
            >
              <stop stopColor="white" stopOpacity="0.12" />
              <stop offset="0.5" stopColor="white" stopOpacity="0.03" />
              <stop offset="1" stopColor="white" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      <p className="absolute font-['Geist_Mono:Regular',sans-serif] font-normal inset-[44.58%_11.85%_52.93%_85.75%] leading-[normal] text-[9.985px] text-[rgba(255,255,255,0.6)] text-center">
        MEM
      </p>
    </motion.div>
  );
}

// ─── Agent Builder Center ────────────────────────────────────────
// NOTE: AGENT/Builder text now lives inside the top pink stacking layer
function Group3() {
  return (
    <div className="absolute contents left-[268.82px] top-0">
      <div
        className="absolute h-[166.772px] left-[273.99px] top-[136.56px] w-[244.649px]"
        data-name="Union"
      >
        <svg
          className="block size-full"
          fill="none"
          preserveAspectRatio="none"
          viewBox="0 0 244.649 166.772"
        >
          <path
            d={svgPaths.p21b7a500}
            fill="var(--fill-0, #FF5CAA)"
            id="Union"
          />
        </svg>
      </div>
      <div
        className="absolute h-[88.067px] left-[284.42px] top-[132.47px] w-[55.059px]"
        data-name="Union"
      >
        <svg
          className="block size-full"
          fill="none"
          preserveAspectRatio="none"
          viewBox="0 0 55.0586 88.0674"
        >
          <path
            d={svgPaths.p108b1200}
            fill="var(--fill-0, #FF5CAA)"
            id="Union"
          />
        </svg>
      </div>
      <div
        className="absolute h-[165.404px] left-[268.82px] top-[54.07px] w-[197.213px]"
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
              id="Highlight"
              stroke="var(--stroke-0, #FFB3D7)"
              strokeWidth="1.59043"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}

// ─── Connection path definitions ─────────────────────────────────
const PATHS = {
  tools: "M 98 55 C 180 55 240 75 290 120 C 320 145 335 165 340 180",
  llm: "M 200 387 C 240 380 275 360 305 330 C 325 305 335 285 340 270",
  mem: "M 635 313 C 580 310 520 290 475 260 C 435 235 405 215 380 190",
};

// ─── Data Flow Connection Overlay ────────────────────────────────
function DataFlowConnections() {
  return (
    <svg
      className="absolute inset-0 pointer-events-none w-full h-full"
      preserveAspectRatio="none"
      viewBox="0 0 752 526"
      style={{ zIndex: 5 }}
    >
      <defs>
        {/* Glow filter for data packets */}
        <filter id="packetGlow" x="-200%" y="-200%" width="500%" height="500%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
          <feColorMatrix
            in="blur"
            type="matrix"
            values="1 0 0 0 0  0 0.1 0 0 0  0 0 0.5 0 0  0 0 0 1 0"
            result="colored"
          />
          <feMerge>
            <feMergeNode in="colored" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Softer glow for connection lines */}
        <filter id="lineGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="4" />
        </filter>

        {/* Radial glow for pulse waves */}
        <radialGradient id="pulseGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FF1A88" stopOpacity="0.25" />
          <stop offset="60%" stopColor="#FF1A88" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#FF1A88" stopOpacity="0" />
        </radialGradient>

        {/* Animated gradient sweeps per connection */}
        {[
          { id: "flowGrad1", dur: "4.5s" },
          { id: "flowGrad2", dur: "5.2s" },
          { id: "flowGrad3", dur: "4s" },
        ].map(({ id, dur }) => (
          <linearGradient key={id} id={id}>
            <stop offset="0%" stopColor="#FF1A88" stopOpacity="0">
              <animate
                attributeName="offset"
                values="-0.3;1.3"
                dur={dur}
                repeatCount="indefinite"
              />
            </stop>
            <stop offset="12%" stopColor="#FF1A88" stopOpacity="0.35">
              <animate
                attributeName="offset"
                values="-0.18;1.42"
                dur={dur}
                repeatCount="indefinite"
              />
            </stop>
            <stop offset="25%" stopColor="#FF1A88" stopOpacity="0.75">
              <animate
                attributeName="offset"
                values="-0.05;1.55"
                dur={dur}
                repeatCount="indefinite"
              />
            </stop>
            <stop offset="38%" stopColor="#FF1A88" stopOpacity="0.35">
              <animate
                attributeName="offset"
                values="0.08;1.68"
                dur={dur}
                repeatCount="indefinite"
              />
            </stop>
            <stop offset="50%" stopColor="#FF1A88" stopOpacity="0">
              <animate
                attributeName="offset"
                values="0.2;1.8"
                dur={dur}
                repeatCount="indefinite"
              />
            </stop>
          </linearGradient>
        ))}

        {/* Secondary sweep gradients (offset timing for double-pulse) */}
        {[
          { id: "flowGrad1b", dur: "4.5s", delay: "2.25s" },
          { id: "flowGrad2b", dur: "5.2s", delay: "2.6s" },
          { id: "flowGrad3b", dur: "4s", delay: "2s" },
        ].map(({ id, dur }) => (
          <linearGradient key={id} id={id}>
            <stop offset="0%" stopColor="#FF1A88" stopOpacity="0">
              <animate
                attributeName="offset"
                values="0.5;1.3;-0.3;0.5"
                dur={dur}
                repeatCount="indefinite"
              />
            </stop>
            <stop offset="12%" stopColor="#FF1A88" stopOpacity="0.2">
              <animate
                attributeName="offset"
                values="0.62;1.42;-0.18;0.62"
                dur={dur}
                repeatCount="indefinite"
              />
            </stop>
            <stop offset="25%" stopColor="#FF1A88" stopOpacity="0.5">
              <animate
                attributeName="offset"
                values="0.75;1.55;-0.05;0.75"
                dur={dur}
                repeatCount="indefinite"
              />
            </stop>
            <stop offset="38%" stopColor="#FF1A88" stopOpacity="0.2">
              <animate
                attributeName="offset"
                values="0.88;1.68;0.08;0.88"
                dur={dur}
                repeatCount="indefinite"
              />
            </stop>
            <stop offset="50%" stopColor="#FF1A88" stopOpacity="0">
              <animate
                attributeName="offset"
                values="1.0;1.8;0.2;1.0"
                dur={dur}
                repeatCount="indefinite"
              />
            </stop>
          </linearGradient>
        ))}
      </defs>

      {/* ── Agent Builder center pulse waves ── */}
      <circle cx="368" cy="180" r="20" fill="url(#pulseGrad)" opacity="0">
        <animate
          attributeName="r"
          values="20;90"
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
      <circle cx="368" cy="180" r="20" fill="url(#pulseGrad)" opacity="0">
        <animate
          attributeName="r"
          values="20;90"
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
      {Object.values(PATHS).map((d, i) => (
        <path
          key={`glow-${i}`}
          d={d}
          fill="none"
          stroke="#FF1A88"
          strokeWidth="8"
          strokeLinecap="round"
          opacity="0.04"
          filter="url(#lineGlow)"
        />
      ))}

      {/* ── Base connection paths (static dotted) ── */}
      {Object.values(PATHS).map((d, i) => (
        <path
          key={`base-${i}`}
          d={d}
          fill="none"
          stroke="rgba(255,26,136,0.12)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeDasharray="5 4"
        />
      ))}

      {/* ── Primary gradient sweeps ── */}
      <path
        d={PATHS.tools}
        fill="none"
        stroke="url(#flowGrad1)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="5 4"
      />
      <path
        d={PATHS.llm}
        fill="none"
        stroke="url(#flowGrad2)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="5 4"
      />
      <path
        d={PATHS.mem}
        fill="none"
        stroke="url(#flowGrad3)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="5 4"
      />

      {/* ── Secondary gradient sweeps (staggered double-pulse) ── */}
      <path
        d={PATHS.tools}
        fill="none"
        stroke="url(#flowGrad1b)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray="5 4"
      />
      <path
        d={PATHS.llm}
        fill="none"
        stroke="url(#flowGrad2b)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray="5 4"
      />
      <path
        d={PATHS.mem}
        fill="none"
        stroke="url(#flowGrad3b)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray="5 4"
      />

      {/* ── Traveling data packets (glowing orbs along paths) ── */}
      {[
        { path: PATHS.tools, dur: "3.8s", delays: ["0s", "1.9s"] },
        { path: PATHS.llm, dur: "4.2s", delays: ["0.6s", "2.7s"] },
        { path: PATHS.mem, dur: "3.4s", delays: ["0.3s", "2s"] },
      ].map((conn, ci) =>
        conn.delays.map((delay, di) => (
          <g key={`packet-${ci}-${di}`} filter="url(#packetGlow)">
            {/* Outer glow */}
            <circle
              r="6"
              fill="none"
              stroke="#FF1A88"
              strokeWidth="1"
              opacity="0.3"
            >
              <animateMotion
                dur={conn.dur}
                begin={delay}
                repeatCount="indefinite"
                path={conn.path}
                rotate="auto"
              />
            </circle>
            {/* Core */}
            <circle r="2.5" fill="#FF1A88" opacity="0.9">
              <animateMotion
                dur={conn.dur}
                begin={delay}
                repeatCount="indefinite"
                path={conn.path}
                rotate="auto"
              />
            </circle>
            {/* Bright center */}
            <circle r="1" fill="#FFB3D7" opacity="1">
              <animateMotion
                dur={conn.dur}
                begin={delay}
                repeatCount="indefinite"
                path={conn.path}
                rotate="auto"
              />
            </circle>
          </g>
        )),
      )}

      {/* ── Endpoint glow halos at block origins ── */}
      {[
        { cx: 98, cy: 55 },
        { cx: 200, cy: 387 },
        { cx: 635, cy: 313 },
      ].map((pt, i) => (
        <circle
          key={`halo-${i}`}
          cx={pt.cx}
          cy={pt.cy}
          r="8"
          fill="none"
          stroke="#FF1A88"
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
    </svg>
  );
}

// ─── Main Illustration ───────────────────────────────────────────
export function AgentBuilderIllustration() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 1.2 }}
      className="w-full flex items-center justify-center"
    >
      <div className="relative w-full max-w-[700px] aspect-[752/526]">
        {/* Ambient particle field */}
        <ParticleCanvas />

        {/* Ambient radial glow behind Agent Builder */}
        <motion.div
          className="absolute pointer-events-none"
          style={{
            left: "45%",
            top: "20%",
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

        {/* Isometric blocks with organic floating */}
        <Group />
        <Group1 />
        <Group2 />

        {/* Agent Builder stacking layers */}
        <motion.div
          className="absolute h-[249.697px] left-[268.82px] top-0 w-[197.213px]"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.5 }}
          style={{ zIndex: 3 }}
        >
          {/* Dark stacking layers — bidirectional stack/destack */}
          {/* Build: layers arrive one-at-a-time (bottom→top), ~0.56s each, no overlap */}
          {/* Hold: ALL layers assembled at y=0, opacity=1 for ~3.2s */}
          {/* Teardown: layers depart one-at-a-time (top→bottom), ~0.56s each, no overlap */}
          {[
            {
              paths: [
                svgPaths.p30a40100,
                svgPaths.p31aa8cf0,
                svgPaths.pa5f6600,
              ],
              // Layer 0 (bottom): arrives first (0.02→0.09), departs last (0.91→0.98)
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
              // Layer 1 (middle): arrives second (0.09→0.16), departs third (0.84→0.91)
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
              // Layer 2 (upper): arrives third (0.16→0.23), departs second (0.77→0.84)
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
                    <path key={j} d={path} fill="var(--fill-0, #431D30)" />
                  ))}
                </g>
              </svg>
            </motion.div>
          ))}

          {/* Top pink layer + AGENT/Builder text — arrives last (0.23→0.30), departs first (0.70→0.77) */}
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
            {/* AGENT / Builder text — rides with top pink layer */}
            <p
              className="absolute left-1/2 -translate-x-1/2 font-['Geist_Mono:Bold',sans-serif] text-[22.384px] text-center text-white whitespace-nowrap pointer-events-none"
              style={{ top: "18%", zIndex: 10 }}
            >
              AGENT
            </p>
            <p
              className="absolute left-1/2 -translate-x-1/2 font-['Geist_Mono:Regular',sans-serif] font-normal text-[13.227px] text-[rgba(255,255,255,0.95)] text-center whitespace-nowrap pointer-events-none"
              style={{ top: "26%", zIndex: 10 }}
            >
              Builder
            </p>
          </motion.div>
        </motion.div>

        {/* Data flow connections with packets */}
        <DataFlowConnections />

        {/* Agent Builder labels and highlight */}
        <Group3 />

        {/* Subtle horizontal scan line */}
        <motion.div
          className="absolute inset-x-0 pointer-events-none"
          style={{
            height: "1px",
            background:
              "linear-gradient(90deg, transparent 0%, rgba(255,26,136,0.15) 30%, rgba(255,26,136,0.25) 50%, rgba(255,26,136,0.15) 70%, transparent 100%)",
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
