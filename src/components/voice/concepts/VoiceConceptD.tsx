/**
 * CONCEPT D: "Tessellate"
 * Abstract geometric patterns reacting to voice input
 * 
 * Visual Identity: Minimal dark with geometric sacred patterns
 * Animation: Morphing polygons, rotating mandalas, pulsing grids
 * Typography: Geometric sans-serif, structured
 * Color Palette: #0F0F0F, #1A1A1A, #00C7B1, #FFFFFF
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

export default function VoiceConceptD({ isOpen, onClose }: Props) {
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

  // Geometric animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const size = 500;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    let time = 0;
    const cx = size / 2, cy = size / 2;

    const drawPolygon = (x: number, y: number, radius: number, sides: number, rotation: number, alpha: number) => {
      ctx.beginPath();
      for (let i = 0; i <= sides; i++) {
        const angle = (i / sides) * Math.PI * 2 + rotation;
        const px = x + Math.cos(angle) * radius;
        const py = y + Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.strokeStyle = `rgba(0, 199, 177, ${alpha})`;
      ctx.stroke();
    };

    const animate = () => {
      ctx.clearRect(0, 0, size, size);
      const isActive = state !== "idle";
      const intensity = isActive ? 1 : 0.3;
      const speed = state === "thinking" ? 2 : 1;

      ctx.lineWidth = 1;

      // Outer rotating hexagons
      for (let i = 0; i < 6; i++) {
        const radius = 180 - i * 20;
        const rotation = time * 0.005 * speed * (i % 2 === 0 ? 1 : -1);
        const alpha = (0.1 + i * 0.08) * intensity;
        const sides = i % 2 === 0 ? 6 : 8;
        drawPolygon(cx, cy, radius, sides, rotation, alpha);
      }

      // Inner mandala
      const mandalaLayers = 8;
      for (let layer = 0; layer < mandalaLayers; layer++) {
        const radius = 50 + layer * 12;
        const segments = 12;
        
        for (let i = 0; i < segments; i++) {
          const angle = (i / segments) * Math.PI * 2 + time * 0.01 * speed;
          const pulse = Math.sin(time * 0.03 + layer * 0.5) * 5 * intensity;
          
          const x1 = cx + Math.cos(angle) * (radius + pulse);
          const y1 = cy + Math.sin(angle) * (radius + pulse);
          const x2 = cx + Math.cos(angle) * (radius + 10 + pulse);
          const y2 = cy + Math.sin(angle) * (radius + 10 + pulse);
          
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.strokeStyle = `rgba(0, 199, 177, ${(0.3 + layer * 0.05) * intensity})`;
          ctx.stroke();
        }
      }

      // Center shape morph
      const morphSides = Math.floor(3 + Math.sin(time * 0.01) * 3);
      const morphRadius = 40 + Math.sin(time * 0.02) * 5 * intensity;
      ctx.lineWidth = 2;
      drawPolygon(cx, cy, morphRadius, morphSides + 3, time * 0.02, 0.8 * intensity);

      // Dot grid background
      if (isActive) {
        for (let x = 0; x < size; x += 30) {
          for (let y = 0; y < size; y += 30) {
            const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
            const wave = Math.sin(dist * 0.02 - time * 0.05) * 0.5 + 0.5;
            ctx.beginPath();
            ctx.arc(x, y, 1, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(0, 199, 177, ${wave * 0.15})`;
            ctx.fill();
          }
        }
      }

      time++;
      requestAnimationFrame(animate);
    };
    animate();
  }, [state]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#0F0F0F] flex flex-col items-center justify-center overflow-hidden">
      {/* Geometric canvas */}
      <div className="relative">
        <canvas ref={canvasRef} className="w-[500px] h-[500px]" style={{ width: 500, height: 500 }} />
        
        {/* Center logo */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={cn(
            "w-16 h-16 rounded-lg flex items-center justify-center bg-[#0F0F0F] border border-[#00C7B1]/20",
            state === "thinking" && "animate-pulse"
          )}>
            <img src={bahorLogo} alt="" className="w-10 h-10 object-contain" />
          </div>
        </div>
      </div>

      {/* Close */}
      <button onClick={onClose} className="absolute top-6 right-6 text-white/30 hover:text-white/60 transition-colors">
        <X className="w-6 h-6" />
      </button>

      {/* State text */}
      <div className="absolute bottom-32 text-center">
        <p className={cn(
          "text-xl tracking-[0.5em] uppercase transition-all duration-500",
          state !== "idle" ? "text-[#00C7B1]" : "text-white/40"
        )} style={{ fontFamily: "'Space Grotesk', monospace" }}>
          {state === "idle" && "READY"}
          {state === "listening" && "LISTEN"}
          {state === "thinking" && "PROCESS"}
          {state === "speaking" && "RESPOND"}
        </p>
      </div>

      {/* Control */}
      <div className="absolute bottom-12">
        <button
          onClick={() => setState(state === "listening" ? "idle" : "listening")}
          className={cn(
            "w-14 h-14 flex items-center justify-center transition-all duration-300",
            "border border-[#00C7B1]/50",
            state === "listening" ? "bg-[#00C7B1]/20 rotate-45" : "hover:bg-[#00C7B1]/10"
          )}
        >
          {state === "listening" ? (
            <Square className={cn("w-5 h-5 text-[#00C7B1]", state === "listening" && "-rotate-45")} />
          ) : (
            <Mic className="w-5 h-5 text-[#00C7B1]" />
          )}
        </button>
      </div>
    </div>
  );
}
