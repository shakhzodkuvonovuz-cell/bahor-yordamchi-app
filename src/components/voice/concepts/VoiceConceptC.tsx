/**
 * CONCEPT C: "Bloom"
 * Organic nature-inspired (Bahor = Spring) — petals, flowing particles, living aura
 * 
 * Visual Identity: Soft greens, warm sunlight, organic shapes
 * Animation: Petals floating, breathing aura, particles like pollen
 * Typography: Rounded, soft, organic curves
 * Color Palette: #F8FDF8, #2DD4A8, #34D399, #FCD34D, #1F2937
 */

import { useState, useEffect, useRef } from "react";
import { X, Mic, Pause } from "lucide-react";
import { cn } from "@/lib/utils";
import bahorLogo from "@/assets/bahor-logo.png";

type VoiceState = "idle" | "listening" | "thinking" | "speaking";

interface Petal {
  x: number;
  y: number;
  rotation: number;
  scale: number;
  speed: number;
  wobble: number;
  hue: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function VoiceConceptC({ isOpen, onClose }: Props) {
  const [state, setState] = useState<VoiceState>("idle");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (isOpen) setTimeout(() => setState("listening"), 500);
  }, [isOpen]);

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

  // Petal animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    const petals: Petal[] = [];
    for (let i = 0; i < 20; i++) {
      petals.push({
        x: Math.random() * w,
        y: Math.random() * h,
        rotation: Math.random() * Math.PI * 2,
        scale: 0.5 + Math.random() * 0.5,
        speed: 0.3 + Math.random() * 0.5,
        wobble: Math.random() * Math.PI * 2,
        hue: Math.random() > 0.5 ? 160 : 45 // green or gold
      });
    }

    let time = 0;
    const animate = () => {
      ctx.clearRect(0, 0, w, h);
      const isActive = state !== "idle";
      const intensity = isActive ? 1 : 0.3;

      // Draw petals
      petals.forEach(p => {
        p.y += p.speed * intensity;
        p.x += Math.sin(time * 0.02 + p.wobble) * 0.5;
        p.rotation += 0.01;

        if (p.y > h + 50) {
          p.y = -50;
          p.x = Math.random() * w;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.scale(p.scale, p.scale);

        // Petal shape
        ctx.beginPath();
        ctx.moveTo(0, -15);
        ctx.bezierCurveTo(10, -10, 10, 10, 0, 15);
        ctx.bezierCurveTo(-10, 10, -10, -10, 0, -15);
        
        ctx.fillStyle = `hsla(${p.hue}, 70%, 65%, ${0.4 * intensity})`;
        ctx.fill();
        ctx.restore();
      });

      // Pollen particles
      if (isActive) {
        for (let i = 0; i < 30; i++) {
          const x = w/2 + Math.sin(time * 0.01 + i) * (100 + i * 3);
          const y = h/2 + Math.cos(time * 0.01 + i * 1.5) * (100 + i * 2);
          const size = 1 + Math.sin(time * 0.05 + i) * 0.5;
          
          ctx.beginPath();
          ctx.arc(x, y, size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(252, 211, 77, ${0.3 + Math.sin(time * 0.03 + i) * 0.2})`;
          ctx.fill();
        }
      }

      time++;
      requestAnimationFrame(animate);
    };
    animate();
  }, [state]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" style={{ background: "linear-gradient(180deg, #F0FDF4 0%, #ECFDF5 50%, #F0FDFA 100%)" }}>
      {/* Floating petals canvas */}
      <canvas ref={canvasRef} className="absolute inset-0" style={{ width: "100%", height: "100%" }} />

      {/* Soft light rays */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(252,211,77,0.15) 0%, transparent 50%)"
      }} />

      {/* Close button */}
      <button onClick={onClose} className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/60 backdrop-blur-sm flex items-center justify-center shadow-lg">
        <X className="w-5 h-5 text-emerald-800/60" />
      </button>

      {/* Central bloom */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="relative">
          {/* Aura rings */}
          <div className={cn(
            "absolute inset-0 -m-8 rounded-full transition-all duration-1000",
            state !== "idle" && "animate-concept-c-aura"
          )} style={{
            background: "radial-gradient(circle, rgba(45,212,168,0.2) 0%, transparent 70%)"
          }} />
          
          {/* Main flower center */}
          <div className={cn(
            "relative w-40 h-40 rounded-full flex items-center justify-center transition-all duration-700",
            state === "listening" && "scale-110",
            state === "thinking" && "scale-95",
            state === "speaking" && "scale-105"
          )} style={{
            background: "linear-gradient(145deg, #D1FAE5, #A7F3D0)",
            boxShadow: state !== "idle" 
              ? "0 0 60px rgba(45,212,168,0.4), inset 0 0 30px rgba(255,255,255,0.5)"
              : "0 10px 40px rgba(0,0,0,0.1)"
          }}>
            {/* Inner glow */}
            <div className="absolute inset-4 rounded-full bg-gradient-to-br from-white/60 to-transparent" />
            
            {/* Logo */}
            <img 
              src={bahorLogo} 
              alt="" 
              className={cn(
                "w-16 h-16 object-contain relative z-10 transition-all duration-500",
                state === "thinking" && "animate-pulse"
              )}
              style={{ filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.1))" }}
            />
          </div>
        </div>

        {/* Text */}
        <div className="mt-12 text-center">
          <p className={cn(
            "text-3xl font-light tracking-wide transition-all duration-500",
            state !== "idle" ? "text-emerald-700" : "text-gray-600"
          )} style={{ fontFamily: "'Nunito', system-ui, sans-serif" }}>
            {state === "idle" && "Touch to begin"}
            {state === "listening" && "I'm listening..."}
            {state === "thinking" && "Let me think..."}
            {state === "speaking" && "Here's what I found"}
          </p>
          <p className="mt-3 text-sm text-emerald-600/50 tracking-widest font-medium">
            🌸 BAHOR AI
          </p>
        </div>
      </div>

      {/* Mic button */}
      <div className="absolute bottom-12 left-0 right-0 flex justify-center">
        <button
          onClick={() => setState(state === "listening" ? "idle" : "listening")}
          className={cn(
            "w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl",
            state === "listening"
              ? "bg-gradient-to-br from-amber-400 to-amber-500"
              : "bg-gradient-to-br from-emerald-400 to-teal-500 hover:from-emerald-500 hover:to-teal-600"
          )}
        >
          {state === "listening" ? (
            <Pause className="w-6 h-6 text-white" />
          ) : (
            <Mic className="w-6 h-6 text-white" />
          )}
        </button>
      </div>
    </div>
  );
}
