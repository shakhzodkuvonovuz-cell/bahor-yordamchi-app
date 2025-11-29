import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import bahorLogo from "@/assets/bahor-logo.png";

interface VoiceOrbProps {
  state: "listening" | "thinking" | "speaking" | "idle";
  amplitude?: number;
  className?: string;
}

interface ParticleData {
  angle: number;
  baseOrbitRadius: number;
  orbitRadius: number;
  speed: number;
  size: number;
  alpha: number;
  phase: number;
}

function createParticle(index: number, total: number): ParticleData {
  return {
    angle: (index / total) * Math.PI * 2,
    baseOrbitRadius: 78 + (index % 3) * 6,
    orbitRadius: 78 + (index % 3) * 6,
    speed: 0.004 + (index % 2) * 0.002,
    size: 1.2 + (index % 3) * 0.4,
    alpha: 0.5 + (index % 4) * 0.1,
    phase: index * 0.5,
  };
}

function updateParticle(p: ParticleData, time: number, voiceAmp: number, isActive: boolean) {
  const speedMult = isActive ? 1.5 : 0.8;
  p.angle += p.speed * speedMult;
  const ampEffect = isActive ? Math.sin(time * 0.05 + p.phase) * 4 * voiceAmp : 0;
  p.orbitRadius = p.baseOrbitRadius + ampEffect;
}

function drawParticle(
  ctx: CanvasRenderingContext2D,
  p: ParticleData,
  cx: number,
  cy: number,
  intensity: number,
  teal: { r: number; g: number; b: number }
) {
  const x = cx + Math.cos(p.angle) * p.orbitRadius;
  const y = cy + Math.sin(p.angle) * p.orbitRadius;
  
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, p.size * 2);
  gradient.addColorStop(0, `rgba(${teal.r}, ${teal.g}, ${teal.b}, ${p.alpha * intensity})`);
  gradient.addColorStop(1, `rgba(${teal.r}, ${teal.g}, ${teal.b}, 0)`);
  
  ctx.beginPath();
  ctx.arc(x, y, p.size * 2, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();
}

export default function VoiceOrb({ state, amplitude = 0.5, className }: VoiceOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const particlesRef = useRef<ParticleData[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const size = 280;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    let time = 0;
    const centerX = size / 2;
    const centerY = size / 2;

    const teal = { r: 0, g: 199, b: 177 };

    // Initialize particles once
    if (particlesRef.current.length === 0) {
      const particleCount = 16;
      for (let i = 0; i < particleCount; i++) {
        particlesRef.current.push(createParticle(i, particleCount));
      }
    }

    const getIntensity = () => {
      switch (state) {
        case "listening": return 1.0;
        case "thinking": return 0.6;
        case "speaking": return 0.9;
        default: return 0.35;
      }
    };

    const animate = () => {
      if (!ctx || !canvas) return;
      
      ctx.clearRect(0, 0, size, size);
      const intensity = getIntensity();
      const isActive = state !== "idle";

      // Layer 1: Deep ambient glow
      const ambientGlow = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 100);
      ambientGlow.addColorStop(0, `rgba(${teal.r}, ${teal.g}, ${teal.b}, ${0.06 * intensity})`);
      ambientGlow.addColorStop(0.6, `rgba(${teal.r}, ${teal.g}, ${teal.b}, ${0.02 * intensity})`);
      ambientGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = ambientGlow;
      ctx.fillRect(0, 0, size, size);

      // Layer 2: Main glowing ring
      const ringRadius = 65;
      const breathe = Math.sin(time * 0.02) * 2 * intensity;
      
      const ringGlow = ctx.createRadialGradient(
        centerX, centerY, ringRadius - 8,
        centerX, centerY, ringRadius + 12
      );
      ringGlow.addColorStop(0, `rgba(${teal.r}, ${teal.g}, ${teal.b}, 0)`);
      ringGlow.addColorStop(0.4, `rgba(${teal.r}, ${teal.g}, ${teal.b}, ${0.25 * intensity})`);
      ringGlow.addColorStop(0.6, `rgba(${teal.r}, ${teal.g}, ${teal.b}, ${0.35 * intensity})`);
      ringGlow.addColorStop(1, `rgba(${teal.r}, ${teal.g}, ${teal.b}, 0)`);
      
      ctx.beginPath();
      ctx.arc(centerX, centerY, ringRadius + breathe, 0, Math.PI * 2);
      ctx.strokeStyle = ringGlow;
      ctx.lineWidth = 10;
      ctx.stroke();

      // Layer 3: Voice-reactive soft ring distortion
      if (isActive) {
        ctx.beginPath();
        const points = 48;
        for (let i = 0; i <= points; i++) {
          const angle = (i / points) * Math.PI * 2;
          const distort = Math.sin(angle * 3 + time * 0.04) * 3 * amplitude;
          const r = ringRadius + breathe + distort;
          const x = centerX + Math.cos(angle) * r;
          const y = centerY + Math.sin(angle) * r;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.strokeStyle = `rgba(${teal.r}, ${teal.g}, ${teal.b}, ${0.15 * intensity})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Layer 4: Orbiting particles
      particlesRef.current.forEach(p => {
        updateParticle(p, time, amplitude, isActive);
        drawParticle(ctx, p, centerX, centerY, intensity, teal);
      });

      time++;
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [state, amplitude]);

  const getOrbGlow = () => {
    switch (state) {
      case "listening":
        return "shadow-[0_0_50px_rgba(0,199,177,0.35),0_0_25px_rgba(0,199,177,0.2)]";
      case "thinking":
        return "shadow-[0_0_35px_rgba(0,199,177,0.25),0_0_18px_rgba(0,199,177,0.12)]";
      case "speaking":
        return "shadow-[0_0_55px_rgba(0,199,177,0.4),0_0_28px_rgba(0,199,177,0.25)]";
      default:
        return "shadow-[0_0_20px_rgba(0,199,177,0.12)]";
    }
  };

  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      <canvas
        ref={canvasRef}
        className="absolute w-[280px] h-[280px]"
        style={{ width: 280, height: 280 }}
      />

      <div
        className={cn(
          "relative w-[100px] h-[100px] rounded-full",
          "flex items-center justify-center",
          "bg-[#030d0c]",
          "border border-[rgba(0,199,177,0.12)]",
          getOrbGlow(),
          "transition-all duration-700 ease-out"
        )}
      >
        <div 
          className="absolute inset-0 rounded-full"
          style={{
            background: "radial-gradient(circle at 35% 30%, rgba(0,199,177,0.06) 0%, transparent 55%)"
          }}
        />

        <div className={cn(
          "relative z-10 w-12 h-12",
          "transition-all duration-600",
          state === "thinking" && "animate-voice-logo-rotate"
        )}>
          <img
            src={bahorLogo}
            alt="Bahor AI"
            className="w-full h-full object-contain transition-all duration-500"
            style={{
              filter: state !== "idle" 
                ? "drop-shadow(0 0 10px rgba(0,199,177,0.5)) brightness(1.1)" 
                : "drop-shadow(0 0 5px rgba(0,199,177,0.25))"
            }}
          />
        </div>
      </div>
    </div>
  );
}
