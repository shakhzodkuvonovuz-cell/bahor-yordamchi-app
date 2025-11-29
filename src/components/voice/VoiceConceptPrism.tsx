/**
 * VOICE CONCEPT: "PRISM"
 * Radically new design — NO circles, waves, orbs, or particles
 * 
 * Visual Identity: Angular crystalline geometry, cinematic light planes
 * Animation: Morphing facets, breathing light beams, geometric transforms
 * References: Apple Vision Pro, Arc Max, HER film, Lexus concept
 * Shape Language: Diamond/prism core with angular light rays
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { X, MessageCircle, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/i18n/LanguageProvider";
import bahorLogo from "@/assets/bahor-logo.png";

type VoiceState = "idle" | "listening" | "thinking" | "speaking";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function VoiceConceptPrism({ isOpen, onClose }: Props) {
  const { t } = useTranslation();
  const [state, setState] = useState<VoiceState>("idle");
  const [amplitude, setAmplitude] = useState(0.5);
  const [isMuted, setIsMuted] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => setState("listening"), 400);
    } else {
      setState("idle");
    }
  }, [isOpen]);

  // Demo state cycle
  useEffect(() => {
    if (state === "listening") {
      const t = setTimeout(() => setState("thinking"), 5000);
      return () => clearTimeout(t);
    }
    if (state === "thinking") {
      const t = setTimeout(() => setState("speaking"), 3000);
      return () => clearTimeout(t);
    }
    if (state === "speaking") {
      const t = setTimeout(() => setState("listening"), 4000);
      return () => clearTimeout(t);
    }
  }, [state]);

  // Simulate voice amplitude
  useEffect(() => {
    if (state === "listening" || state === "speaking") {
      const interval = setInterval(() => {
        setAmplitude(0.3 + Math.random() * 0.7);
      }, 100);
      return () => clearInterval(interval);
    } else {
      setAmplitude(0.3);
    }
  }, [state]);

  // Angular geometry canvas animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    let time = 0;

    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      const cx = width / 2;
      const cy = height / 2 - 40;
      const isActive = state !== "idle";
      const intensity = isActive ? 0.8 + amplitude * 0.2 : 0.4;

      // === BACKGROUND: Uzbek geometric micro-pattern ===
      ctx.save();
      ctx.globalAlpha = 0.015;
      const patternSize = 80;
      for (let x = 0; x < width; x += patternSize) {
        for (let y = 0; y < height; y += patternSize) {
          // Islamic/Uzbek 8-point star pattern
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          const pcx = x + patternSize / 2;
          const pcy = y + patternSize / 2;
          const r = patternSize * 0.3;
          for (let i = 0; i < 8; i++) {
            const angle = (i * Math.PI) / 4;
            const x1 = pcx + Math.cos(angle) * r;
            const y1 = pcy + Math.sin(angle) * r;
            const x2 = pcx + Math.cos(angle + Math.PI / 8) * r * 0.5;
            const y2 = pcy + Math.sin(angle + Math.PI / 8) * r * 0.5;
            ctx.moveTo(pcx, pcy);
            ctx.lineTo(x1, y1);
            ctx.lineTo(x2, y2);
          }
          ctx.stroke();
        }
      }
      ctx.restore();

      // === CINEMATIC LIGHT BEAMS ===
      const beamCount = 5;
      for (let i = 0; i < beamCount; i++) {
        const beamAngle = (i / beamCount) * Math.PI - Math.PI / 2 + Math.sin(time * 0.005 + i) * 0.1;
        const beamLength = 400 + Math.sin(time * 0.02 + i * 2) * 50 * intensity;
        
        const gradient = ctx.createLinearGradient(
          cx, cy,
          cx + Math.cos(beamAngle) * beamLength,
          cy + Math.sin(beamAngle) * beamLength
        );
        gradient.addColorStop(0, `rgba(180, 200, 210, ${0.15 * intensity})`);
        gradient.addColorStop(0.5, `rgba(200, 220, 230, ${0.05 * intensity})`);
        gradient.addColorStop(1, "rgba(200, 220, 230, 0)");

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(
          cx + Math.cos(beamAngle - 0.02) * beamLength,
          cy + Math.sin(beamAngle - 0.02) * beamLength
        );
        ctx.lineTo(
          cx + Math.cos(beamAngle + 0.02) * beamLength,
          cy + Math.sin(beamAngle + 0.02) * beamLength
        );
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();
      }

      // === CENTRAL PRISM SHAPE (Diamond/Crystal) ===
      const prismSize = 100 + (isActive ? amplitude * 15 : 0);
      const breathe = Math.sin(time * 0.015) * 5 * intensity;
      
      // Prism vertices (hexagonal prism viewed from angle)
      const vertices = [
        { x: cx, y: cy - prismSize - breathe }, // top
        { x: cx + prismSize * 0.866, y: cy - prismSize * 0.3 }, // top-right
        { x: cx + prismSize * 0.866, y: cy + prismSize * 0.3 }, // bottom-right
        { x: cx, y: cy + prismSize * 0.6 + breathe * 0.5 }, // bottom
        { x: cx - prismSize * 0.866, y: cy + prismSize * 0.3 }, // bottom-left
        { x: cx - prismSize * 0.866, y: cy - prismSize * 0.3 }, // top-left
      ];

      // Left facet
      ctx.beginPath();
      ctx.moveTo(vertices[0].x, vertices[0].y);
      ctx.lineTo(vertices[5].x, vertices[5].y);
      ctx.lineTo(vertices[4].x, vertices[4].y);
      ctx.lineTo(vertices[3].x, vertices[3].y);
      ctx.closePath();
      const leftGrad = ctx.createLinearGradient(cx - prismSize, cy, cx, cy);
      leftGrad.addColorStop(0, `rgba(60, 80, 90, ${0.6 * intensity})`);
      leftGrad.addColorStop(1, `rgba(40, 55, 65, ${0.4 * intensity})`);
      ctx.fillStyle = leftGrad;
      ctx.fill();

      // Right facet
      ctx.beginPath();
      ctx.moveTo(vertices[0].x, vertices[0].y);
      ctx.lineTo(vertices[1].x, vertices[1].y);
      ctx.lineTo(vertices[2].x, vertices[2].y);
      ctx.lineTo(vertices[3].x, vertices[3].y);
      ctx.closePath();
      const rightGrad = ctx.createLinearGradient(cx, cy, cx + prismSize, cy);
      rightGrad.addColorStop(0, `rgba(80, 100, 110, ${0.7 * intensity})`);
      rightGrad.addColorStop(1, `rgba(100, 130, 145, ${0.5 * intensity})`);
      ctx.fillStyle = rightGrad;
      ctx.fill();

      // Top facet (brightest - light source)
      ctx.beginPath();
      ctx.moveTo(vertices[0].x, vertices[0].y);
      ctx.lineTo(vertices[1].x, vertices[1].y);
      ctx.lineTo(cx, cy);
      ctx.lineTo(vertices[5].x, vertices[5].y);
      ctx.closePath();
      const topGrad = ctx.createLinearGradient(cx, vertices[0].y, cx, cy);
      topGrad.addColorStop(0, `rgba(200, 220, 235, ${0.9 * intensity})`);
      topGrad.addColorStop(1, `rgba(120, 150, 170, ${0.4 * intensity})`);
      ctx.fillStyle = topGrad;
      ctx.fill();

      // Edge highlights
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.3 * intensity})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(vertices[0].x, vertices[0].y);
      ctx.lineTo(vertices[1].x, vertices[1].y);
      ctx.moveTo(vertices[0].x, vertices[0].y);
      ctx.lineTo(vertices[5].x, vertices[5].y);
      ctx.moveTo(vertices[0].x, vertices[0].y);
      ctx.lineTo(cx, cy);
      ctx.stroke();

      // === VOICE-REACTIVE ANGULAR BARS ===
      if (isActive) {
        const barCount = 7;
        const barWidth = 3;
        const maxBarHeight = 60;
        const barSpacing = 16;
        const barsStartX = cx - ((barCount - 1) * barSpacing) / 2;
        const barsY = cy + prismSize + 80;

        for (let i = 0; i < barCount; i++) {
          const barX = barsStartX + i * barSpacing;
          const heightMultiplier = Math.sin(time * 0.08 + i * 0.8) * 0.5 + 0.5;
          const barHeight = 8 + heightMultiplier * maxBarHeight * amplitude;
          
          // Angular bar (parallelogram shape)
          const skew = 4;
          ctx.beginPath();
          ctx.moveTo(barX - skew, barsY);
          ctx.lineTo(barX + skew, barsY - barHeight);
          ctx.lineTo(barX + barWidth + skew, barsY - barHeight);
          ctx.lineTo(barX + barWidth - skew, barsY);
          ctx.closePath();

          const barGrad = ctx.createLinearGradient(barX, barsY, barX, barsY - barHeight);
          barGrad.addColorStop(0, `rgba(150, 180, 200, ${0.2})`);
          barGrad.addColorStop(0.5, `rgba(180, 210, 230, ${0.6 * intensity})`);
          barGrad.addColorStop(1, `rgba(220, 240, 255, ${0.9 * intensity})`);
          ctx.fillStyle = barGrad;
          ctx.fill();
        }
      }

      // === FLOATING ANGULAR ACCENT LINES ===
      const lineCount = 3;
      for (let i = 0; i < lineCount; i++) {
        const yOffset = 150 + i * 60;
        const xStart = cx - 200 + Math.sin(time * 0.01 + i) * 30;
        const lineLength = 80 + Math.sin(time * 0.02 + i * 2) * 20;
        
        ctx.beginPath();
        ctx.moveTo(xStart, cy + yOffset);
        ctx.lineTo(xStart + lineLength, cy + yOffset - 10);
        ctx.strokeStyle = `rgba(200, 220, 240, ${0.15 * intensity})`;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Mirror on right
        ctx.beginPath();
        ctx.moveTo(width - xStart, cy + yOffset);
        ctx.lineTo(width - xStart - lineLength, cy + yOffset - 10);
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

  const handleActivate = useCallback(() => {
    if (state === "listening") {
      setState("idle");
    } else {
      setState("listening");
    }
  }, [state]);

  const getStateText = () => {
    switch (state) {
      case "listening": return t('voice.state.listening');
      case "thinking": return t('voice.state.thinking');
      case "speaking": return t('voice.state.speaking');
      default: return t('voice.readyToListen');
    }
  };

  const getSubText = () => {
    switch (state) {
      case "listening": return t('voice.state.listening.sub');
      case "thinking": return t('voice.state.thinking.sub');
      case "speaking": return t('voice.state.speaking.sub');
      default: return t('voice.tapToStart');
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className={cn(
        "fixed inset-0 z-50 flex flex-col overflow-hidden",
        "animate-prism-panel-in"
      )}
      style={{
        background: "linear-gradient(160deg, #0a0f14 0%, #0d1318 30%, #0f171d 60%, #0a1015 100%)"
      }}
    >
      {/* Canvas for all geometry */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{ width: "100%", height: "100%" }}
      />

      {/* Top controls - angular design */}
      <header className="relative z-10 flex items-center justify-between px-6 pt-6 pb-4">
        <button
          onClick={onClose}
          className="flex items-center gap-2 px-4 py-2 text-white/50 hover:text-white/80 transition-colors"
          style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)",
            clipPath: "polygon(0 0, 100% 0, 95% 100%, 5% 100%)"
          }}
        >
          <MessageCircle className="w-4 h-4" />
          <span className="text-sm tracking-wide">{t('voice.switchToText')}</span>
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="w-10 h-10 flex items-center justify-center text-white/40 hover:text-white/70 transition-colors"
            style={{
              background: "linear-gradient(135deg, rgba(255,255,255,0.02) 0%, transparent 100%)"
            }}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center text-white/40 hover:text-white/70 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Bahor logo - small, elegant placement */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 mt-[-40px] z-10 pointer-events-none">
        <img
          src={bahorLogo}
          alt="Bahor AI"
          className={cn(
            "w-10 h-10 object-contain transition-all duration-700",
            state === "thinking" && "animate-prism-logo-pulse"
          )}
          style={{
            filter: state !== "idle" 
              ? "brightness(1.3) drop-shadow(0 0 20px rgba(200,220,240,0.3))" 
              : "brightness(0.9) drop-shadow(0 0 10px rgba(200,220,240,0.15))"
          }}
        />
      </div>

      {/* Text elements - bottom placement */}
      <div className="absolute bottom-32 left-0 right-0 text-center z-10">
        <p 
          className={cn(
            "text-xl font-light tracking-[0.15em] text-white/80 mb-2",
            "transition-all duration-500 uppercase",
            state !== "idle" && "animate-prism-text-in"
          )}
        >
          {getStateText()}
        </p>
        <p 
          className="text-xs tracking-[0.2em] text-white/30 uppercase"
        >
          {getSubText()}
        </p>
      </div>

      {/* Activate control - angular bar instead of round button */}
      <footer className="absolute bottom-8 left-0 right-0 flex justify-center z-10">
        <button
          onClick={handleActivate}
          className={cn(
            "relative px-12 py-4 transition-all duration-300",
            "focus:outline-none"
          )}
          style={{
            background: state === "listening"
              ? "linear-gradient(135deg, rgba(180,80,80,0.15) 0%, rgba(180,80,80,0.05) 100%)"
              : "linear-gradient(135deg, rgba(200,220,240,0.1) 0%, rgba(200,220,240,0.02) 100%)",
            clipPath: "polygon(8% 0, 92% 0, 100% 50%, 92% 100%, 8% 100%, 0% 50%)",
            border: state === "listening" 
              ? "1px solid rgba(180,80,80,0.3)" 
              : "1px solid rgba(200,220,240,0.15)"
          }}
        >
          <span className={cn(
            "text-sm tracking-[0.25em] uppercase font-light",
            state === "listening" ? "text-red-300/80" : "text-white/60"
          )}>
            {state === "listening" ? "Stop" : "Begin"}
          </span>
        </button>
      </footer>
    </div>
  );
}
