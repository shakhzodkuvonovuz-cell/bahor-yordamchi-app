/**
 * VOICE CONCEPT: "Glass"
 * Ultra-premium floating glass panel — Apple VisionOS / Arc Browser aesthetic
 * 
 * NO pyramids, cubes, hexagons, harsh geometry
 * YES: Soft glowing glass, gentle gradients, calm transitions
 * 
 * References: Apple VisionOS, Arc Browser panels, Mercedes MBUX, HER film
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

export default function VoiceConceptGlass({ isOpen, onClose }: Props) {
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
      }, 120);
      return () => clearInterval(interval);
    } else {
      setAmplitude(0.3);
    }
  }, [state]);

  // Elegant light line animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = 400;
    const height = 60;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    let time = 0;

    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      const centerY = height / 2;
      const isActive = state !== "idle";
      const intensity = isActive ? amplitude : 0.2;

      // Single elegant flowing line
      ctx.beginPath();
      
      for (let x = 0; x <= width; x += 2) {
        const normalX = x / width;
        
        // Smooth sine wave, very gentle
        const wave = Math.sin(normalX * Math.PI * 2 + time * 0.03) * 8 * intensity;
        const y = centerY + wave;
        
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }

      // Soft gradient stroke
      const gradient = ctx.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, "rgba(255, 255, 255, 0)");
      gradient.addColorStop(0.3, `rgba(255, 255, 255, ${0.4 * intensity})`);
      gradient.addColorStop(0.5, `rgba(255, 255, 255, ${0.6 * intensity})`);
      gradient.addColorStop(0.7, `rgba(255, 255, 255, ${0.4 * intensity})`);
      gradient.addColorStop(1, "rgba(255, 255, 255, 0)");

      ctx.strokeStyle = gradient;
      ctx.lineWidth = 1.5;
      ctx.lineCap = "round";
      ctx.stroke();

      // Subtle glow
      if (isActive) {
        ctx.shadowColor = "rgba(255, 255, 255, 0.5)";
        ctx.shadowBlur = 10;
        ctx.stroke();
        ctx.shadowBlur = 0;
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

  if (!isOpen) return null;

  return (
    <div 
      className={cn(
        "fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden",
        "animate-glass-panel-in"
      )}
      style={{
        background: "linear-gradient(180deg, #0f0f12 0%, #13131a 50%, #0a0a0f 100%)"
      }}
    >
      {/* Ambient background glow - very subtle */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] pointer-events-none"
        style={{
          background: "radial-gradient(ellipse, rgba(255,255,255,0.02) 0%, transparent 60%)",
          filter: "blur(40px)"
        }}
      />

      {/* Top controls - minimal, elegant */}
      <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-5">
        <button
          onClick={onClose}
          className="flex items-center gap-2 px-4 py-2 rounded-full text-white/40 hover:text-white/70 hover:bg-white/5 transition-all duration-300"
        >
          <MessageCircle className="w-4 h-4" />
          <span className="text-sm font-light tracking-wide">{t('voice.switchToText')}</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/5 transition-all duration-300"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/5 transition-all duration-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* MAIN: Floating Glass Panel */}
      <div className="relative">
        {/* Outer glow layer */}
        <div 
          className={cn(
            "absolute -inset-4 rounded-[32px] transition-all duration-700",
            state !== "idle" && "animate-glass-glow"
          )}
          style={{
            background: "radial-gradient(ellipse, rgba(255,255,255,0.04) 0%, transparent 70%)",
            filter: "blur(20px)"
          }}
        />

        {/* The Glass Panel */}
        <div 
          className={cn(
            "relative w-[320px] h-[200px] rounded-[28px] overflow-hidden",
            "transition-all duration-700 ease-out",
            state === "listening" && "scale-[1.02]",
            state === "thinking" && "scale-[0.98]",
            state === "speaking" && "scale-[1.01]"
          )}
          style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)",
            backdropFilter: "blur(40px)",
            WebkitBackdropFilter: "blur(40px)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: state !== "idle" 
              ? "0 8px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)"
              : "0 4px 40px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)"
          }}
        >
          {/* Inner highlight - top edge */}
          <div 
            className="absolute top-0 left-4 right-4 h-[1px]"
            style={{
              background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)"
            }}
          />

          {/* Content */}
          <div className="relative h-full flex flex-col items-center justify-center px-8">
            {/* Bahor Logo */}
            <div className={cn(
              "mb-6 transition-all duration-500",
              state === "thinking" && "animate-glass-logo-breathe"
            )}>
              <img
                src={bahorLogo}
                alt="Bahor AI"
                className="w-14 h-14 object-contain"
                style={{
                  filter: state !== "idle" 
                    ? "brightness(1.2) drop-shadow(0 0 20px rgba(255,255,255,0.2))" 
                    : "brightness(0.9)"
                }}
              />
            </div>

            {/* Voice line canvas */}
            <canvas
              ref={canvasRef}
              className="w-[280px] h-[40px]"
              style={{ width: 280, height: 40 }}
            />
          </div>
        </div>
      </div>

      {/* State text - below panel */}
      <div className="mt-10 text-center">
        <p 
          className={cn(
            "text-lg font-light tracking-[0.08em] text-white/70 mb-2",
            "transition-all duration-500",
            state !== "idle" && "text-white/90"
          )}
        >
          {getStateText()}
        </p>
      </div>

      {/* Bottom control - elegant pill button */}
      <div className="absolute bottom-12 left-0 right-0 flex justify-center">
        <button
          onClick={handleActivate}
          className={cn(
            "px-8 py-3 rounded-full transition-all duration-300",
            "font-light text-sm tracking-[0.1em]",
            state === "listening"
              ? "bg-white/10 text-white/90 border border-white/20"
              : "bg-white/5 text-white/50 border border-white/10 hover:bg-white/10 hover:text-white/70"
          )}
        >
          {state === "listening" ? "Tap to stop" : "Tap to speak"}
        </button>
      </div>
    </div>
  );
}
