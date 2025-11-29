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
    const size = 360;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    let time = 0;
    const centerX = size / 2;
    const centerY = size / 2;
    const coreRadius = 85;

    // Bahor AI colors
    const colors = {
      primary: [0, 224, 200],      // #00E0C8
      secondary: [0, 200, 180],    // Teal
      glow: [0, 230, 210],         // Bright glow
      accent: [80, 255, 220],      // Accent
    };

    const getIntensity = () => {
      switch (state) {
        case "listening": return { mult: 1 + amplitude * 0.5, glow: 0.7 };
        case "thinking": return { mult: 0.8, glow: 0.5 };
        case "speaking": return { mult: 1.2 + amplitude * 0.3, glow: 0.8 };
        default: return { mult: 0.4, glow: 0.25 };
      }
    };

    const animate = () => {
      if (!ctx || !canvas) return;
      
      ctx.clearRect(0, 0, size, size);
      const intensity = getIntensity();

      // Layer 3: Outer organic field (magnetic field effect)
      if (state !== "idle") {
        const fieldPoints = 120;
        const baseFieldRadius = coreRadius + 45;
        
        ctx.beginPath();
        for (let i = 0; i <= fieldPoints; i++) {
          const angle = (i / fieldPoints) * Math.PI * 2;
          
          // Organic irregular waveform
          const wave1 = Math.sin(angle * 3 + time * 0.025) * 18 * intensity.mult;
          const wave2 = Math.cos(angle * 5 - time * 0.03) * 12 * intensity.mult;
          const wave3 = Math.sin(angle * 7 + time * 0.04) * 8 * amplitude;
          const wave4 = Math.cos(angle * 2 - time * 0.015) * 6;
          
          // Voice reactivity
          const voiceWave = state === "listening" || state === "speaking" 
            ? Math.sin(angle * 9 + time * 0.08) * 15 * amplitude 
            : 0;
          
          const r = baseFieldRadius + wave1 + wave2 + wave3 + wave4 + voiceWave;
          const x = centerX + Math.cos(angle) * r;
          const y = centerY + Math.sin(angle) * r;
          
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        
        // Gradient stroke for outer field
        const fieldGradient = ctx.createLinearGradient(0, 0, size, size);
        fieldGradient.addColorStop(0, `rgba(${colors.primary.join(",")}, ${0.5 * intensity.glow})`);
        fieldGradient.addColorStop(0.5, `rgba(${colors.accent.join(",")}, ${0.7 * intensity.glow})`);
        fieldGradient.addColorStop(1, `rgba(${colors.secondary.join(",")}, ${0.5 * intensity.glow})`);
        
        ctx.strokeStyle = fieldGradient;
        ctx.lineWidth = 2;
        ctx.shadowColor = `rgba(${colors.glow.join(",")}, ${0.5 * intensity.glow})`;
        ctx.shadowBlur = 25;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // Layer 2: Mid pulse ring (breathing effect)
      const pulseRadius = coreRadius + 20 + Math.sin(time * 0.03) * 8 * intensity.mult;
      const pulseOpacity = 0.15 + Math.sin(time * 0.025) * 0.1;
      
      ctx.beginPath();
      ctx.arc(centerX, centerY, pulseRadius, 0, Math.PI * 2);
      
      const pulseGradient = ctx.createRadialGradient(
        centerX, centerY, pulseRadius * 0.7,
        centerX, centerY, pulseRadius
      );
      pulseGradient.addColorStop(0, `rgba(${colors.primary.join(",")}, 0)`);
      pulseGradient.addColorStop(0.7, `rgba(${colors.primary.join(",")}, ${pulseOpacity * intensity.glow})`);
      pulseGradient.addColorStop(1, `rgba(${colors.glow.join(",")}, ${pulseOpacity * 0.5 * intensity.glow})`);
      
      ctx.fillStyle = pulseGradient;
      ctx.fill();

      // Particle shimmer around the orb
      if (state !== "idle") {
        const particleCount = 20;
        for (let i = 0; i < particleCount; i++) {
          const particleAngle = (time * 0.008 + i * Math.PI * 2 / particleCount);
          const particleRadius = coreRadius + 50 + Math.sin(time * 0.02 + i) * 20;
          const particleX = centerX + Math.cos(particleAngle) * particleRadius;
          const particleY = centerY + Math.sin(particleAngle) * particleRadius;
          const particleSize = 1.5 + Math.sin(time * 0.03 + i * 0.5) * 0.8;
          const particleAlpha = 0.3 + Math.sin(time * 0.04 + i) * 0.2;
          
          ctx.beginPath();
          ctx.arc(particleX, particleY, particleSize, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${colors.accent.join(",")}, ${particleAlpha * intensity.glow})`;
          ctx.shadowColor = `rgba(${colors.glow.join(",")}, 0.5)`;
          ctx.shadowBlur = 8;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }

      // Inner glow halo
      const innerGlow = ctx.createRadialGradient(
        centerX, centerY, coreRadius * 0.5,
        centerX, centerY, coreRadius + 30
      );
      innerGlow.addColorStop(0, `rgba(${colors.glow.join(",")}, ${0.1 * intensity.glow})`);
      innerGlow.addColorStop(0.6, `rgba(${colors.primary.join(",")}, ${0.05 * intensity.glow})`);
      innerGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
      
      ctx.fillStyle = innerGlow;
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
        return "shadow-[0_0_100px_rgba(0,224,200,0.5),0_0_50px_rgba(0,224,200,0.3)]";
      case "thinking":
        return "shadow-[0_0_80px_rgba(0,200,220,0.4),0_0_40px_rgba(0,200,220,0.25)]";
      case "speaking":
        return "shadow-[0_0_120px_rgba(80,255,220,0.5),0_0_60px_rgba(80,255,220,0.3)]";
      default:
        return "shadow-[0_0_40px_rgba(0,200,180,0.2)]";
    }
  };

  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      {/* Canvas for outer effects */}
      <canvas
        ref={canvasRef}
        className="absolute w-[360px] h-[360px]"
        style={{ width: 360, height: 360 }}
      />

      {/* Layer 1: Inner core with Bahor AI logo */}
      <div
        className={cn(
          "relative w-[170px] h-[170px] rounded-full",
          "flex items-center justify-center",
          "bg-gradient-to-br from-[hsl(172,50%,12%)] via-[hsl(175,45%,15%)] to-[hsl(170,40%,10%)]",
          "border border-[rgba(0,224,200,0.15)]",
          getOrbGlow(),
          "transition-all duration-700 ease-out",
          state !== "idle" && "scale-[1.02]"
        )}
      >
        {/* Inner shine gradient */}
        <div 
          className="absolute inset-0 rounded-full"
          style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 40%, rgba(0,0,0,0.15) 100%)"
          }}
        />

        {/* Inner glow ring */}
        <div 
          className={cn(
            "absolute inset-3 rounded-full",
            "border border-[rgba(0,224,200,0.1)]",
            "transition-all duration-500"
          )}
          style={{
            boxShadow: state !== "idle" 
              ? "inset 0 0 40px rgba(0,224,200,0.08)" 
              : "inset 0 0 20px rgba(0,224,200,0.03)"
          }}
        />

        {/* Bahor AI Logo - Layer 1 inner core */}
        <div className={cn(
          "relative z-10 w-20 h-20",
          "transition-all duration-1000",
          state !== "idle" && "animate-voice-logo-glow"
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
                ? "drop-shadow(0 0 20px rgba(0,224,200,0.6)) brightness(1.15)" 
                : "drop-shadow(0 0 10px rgba(0,224,200,0.3))"
            }}
          />
        </div>

        {/* Soft breathing overlay */}
        <div 
          className={cn(
            "absolute inset-0 rounded-full",
            "transition-opacity duration-700",
            state !== "idle" ? "animate-voice-core-breathe" : "opacity-0"
          )}
          style={{
            background: "radial-gradient(circle at 50% 35%, rgba(0,224,200,0.1) 0%, transparent 60%)"
          }}
        />
      </div>
    </div>
  );
}
