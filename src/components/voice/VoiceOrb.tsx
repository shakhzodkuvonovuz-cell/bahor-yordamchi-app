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
    size: number;
  }>>([]);

  useEffect(() => {
    particlesRef.current = Array.from({ length: 40 }, () => ({
      x: 0,
      y: 0,
      angle: Math.random() * Math.PI * 2,
      speed: 0.001 + Math.random() * 0.004,
      radius: 100 + Math.random() * 60,
      opacity: 0.2 + Math.random() * 0.5,
      size: 1 + Math.random() * 2,
    }));
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const size = 400;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    let time = 0;
    const centerX = size / 2;
    const centerY = size / 2;
    const baseRadius = 120;

    const getStateColors = () => {
      switch (state) {
        case "listening":
          return { 
            primary: [0, 212, 180], 
            secondary: [0, 180, 140], 
            glow: [0, 229, 193],
            glowIntensity: 0.6
          };
        case "thinking":
          return { 
            primary: [0, 180, 220], 
            secondary: [0, 140, 200], 
            glow: [0, 200, 255],
            glowIntensity: 0.5
          };
        case "speaking":
          return { 
            primary: [0, 220, 120], 
            secondary: [0, 180, 100], 
            glow: [100, 255, 150],
            glowIntensity: 0.7
          };
        default:
          return { 
            primary: [0, 180, 160], 
            secondary: [0, 140, 130], 
            glow: [0, 200, 180],
            glowIntensity: 0.3
          };
      }
    };

    const animate = () => {
      if (!ctx || !canvas) return;
      
      ctx.clearRect(0, 0, size, size);
      const colors = getStateColors();

      // Ambient glow layers
      for (let i = 3; i >= 0; i--) {
        const glowRadius = baseRadius + 30 * i + (state !== "idle" ? Math.sin(time * 0.02) * 10 : 0);
        const gradient = ctx.createRadialGradient(
          centerX, centerY, glowRadius * 0.3,
          centerX, centerY, glowRadius
        );
        const alphaBase = colors.glowIntensity * (0.15 - i * 0.03) * (state !== "idle" ? 1 + amplitude * 0.5 : 0.5);
        gradient.addColorStop(0, `rgba(${colors.glow.join(",")}, ${alphaBase})`);
        gradient.addColorStop(0.5, `rgba(${colors.glow.join(",")}, ${alphaBase * 0.5})`);
        gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);
      }

      // Floating particles
      particlesRef.current.forEach((particle, i) => {
        particle.angle += particle.speed * (state === "thinking" ? 2 : 1);
        
        let targetRadius = particle.radius;
        if (state === "thinking") {
          targetRadius = particle.radius - Math.sin(time * 0.03 + i) * 30 - 20;
        } else if (state === "listening" || state === "speaking") {
          targetRadius = particle.radius + Math.sin(time * 0.02 + i * 0.2) * 15 * amplitude;
        }
        
        const x = centerX + Math.cos(particle.angle) * targetRadius;
        const y = centerY + Math.sin(particle.angle) * targetRadius;
        
        const particleAlpha = particle.opacity * (state !== "idle" ? 0.8 : 0.4);
        ctx.beginPath();
        ctx.arc(x, y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${colors.glow.join(",")}, ${particleAlpha})`;
        ctx.shadowColor = `rgba(${colors.glow.join(",")}, 0.5)`;
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Organic waveform ring
      if (state === "listening" || state === "speaking") {
        const waveCount = 80;
        const waveAmplitude = 6 + amplitude * 25;
        
        ctx.beginPath();
        for (let i = 0; i <= waveCount; i++) {
          const angle = (i / waveCount) * Math.PI * 2;
          const wave1 = Math.sin(angle * 5 + time * 0.06) * waveAmplitude * 0.6;
          const wave2 = Math.sin(angle * 7 - time * 0.04) * waveAmplitude * 0.3;
          const wave3 = Math.cos(angle * 3 + time * 0.08) * waveAmplitude * 0.2 * amplitude;
          
          const r = baseRadius + 8 + wave1 + wave2 + wave3;
          const x = centerX + Math.cos(angle) * r;
          const y = centerY + Math.sin(angle) * r;
          
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        
        const waveGradient = ctx.createLinearGradient(0, 0, size, size);
        waveGradient.addColorStop(0, `rgba(${colors.primary.join(",")}, 0.7)`);
        waveGradient.addColorStop(0.5, `rgba(${colors.glow.join(",")}, 0.9)`);
        waveGradient.addColorStop(1, `rgba(${colors.secondary.join(",")}, 0.7)`);
        
        ctx.strokeStyle = waveGradient;
        ctx.lineWidth = 2.5;
        ctx.shadowColor = `rgba(${colors.glow.join(",")}, 0.6)`;
        ctx.shadowBlur = 15;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // Thinking state effects
      if (state === "thinking") {
        const pulseScale = 1 + Math.sin(time * 0.04) * 0.08;
        const pulseRadius = baseRadius * pulseScale;
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, pulseRadius + 12, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${colors.primary.join(",")}, ${0.4 + Math.sin(time * 0.06) * 0.2})`;
        ctx.lineWidth = 3;
        ctx.shadowColor = `rgba(${colors.glow.join(",")}, 0.4)`;
        ctx.shadowBlur = 12;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Reasoning lines
        for (let i = 0; i < 6; i++) {
          const lineAngle = (time * 0.02) + (i * Math.PI * 2 / 6);
          const lineRadius = 40 + Math.sin(time * 0.03 + i) * 20;
          const startX = centerX + Math.cos(lineAngle) * (lineRadius * 0.3);
          const startY = centerY + Math.sin(lineAngle) * (lineRadius * 0.3);
          const endX = centerX + Math.cos(lineAngle) * lineRadius;
          const endY = centerY + Math.sin(lineAngle) * lineRadius;
          
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(endX, endY);
          ctx.strokeStyle = `rgba(${colors.glow.join(",")}, ${0.3 + Math.sin(time * 0.04 + i) * 0.2})`;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }

      // Speaking ripples
      if (state === "speaking") {
        for (let r = 0; r < 4; r++) {
          const ripplePhase = ((time * 0.015 + r * 0.25) % 1);
          const rippleRadius = baseRadius + 15 + ripplePhase * 80;
          const rippleOpacity = (1 - ripplePhase) * 0.35 * amplitude;
          
          ctx.beginPath();
          ctx.arc(centerX, centerY, rippleRadius, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${colors.glow.join(",")}, ${rippleOpacity})`;
          ctx.lineWidth = 2 - ripplePhase;
          ctx.stroke();
        }
      }

      // Idle breathing
      if (state === "idle") {
        const breathRadius = baseRadius + 5 + Math.sin(time * 0.025) * 4;
        ctx.beginPath();
        ctx.arc(centerX, centerY, breathRadius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${colors.primary.join(",")}, 0.25)`;
        ctx.lineWidth = 1.5;
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

  const getOrbStyles = () => {
    switch (state) {
      case "listening":
        return {
          gradient: "hsl(172,80%,32%), hsl(175,75%,38%), hsl(168,70%,28%)",
          shadow: "0 0 100px rgba(0,212,180,0.5)",
        };
      case "thinking":
        return {
          gradient: "hsl(190,80%,32%), hsl(185,75%,38%), hsl(195,70%,28%)",
          shadow: "0 0 100px rgba(0,180,220,0.5)",
        };
      case "speaking":
        return {
          gradient: "hsl(155,80%,32%), hsl(160,75%,38%), hsl(150,70%,28%)",
          shadow: "0 0 100px rgba(100,255,150,0.5)",
        };
      default:
        return {
          gradient: "hsl(175,70%,30%), hsl(178,65%,35%), hsl(172,60%,28%)",
          shadow: "0 0 60px rgba(0,180,160,0.25)",
        };
    }
  };

  const orbStyles = getOrbStyles();

  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      <canvas
        ref={canvasRef}
        className="absolute w-[400px] h-[400px]"
        style={{ width: 400, height: 400 }}
      />

      <div
        className={cn(
          "relative w-48 h-48 md:w-56 md:h-56 rounded-full",
          "flex items-center justify-center",
          "transition-all duration-700 ease-out",
          state !== "idle" && "scale-105"
        )}
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 30% 20%, rgba(255,255,255,0.15) 0%, transparent 50%),
            radial-gradient(ellipse 60% 40% at 70% 80%, rgba(0,0,0,0.2) 0%, transparent 50%),
            linear-gradient(135deg, ${orbStyles.gradient})
          `,
          boxShadow: orbStyles.shadow
        }}
      >
        <div 
          className="absolute inset-3 rounded-full"
          style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 50%, rgba(0,0,0,0.1) 100%)"
          }}
        />

        <div 
          className={cn(
            "absolute inset-4 rounded-full",
            "border border-white/15",
            "transition-all duration-500"
          )}
          style={{
            boxShadow: state !== "idle" 
              ? "inset 0 0 30px rgba(255,255,255,0.1), 0 0 20px rgba(0,212,180,0.2)" 
              : "inset 0 0 20px rgba(255,255,255,0.05)"
          }}
        />

        <div className={cn(
          "relative z-10 w-24 h-24 md:w-28 md:h-28",
          "transition-transform duration-1000",
          state !== "idle" && "animate-voice-logo-float"
        )}>
          <img
            src={bahorLogo}
            alt="Bahor AI"
            className="w-full h-full object-contain transition-all duration-500"
            style={{
              filter: state !== "idle" 
                ? "drop-shadow(0 0 30px rgba(255,255,255,0.5)) brightness(1.1)" 
                : "drop-shadow(0 0 15px rgba(255,255,255,0.3))"
            }}
          />
        </div>

        <div 
          className={cn(
            "absolute inset-0 rounded-full",
            "transition-opacity duration-700",
            state !== "idle" ? "animate-voice-breathe-glow" : "opacity-0"
          )}
          style={{
            background: "radial-gradient(circle at 50% 40%, rgba(255,255,255,0.08) 0%, transparent 60%)"
          }}
        />
      </div>
    </div>
  );
}
