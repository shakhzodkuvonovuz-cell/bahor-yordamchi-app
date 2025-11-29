/**
 * CONCEPT B: "Nebula"
 * Futuristic holographic sci-fi with 3D depth and rotating energy rings
 * 
 * Visual Identity: Deep space black with holographic cyan/magenta
 * Animation: Multiple rotating rings at different angles, energy particles
 * Typography: Monospace, technical, HUD-style
 * Color Palette: #0A0A0F, #00F5E1, #FF00FF, #00C7B1
 */

import { useState, useEffect, useRef } from "react";
import { X, Mic, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import bahorLogo from "@/assets/bahor-logo.png";

type VoiceState = "idle" | "listening" | "thinking" | "speaking";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function VoiceConceptB({ isOpen, onClose }: Props) {
  const [state, setState] = useState<VoiceState>("idle");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (isOpen) setTimeout(() => setState("listening"), 500);
  }, [isOpen]);

  // Demo cycle
  useEffect(() => {
    if (state === "listening") {
      const t = setTimeout(() => setState("thinking"), 4000);
      return () => clearTimeout(t);
    }
    if (state === "thinking") {
      const t = setTimeout(() => setState("speaking"), 2500);
      return () => clearTimeout(t);
    }
    if (state === "speaking") {
      const t = setTimeout(() => setState("listening"), 3000);
      return () => clearTimeout(t);
    }
  }, [state]);

  // Particle system
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = 400 * dpr;
    canvas.height = 400 * dpr;
    ctx.scale(dpr, dpr);

    let time = 0;
    const particles: { x: number; y: number; vx: number; vy: number; life: number }[] = [];

    const animate = () => {
      ctx.clearRect(0, 0, 400, 400);
      const cx = 200, cy = 200;
      const isActive = state !== "idle";
      const speed = state === "thinking" ? 2 : 1;

      // Rotating rings
      for (let ring = 0; ring < 3; ring++) {
        const radius = 80 + ring * 25;
        const tilt = [0, 60, -45][ring];
        const rotSpeed = [0.02, -0.015, 0.025][ring] * speed;
        
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(time * rotSpeed);
        
        ctx.beginPath();
        ctx.ellipse(0, 0, radius, radius * Math.cos(tilt * Math.PI / 180), 0, 0, Math.PI * 2);
        
        const gradient = ctx.createLinearGradient(-radius, 0, radius, 0);
        const alpha = isActive ? 0.6 : 0.2;
        gradient.addColorStop(0, `rgba(0, 245, 225, 0)`);
        gradient.addColorStop(0.5, `rgba(0, 245, 225, ${alpha})`);
        gradient.addColorStop(1, `rgba(255, 0, 255, 0)`);
        
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      }

      // Energy particles
      if (isActive && Math.random() > 0.7) {
        const angle = Math.random() * Math.PI * 2;
        particles.push({
          x: cx + Math.cos(angle) * 60,
          y: cy + Math.sin(angle) * 60,
          vx: Math.cos(angle) * 0.5,
          vy: Math.sin(angle) * 0.5,
          life: 1
        });
      }

      particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.01;
        
        if (p.life > 0) {
          const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 4);
          gradient.addColorStop(0, `rgba(0, 245, 225, ${p.life})`);
          gradient.addColorStop(1, `rgba(0, 245, 225, 0)`);
          ctx.beginPath();
          ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
          ctx.fillStyle = gradient;
          ctx.fill();
        } else {
          particles.splice(i, 1);
        }
      });

      // Center glow
      const coreGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 50);
      coreGlow.addColorStop(0, `rgba(0, 199, 177, ${isActive ? 0.3 : 0.1})`);
      coreGlow.addColorStop(1, "transparent");
      ctx.fillStyle = coreGlow;
      ctx.fillRect(0, 0, 400, 400);

      time++;
      requestAnimationFrame(animate);
    };
    animate();
  }, [state]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#0A0A0F] flex flex-col items-center justify-center overflow-hidden">
      {/* Scan lines overlay */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-10"
        style={{
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,245,225,0.03) 2px, rgba(0,245,225,0.03) 4px)"
        }}
      />

      {/* HUD corners */}
      <div className="absolute top-4 left-4 w-16 h-16 border-l-2 border-t-2 border-[#00F5E1]/30" />
      <div className="absolute top-4 right-4 w-16 h-16 border-r-2 border-t-2 border-[#00F5E1]/30" />
      <div className="absolute bottom-4 left-4 w-16 h-16 border-l-2 border-b-2 border-[#00F5E1]/30" />
      <div className="absolute bottom-4 right-4 w-16 h-16 border-r-2 border-b-2 border-[#00F5E1]/30" />

      {/* Close */}
      <button onClick={onClose} className="absolute top-6 right-20 text-[#00F5E1]/60 hover:text-[#00F5E1] font-mono text-sm">
        [ESC]
      </button>

      {/* Status bar top */}
      <div className="absolute top-6 left-20 font-mono text-xs text-[#00F5E1]/60 tracking-wider">
        BAHOR.AI // VOICE_INTERFACE v2.0
      </div>

      {/* Central hologram */}
      <div className="relative">
        <canvas ref={canvasRef} className="w-[400px] h-[400px]" style={{ width: 400, height: 400 }} />
        
        {/* Logo in center */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={cn(
            "w-20 h-20 rounded-full flex items-center justify-center",
            "bg-[#0A0A0F]/80 border border-[#00F5E1]/30",
            state === "thinking" && "animate-pulse"
          )}>
            <img src={bahorLogo} alt="" className="w-10 h-10 object-contain" style={{ filter: "drop-shadow(0 0 10px rgba(0,245,225,0.5))" }} />
          </div>
        </div>
      </div>

      {/* State indicator */}
      <div className="mt-8 text-center font-mono">
        <p className="text-2xl text-[#00F5E1] tracking-[0.3em]">
          {state === "idle" && "STANDBY"}
          {state === "listening" && "RECEIVING"}
          {state === "thinking" && "PROCESSING"}
          {state === "speaking" && "TRANSMITTING"}
        </p>
        <p className="mt-2 text-xs text-[#FF00FF]/60 tracking-widest">
          {state !== "idle" && "█▓▒░ SIGNAL ACTIVE ░▒▓█"}
        </p>
      </div>

      {/* Control button */}
      <div className="absolute bottom-12">
        <button
          onClick={() => setState(state === "listening" ? "idle" : "listening")}
          className={cn(
            "relative w-16 h-16 rounded-full border-2 flex items-center justify-center transition-all",
            state === "listening"
              ? "border-[#FF00FF] bg-[#FF00FF]/10 shadow-[0_0_30px_rgba(255,0,255,0.3)]"
              : "border-[#00F5E1]/50 hover:border-[#00F5E1] hover:shadow-[0_0_20px_rgba(0,245,225,0.2)]"
          )}
        >
          {state === "listening" ? (
            <Square className="w-5 h-5 text-[#FF00FF]" />
          ) : (
            <Mic className="w-6 h-6 text-[#00F5E1]" />
          )}
        </button>
      </div>
    </div>
  );
}
