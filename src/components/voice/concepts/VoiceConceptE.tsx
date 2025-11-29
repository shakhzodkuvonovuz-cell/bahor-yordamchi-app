/**
 * CONCEPT E: "Pulse"
 * Bold neon cyberpunk with strong waves and techno vibes
 * 
 * Visual Identity: Deep purple/black with hot pink and cyan neon
 * Animation: Aggressive waveforms, glitch effects, strobing accents
 * Typography: Bold condensed, impactful
 * Color Palette: #0D0015, #FF00AA, #00FFFF, #8B00FF
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

export default function VoiceConceptE({ isOpen, onClose }: Props) {
  const [state, setState] = useState<VoiceState>("idle");
  const [glitch, setGlitch] = useState(false);
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
      setGlitch(true);
      setTimeout(() => setGlitch(false), 200);
      const t = setTimeout(() => setState("speaking"), 2500);
      return () => clearTimeout(t);
    }
    if (state === "speaking") {
      const t = setTimeout(() => setState("listening"), 3000);
      return () => clearTimeout(t);
    }
  }, [state]);

  // Aggressive waveform
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    canvas.width = w * dpr;
    canvas.height = 200 * dpr;
    ctx.scale(dpr, dpr);

    let time = 0;

    const animate = () => {
      ctx.clearRect(0, 0, w, 200);
      const isActive = state !== "idle";
      const intensity = isActive ? 1 : 0.2;

      // Multiple wave layers
      const colors = ["#FF00AA", "#00FFFF", "#8B00FF"];
      
      colors.forEach((color, layerIndex) => {
        ctx.beginPath();
        
        for (let x = 0; x <= w; x += 2) {
          const freq = 0.01 + layerIndex * 0.005;
          const amp = (30 + layerIndex * 10) * intensity;
          const phase = time * (0.1 + layerIndex * 0.02);
          
          // Aggressive multi-harmonic wave
          let y = 100;
          y += Math.sin(x * freq + phase) * amp;
          y += Math.sin(x * freq * 2 - phase * 0.5) * amp * 0.5;
          y += Math.sin(x * freq * 4 + phase * 2) * amp * 0.25;
          
          // Add noise when active
          if (isActive) {
            y += (Math.random() - 0.5) * 10 * intensity;
          }
          
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        
        ctx.strokeStyle = color;
        ctx.lineWidth = 2 - layerIndex * 0.5;
        ctx.shadowColor = color;
        ctx.shadowBlur = isActive ? 15 : 5;
        ctx.stroke();
      });

      // Scan line effect
      const scanY = (time * 3) % 200;
      ctx.fillStyle = "rgba(255, 0, 170, 0.1)";
      ctx.fillRect(0, scanY, w, 2);

      time++;
      requestAnimationFrame(animate);
    };
    animate();
  }, [state]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" style={{ background: "linear-gradient(180deg, #0D0015 0%, #1A0025 100%)" }}>
      {/* Grid overlay */}
      <div className="absolute inset-0 opacity-20" style={{
        backgroundImage: `
          linear-gradient(rgba(255,0,170,0.1) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,0,170,0.1) 1px, transparent 1px)
        `,
        backgroundSize: "50px 50px"
      }} />

      {/* Neon border frame */}
      <div className="absolute inset-4 border border-[#FF00AA]/30 pointer-events-none" />
      <div className="absolute inset-6 border border-[#00FFFF]/20 pointer-events-none" />

      {/* Close */}
      <button onClick={onClose} className="absolute top-8 right-8 z-10">
        <X className="w-8 h-8 text-[#FF00AA] hover:text-[#00FFFF] transition-colors" />
      </button>

      {/* Central logo with neon glow */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className={cn(
          "relative transition-all duration-300",
          glitch && "animate-concept-e-glitch"
        )}>
          {/* Outer glow rings */}
          <div className={cn(
            "absolute inset-0 -m-16 rounded-full transition-all duration-500",
            state === "listening" && "animate-concept-e-pulse"
          )} style={{
            background: "radial-gradient(circle, rgba(255,0,170,0.3) 0%, transparent 70%)"
          }} />
          <div className={cn(
            "absolute inset-0 -m-12 rounded-full transition-all duration-500",
            state !== "idle" && "animate-concept-e-pulse-delay"
          )} style={{
            background: "radial-gradient(circle, rgba(0,255,255,0.2) 0%, transparent 70%)"
          }} />

          {/* Main container */}
          <div className={cn(
            "relative w-32 h-32 flex items-center justify-center",
            "border-2 border-[#FF00AA]",
            state !== "idle" && "shadow-[0_0_30px_rgba(255,0,170,0.5),0_0_60px_rgba(0,255,255,0.3)]"
          )} style={{ clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)" }}>
            <div className="absolute inset-0 bg-[#0D0015]/80" style={{ clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)" }} />
            <img 
              src={bahorLogo} 
              alt="" 
              className="w-12 h-12 object-contain relative z-10"
              style={{ filter: "drop-shadow(0 0 10px rgba(0,255,255,0.8))" }}
            />
          </div>
        </div>
      </div>

      {/* State text - bold impact */}
      <div className="absolute top-1/2 left-0 right-0 mt-32 text-center">
        <p className={cn(
          "text-5xl font-black tracking-tight uppercase transition-all duration-300",
          state === "listening" && "text-[#FF00AA]",
          state === "thinking" && "text-[#8B00FF]",
          state === "speaking" && "text-[#00FFFF]",
          state === "idle" && "text-white/30",
          glitch && "animate-concept-e-text-glitch"
        )} style={{ fontFamily: "'Impact', sans-serif", textShadow: state !== "idle" ? "0 0 20px currentColor" : "none" }}>
          {state === "idle" && "STANDBY"}
          {state === "listening" && "LISTENING"}
          {state === "thinking" && "PROCESSING"}
          {state === "speaking" && "SPEAKING"}
        </p>
        <p className="mt-2 text-xs tracking-[0.5em] text-[#FF00AA]/50">
          BAHOR.AI
        </p>
      </div>

      {/* Waveform at bottom */}
      <div className="absolute bottom-24 left-0 right-0">
        <canvas ref={canvasRef} className="w-full h-[200px]" style={{ width: "100%", height: 200 }} />
      </div>

      {/* Mic button */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-center">
        <button
          onClick={() => setState(state === "listening" ? "idle" : "listening")}
          className={cn(
            "w-16 h-16 rounded-none flex items-center justify-center transition-all duration-300",
            "border-2",
            state === "listening"
              ? "border-[#00FFFF] bg-[#00FFFF]/20 shadow-[0_0_20px_rgba(0,255,255,0.5)]"
              : "border-[#FF00AA] hover:bg-[#FF00AA]/20 hover:shadow-[0_0_20px_rgba(255,0,170,0.5)]"
          )}
          style={{ clipPath: "polygon(15% 0%, 85% 0%, 100% 50%, 85% 100%, 15% 100%, 0% 50%)" }}
        >
          {state === "listening" ? (
            <Square className="w-6 h-6 text-[#00FFFF]" />
          ) : (
            <Mic className="w-6 h-6 text-[#FF00AA]" />
          )}
        </button>
      </div>
    </div>
  );
}
