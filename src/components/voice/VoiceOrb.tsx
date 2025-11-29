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
  const particlesRef = useRef<Array<{
    x: number;
    y: number;
    angle: number;
    speed: number;
    radius: number;
    opacity: number;
  }>>([]);

  // Initialize particles
  useEffect(() => {
    particlesRef.current = Array.from({ length: 24 }, () => ({
      x: 0,
      y: 0,
      angle: Math.random() * Math.PI * 2,
      speed: 0.002 + Math.random() * 0.003,
      radius: 80 + Math.random() * 40,
      opacity: 0.3 + Math.random() * 0.4,
    }));
  }, []);

  // Animate waveform ring around orb
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
    const baseRadius = 100;

    const getStateColors = () => {
      switch (state) {
        case "listening":
          return { primary: "0, 212, 180", secondary: "0, 180, 140", glow: "0, 229, 193" };
        case "thinking":
          return { primary: "0, 180, 220", secondary: "0, 140, 200", glow: "0, 200, 255" };
        case "speaking":
          return { primary: "0, 220, 120", secondary: "0, 180, 100", glow: "100, 255, 150" };
        default:
          return { primary: "0, 180, 160", secondary: "0, 140, 130", glow: "0, 200, 180" };
      }
    };

    const animate = () => {
      if (!ctx || !canvas) return;
      
      ctx.clearRect(0, 0, size, size);
      const colors = getStateColors();

      // Draw outer glow
      const glowGradient = ctx.createRadialGradient(
        centerX, centerY, baseRadius * 0.8,
        centerX, centerY, baseRadius * 1.6
      );
      glowGradient.addColorStop(0, `rgba(${colors.glow}, ${0.15 + amplitude * 0.1})`);
      glowGradient.addColorStop(0.5, `rgba(${colors.glow}, ${0.05 + amplitude * 0.05})`);
      glowGradient.addColorStop(1, "rgba(0, 0, 0, 0)");
      
      ctx.fillStyle = glowGradient;
      ctx.fillRect(0, 0, size, size);

      // Draw animated waveform ring
      if (state === "listening" || state === "speaking") {
        const waveCount = 64;
        const waveAmplitude = 8 + amplitude * 20;
        
        ctx.beginPath();
        for (let i = 0; i <= waveCount; i++) {
          const angle = (i / waveCount) * Math.PI * 2;
          const wave1 = Math.sin(angle * 6 + time * 0.08) * waveAmplitude * 0.5;
          const wave2 = Math.sin(angle * 4 - time * 0.06) * waveAmplitude * 0.3;
          const wave3 = Math.cos(angle * 8 + time * 0.1) * waveAmplitude * 0.2 * amplitude;
          
          const r = baseRadius + wave1 + wave2 + wave3;
          const x = centerX + Math.cos(angle) * r;
          const y = centerY + Math.sin(angle) * r;
          
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.closePath();
        
        // Waveform gradient stroke
        const waveGradient = ctx.createLinearGradient(0, 0, size, size);
        waveGradient.addColorStop(0, `rgba(${colors.primary}, 0.8)`);
        waveGradient.addColorStop(0.5, `rgba(${colors.secondary}, 0.9)`);
        waveGradient.addColorStop(1, `rgba(${colors.glow}, 0.7)`);
        
        ctx.strokeStyle = waveGradient;
        ctx.lineWidth = 3;
        ctx.shadowColor = `rgba(${colors.glow}, 0.6)`;
        ctx.shadowBlur = 20;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // Thinking state: pulsing ring with particles
      if (state === "thinking") {
        const pulseRadius = baseRadius + Math.sin(time * 0.05) * 10;
        
        // Pulsing ring
        ctx.beginPath();
        ctx.arc(centerX, centerY, pulseRadius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${colors.primary}, ${0.5 + Math.sin(time * 0.08) * 0.2})`;
        ctx.lineWidth = 4;
        ctx.shadowColor = `rgba(${colors.glow}, 0.5)`;
        ctx.shadowBlur = 15;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Particles flowing inward
        particlesRef.current.forEach((particle, i) => {
          particle.angle += particle.speed;
          const targetRadius = particle.radius - Math.sin(time * 0.02 + i) * 20;
          
          const x = centerX + Math.cos(particle.angle) * targetRadius;
          const y = centerY + Math.sin(particle.angle) * targetRadius;
          
          ctx.beginPath();
          ctx.arc(x, y, 2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${colors.glow}, ${particle.opacity * 0.7})`;
          ctx.shadowColor = `rgba(${colors.glow}, 0.5)`;
          ctx.shadowBlur = 8;
          ctx.fill();
          ctx.shadowBlur = 0;
        });
      }

      // Speaking state: ripple effect
      if (state === "speaking") {
        const rippleCount = 3;
        for (let r = 0; r < rippleCount; r++) {
          const ripplePhase = ((time * 0.02 + r * 0.33) % 1);
          const rippleRadius = baseRadius + ripplePhase * 60;
          const rippleOpacity = (1 - ripplePhase) * 0.4;
          
          ctx.beginPath();
          ctx.arc(centerX, centerY, rippleRadius, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${colors.glow}, ${rippleOpacity})`;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }

      // Idle state: subtle breathing
      if (state === "idle") {
        const breathRadius = baseRadius + Math.sin(time * 0.03) * 5;
        ctx.beginPath();
        ctx.arc(centerX, centerY, breathRadius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${colors.primary}, 0.4)`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

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

  const getOrbGradient = () => {
    switch (state) {
      case "listening":
        return "from-[hsl(172,80%,35%)] via-[hsl(175,70%,40%)] to-[hsl(168,75%,30%)]";
      case "thinking":
        return "from-[hsl(190,80%,35%)] via-[hsl(185,70%,40%)] to-[hsl(195,75%,30%)]";
      case "speaking":
        return "from-[hsl(155,80%,35%)] via-[hsl(160,70%,40%)] to-[hsl(150,75%,30%)]";
      default:
        return "from-[hsl(175,60%,25%)] via-[hsl(180,50%,30%)] to-[hsl(170,55%,22%)]";
    }
  };

  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      {/* Canvas for waveform and effects */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-[320px] h-[320px]"
        style={{ width: 320, height: 320 }}
      />

      {/* Main orb */}
      <div
        className={cn(
          "relative w-40 h-40 md:w-48 md:h-48 rounded-full",
          "bg-gradient-to-br",
          getOrbGradient(),
          "flex items-center justify-center",
          "shadow-[0_0_60px_rgba(0,212,180,0.3)]",
          "transition-all duration-700",
          state === "listening" && "shadow-[0_0_80px_rgba(0,229,193,0.4)]",
          state === "thinking" && "shadow-[0_0_80px_rgba(0,200,255,0.4)] animate-voice-orb-pulse",
          state === "speaking" && "shadow-[0_0_80px_rgba(100,255,150,0.4)]"
        )}
      >
        {/* Inner glow ring */}
        <div 
          className={cn(
            "absolute inset-2 rounded-full",
            "bg-gradient-to-br from-white/10 to-transparent",
            "border border-white/20"
          )}
        />

        {/* Bahor Logo */}
        <div className={cn(
          "relative z-10 w-20 h-20 md:w-24 md:h-24",
          "transition-transform duration-1000",
          state !== "idle" && "animate-voice-logo-gentle-rotate"
        )}>
          <img
            src={bahorLogo}
            alt="Bahor AI"
            className="w-full h-full object-contain drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]"
          />
        </div>

        {/* Breathing glow overlay */}
        <div 
          className={cn(
            "absolute inset-0 rounded-full",
            "bg-gradient-to-br from-white/5 to-transparent",
            state === "listening" && "animate-voice-breathe-glow"
          )}
        />
      </div>
    </div>
  );
}
