import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import bahorLogo from "@/assets/bahor-logo.png";

interface VoiceOrbProps {
  state: "listening" | "thinking" | "speaking" | "idle";
  amplitude?: number;
  className?: string;
}

export default function VoiceOrb({ state, amplitude = 0.5, className }: VoiceOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const size = 320;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    let time = 0;
    const centerX = size / 2;
    const centerY = size / 2;

    // Bahor AI brand colors
    const teal = { r: 0, g: 224, b: 200 };
    const deepTeal = { r: 0, g: 180, b: 160 };
    const cyan = { r: 0, g: 200, b: 220 };

    const getIntensity = () => {
      switch (state) {
        case "listening": return { base: 0.9, pulse: 0.4, ring: 1.2 };
        case "thinking": return { base: 0.6, pulse: 0.6, ring: 0.8 };
        case "speaking": return { base: 1.0, pulse: 0.3, ring: 1.0 };
        default: return { base: 0.4, pulse: 0.2, ring: 0.5 };
      }
    };

    const animate = () => {
      if (!ctx || !canvas) return;
      
      ctx.clearRect(0, 0, size, size);
      const intensity = getIntensity();

      // Ambient particles (elegant, slow moving)
      if (state !== "idle") {
        const particleCount = 12;
        for (let i = 0; i < particleCount; i++) {
          const angle = (time * 0.003 + i * Math.PI * 2 / particleCount);
          const radius = 100 + Math.sin(time * 0.01 + i * 0.5) * 30;
          const x = centerX + Math.cos(angle) * radius;
          const y = centerY + Math.sin(angle) * radius;
          const particleAlpha = 0.15 + Math.sin(time * 0.02 + i) * 0.1;
          
          ctx.beginPath();
          ctx.arc(x, y, 1.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${teal.r}, ${teal.g}, ${teal.b}, ${particleAlpha * intensity.base})`;
          ctx.fill();
        }
      }

      // Ring 3 (outermost) - organic distorted ring reacting to voice
      const ring3Radius = 115 + Math.sin(time * 0.02) * 5 * intensity.pulse;
      const ring3Points = 80;
      
      ctx.beginPath();
      for (let i = 0; i <= ring3Points; i++) {
        const angle = (i / ring3Points) * Math.PI * 2;
        const voiceDistort = state === "listening" 
          ? Math.sin(angle * 6 + time * 0.08) * 8 * amplitude 
          : Math.sin(angle * 4 + time * 0.03) * 3;
        const r = ring3Radius + voiceDistort;
        const x = centerX + Math.cos(angle) * r;
        const y = centerY + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = `rgba(${teal.r}, ${teal.g}, ${teal.b}, ${0.15 * intensity.ring})`;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Ring 2 (middle) - smooth pulsing ring
      const ring2Radius = 90 + Math.sin(time * 0.025) * 4 * intensity.pulse;
      ctx.beginPath();
      ctx.arc(centerX, centerY, ring2Radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${cyan.r}, ${cyan.g}, ${cyan.b}, ${0.2 * intensity.ring})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Ring 1 (inner) - breathing glow ring
      const ring1Radius = 70 + Math.sin(time * 0.03) * 3 * intensity.pulse;
      const ring1Gradient = ctx.createRadialGradient(
        centerX, centerY, ring1Radius - 10,
        centerX, centerY, ring1Radius + 5
      );
      ring1Gradient.addColorStop(0, `rgba(${teal.r}, ${teal.g}, ${teal.b}, 0)`);
      ring1Gradient.addColorStop(0.5, `rgba(${teal.r}, ${teal.g}, ${teal.b}, ${0.25 * intensity.base})`);
      ring1Gradient.addColorStop(1, `rgba(${teal.r}, ${teal.g}, ${teal.b}, 0)`);
      
      ctx.beginPath();
      ctx.arc(centerX, centerY, ring1Radius, 0, Math.PI * 2);
      ctx.strokeStyle = ring1Gradient;
      ctx.lineWidth = 8;
      ctx.stroke();

      // Fog-like glow behind core
      const fogGradient = ctx.createRadialGradient(
        centerX, centerY, 0,
        centerX, centerY, 130
      );
      fogGradient.addColorStop(0, `rgba(${teal.r}, ${teal.g}, ${teal.b}, ${0.08 * intensity.base})`);
      fogGradient.addColorStop(0.5, `rgba(${deepTeal.r}, ${deepTeal.g}, ${deepTeal.b}, ${0.04 * intensity.base})`);
      fogGradient.addColorStop(1, "rgba(0, 0, 0, 0)");
      
      ctx.fillStyle = fogGradient;
      ctx.fillRect(0, 0, size, size);

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
        return "shadow-[0_0_80px_rgba(0,224,200,0.35),0_0_40px_rgba(0,224,200,0.2)]";
      case "thinking":
        return "shadow-[0_0_60px_rgba(0,200,220,0.3),0_0_30px_rgba(0,200,220,0.15)]";
      case "speaking":
        return "shadow-[0_0_90px_rgba(0,224,200,0.4),0_0_45px_rgba(0,224,200,0.25)]";
      default:
        return "shadow-[0_0_30px_rgba(0,200,180,0.15)]";
    }
  };

  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      {/* Canvas for rings and particles */}
      <canvas
        ref={canvasRef}
        className="absolute w-[320px] h-[320px]"
        style={{ width: 320, height: 320 }}
      />

      {/* Core orb with logo */}
      <div
        className={cn(
          "relative w-[140px] h-[140px] rounded-full",
          "flex items-center justify-center",
          "bg-gradient-to-br from-[hsl(172,45%,10%)] via-[hsl(175,40%,12%)] to-[hsl(170,35%,8%)]",
          "border border-[rgba(0,224,200,0.12)]",
          getOrbGlow(),
          "transition-all duration-700 ease-out",
          state === "listening" && "animate-voice-core-breathe",
          state === "thinking" && "animate-voice-core-think",
          state === "speaking" && "animate-voice-core-speak"
        )}
      >
        {/* Inner glow overlay */}
        <div 
          className="absolute inset-0 rounded-full"
          style={{
            background: "radial-gradient(circle at 40% 35%, rgba(255,255,255,0.06) 0%, transparent 50%)"
          }}
        />

        {/* Bahor AI Logo */}
        <div className={cn(
          "relative z-10 w-16 h-16",
          "transition-all duration-500",
          state !== "idle" && "animate-voice-logo-pulse"
        )}>
          <img
            src={bahorLogo}
            alt="Bahor AI"
            className={cn(
              "w-full h-full object-contain",
              "transition-all duration-500"
            )}
            style={{
              filter: state !== "idle" 
                ? "drop-shadow(0 0 15px rgba(0,224,200,0.5)) brightness(1.1)" 
                : "drop-shadow(0 0 8px rgba(0,224,200,0.25))"
            }}
          />
        </div>
      </div>
    </div>
  );
}
