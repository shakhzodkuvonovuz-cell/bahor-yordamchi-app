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
    const size = 300;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    let time = 0;
    const centerX = size / 2;
    const centerY = size / 2;

    // Bahor AI brand color
    const teal = { r: 0, g: 199, b: 177 }; // #00c7b1

    const getIntensity = () => {
      switch (state) {
        case "listening": return { particles: 1.3, ring: 1.0, glow: 0.8 };
        case "thinking": return { particles: 0.6, ring: 0.7, glow: 0.5 };
        case "speaking": return { particles: 1.1, ring: 0.9, glow: 0.9 };
        default: return { particles: 0.3, ring: 0.4, glow: 0.3 };
      }
    };

    // Particle class for intelligent orbiting
    class Particle {
      angle: number;
      radius: number;
      baseRadius: number;
      speed: number;
      size: number;
      alpha: number;
      
      constructor(index: number, total: number) {
        this.angle = (index / total) * Math.PI * 2;
        this.baseRadius = 85 + Math.random() * 20;
        this.radius = this.baseRadius;
        this.speed = 0.008 + Math.random() * 0.006;
        this.size = 1.5 + Math.random() * 1.5;
        this.alpha = 0.4 + Math.random() * 0.4;
      }
      
      update(time: number, voiceAmplitude: number, intensity: number) {
        this.angle += this.speed * intensity;
        // Voice-reactive radius
        const voiceEffect = state === "listening" ? Math.sin(time * 0.1 + this.angle * 3) * 15 * voiceAmplitude : 0;
        this.radius = this.baseRadius + voiceEffect + Math.sin(time * 0.02 + this.angle) * 8;
      }
      
      draw(ctx: CanvasRenderingContext2D, cx: number, cy: number, intensity: number) {
        const x = cx + Math.cos(this.angle) * this.radius;
        const y = cy + Math.sin(this.angle) * this.radius;
        
        ctx.beginPath();
        ctx.arc(x, y, this.size * intensity, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${teal.r}, ${teal.g}, ${teal.b}, ${this.alpha * intensity})`;
        ctx.fill();
      }
    }

    // Create particles
    const particles: Particle[] = [];
    const particleCount = 24;
    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle(i, particleCount));
    }

    const animate = () => {
      if (!ctx || !canvas) return;
      
      ctx.clearRect(0, 0, size, size);
      const intensity = getIntensity();

      // Fog/glow behind everything
      const fogGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 120);
      fogGradient.addColorStop(0, `rgba(${teal.r}, ${teal.g}, ${teal.b}, ${0.12 * intensity.glow})`);
      fogGradient.addColorStop(0.5, `rgba(${teal.r}, ${teal.g}, ${teal.b}, ${0.04 * intensity.glow})`);
      fogGradient.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = fogGradient;
      ctx.fillRect(0, 0, size, size);

      // Main glowing ring
      const ringRadius = 80 + Math.sin(time * 0.025) * 3 * intensity.ring;
      const ringGradient = ctx.createRadialGradient(
        centerX, centerY, ringRadius - 15,
        centerX, centerY, ringRadius + 5
      );
      ringGradient.addColorStop(0, `rgba(${teal.r}, ${teal.g}, ${teal.b}, 0)`);
      ringGradient.addColorStop(0.4, `rgba(${teal.r}, ${teal.g}, ${teal.b}, ${0.35 * intensity.ring})`);
      ringGradient.addColorStop(0.6, `rgba(${teal.r}, ${teal.g}, ${teal.b}, ${0.5 * intensity.ring})`);
      ringGradient.addColorStop(1, `rgba(${teal.r}, ${teal.g}, ${teal.b}, 0)`);
      
      ctx.beginPath();
      ctx.arc(centerX, centerY, ringRadius, 0, Math.PI * 2);
      ctx.strokeStyle = ringGradient;
      ctx.lineWidth = 12;
      ctx.stroke();

      // Voice-reactive ring distortion (listening flare)
      if (state === "listening" || state === "speaking") {
        const flarePoints = 60;
        ctx.beginPath();
        for (let i = 0; i <= flarePoints; i++) {
          const angle = (i / flarePoints) * Math.PI * 2;
          const distort = Math.sin(angle * 4 + time * 0.08) * 6 * amplitude;
          const breathe = Math.sin(time * 0.03) * 3;
          const r = ringRadius + distort + breathe;
          const x = centerX + Math.cos(angle) * r;
          const y = centerY + Math.sin(angle) * r;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.strokeStyle = `rgba(${teal.r}, ${teal.g}, ${teal.b}, ${0.2 * intensity.ring})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Update and draw particles
      particles.forEach(p => {
        p.update(time, amplitude, intensity.particles);
        p.draw(ctx, centerX, centerY, intensity.particles);
      });

      // Inner glow pulse
      const pulseRadius = 70 + Math.sin(time * 0.04) * 4;
      const pulseGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, pulseRadius);
      pulseGradient.addColorStop(0, `rgba(${teal.r}, ${teal.g}, ${teal.b}, ${0.08 * intensity.glow})`);
      pulseGradient.addColorStop(0.7, `rgba(${teal.r}, ${teal.g}, ${teal.b}, ${0.02 * intensity.glow})`);
      pulseGradient.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = pulseGradient;
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
        return "shadow-[0_0_60px_rgba(0,199,177,0.4),0_0_30px_rgba(0,199,177,0.25)]";
      case "thinking":
        return "shadow-[0_0_40px_rgba(0,199,177,0.25),0_0_20px_rgba(0,199,177,0.15)]";
      case "speaking":
        return "shadow-[0_0_70px_rgba(0,199,177,0.45),0_0_35px_rgba(0,199,177,0.3)]";
      default:
        return "shadow-[0_0_25px_rgba(0,199,177,0.15)]";
    }
  };

  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      {/* Canvas for ring and particles */}
      <canvas
        ref={canvasRef}
        className="absolute w-[300px] h-[300px]"
        style={{ width: 300, height: 300 }}
      />

      {/* Core orb with logo */}
      <div
        className={cn(
          "relative w-[120px] h-[120px] rounded-full",
          "flex items-center justify-center",
          "bg-[#020b0a]",
          "border border-[rgba(0,199,177,0.15)]",
          getOrbGlow(),
          "transition-all duration-500 ease-out"
        )}
      >
        {/* Inner gradient overlay */}
        <div 
          className="absolute inset-0 rounded-full"
          style={{
            background: "radial-gradient(circle at 35% 30%, rgba(0,199,177,0.08) 0%, transparent 60%)"
          }}
        />

        {/* Bahor AI Logo */}
        <div className={cn(
          "relative z-10 w-14 h-14",
          "transition-all duration-500",
          state === "thinking" && "animate-voice-logo-rotate"
        )}>
          <img
            src={bahorLogo}
            alt="Bahor AI"
            className="w-full h-full object-contain transition-all duration-500"
            style={{
              filter: state !== "idle" 
                ? "drop-shadow(0 0 12px rgba(0,199,177,0.6)) brightness(1.15)" 
                : "drop-shadow(0 0 6px rgba(0,199,177,0.3))"
            }}
          />
        </div>
      </div>
    </div>
  );
}
