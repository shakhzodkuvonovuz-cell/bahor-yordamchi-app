/**
 * FINAL BAHOR AI VOICE MODE
 * Premium, elegant voice interface matching Bahor AI brand identity
 * 
 * Features:
 * - Breathing orb with Bahor emblem
 * - Liquid silk waveform
 * - Smooth state transitions
 * - Subtle Uzbek ornamental pattern
 * - Golden-ratio layout spacing
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { X, Mic, Square, MessageCircle, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/i18n/LanguageProvider";
import bahorLogo from "@/assets/bahor-logo.png";

type VoiceState = "idle" | "listening" | "thinking" | "speaking";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function VoiceModeFinal({ isOpen, onClose }: Props) {
  const { t } = useTranslation();
  const [state, setState] = useState<VoiceState>("idle");
  const [amplitude, setAmplitude] = useState(0.5);
  const [isMuted, setIsMuted] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  // Start listening when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => setState("listening"), 400);
    } else {
      setState("idle");
    }
  }, [isOpen]);

  // Demo state cycle for preview
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

  // Liquid silk waveform animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = 320;
    const height = 80;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    let time = 0;
    const teal = { r: 0, g: 199, b: 177 };

    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      const centerY = height / 2;
      const isActive = state === "listening" || state === "speaking";
      const intensity = isActive ? amplitude : 0.15;

      // Draw liquid silk wave
      ctx.beginPath();
      
      for (let x = 0; x <= width; x += 1) {
        const normalX = x / width;
        
        // Fade edges smoothly
        const edgeFade = Math.sin(normalX * Math.PI);
        
        // Multiple harmonics for organic feel
        const wave1 = Math.sin(normalX * 4 + time * 0.03) * 12;
        const wave2 = Math.sin(normalX * 6 - time * 0.02) * 6;
        const wave3 = Math.sin(normalX * 10 + time * 0.05) * 3;
        
        const y = centerY + (wave1 + wave2 + wave3) * edgeFade * intensity;
        
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }

      // Gradient stroke
      const gradient = ctx.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, `rgba(${teal.r}, ${teal.g}, ${teal.b}, 0)`);
      gradient.addColorStop(0.2, `rgba(${teal.r}, ${teal.g}, ${teal.b}, ${0.6 * intensity})`);
      gradient.addColorStop(0.5, `rgba(${teal.r}, ${teal.g}, ${teal.b}, ${0.9 * intensity})`);
      gradient.addColorStop(0.8, `rgba(${teal.r}, ${teal.g}, ${teal.b}, ${0.6 * intensity})`);
      gradient.addColorStop(1, `rgba(${teal.r}, ${teal.g}, ${teal.b}, 0)`);

      ctx.strokeStyle = gradient;
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.stroke();

      // Glow layer
      ctx.shadowColor = `rgba(${teal.r}, ${teal.g}, ${teal.b}, ${0.5 * intensity})`;
      ctx.shadowBlur = 15;
      ctx.stroke();
      ctx.shadowBlur = 0;

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

  const handleMicClick = useCallback(() => {
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
        "animate-voice-panel-in"
      )}
      style={{
        background: "linear-gradient(180deg, #021a17 0%, #031f1b 40%, #042520 100%)"
      }}
    >
      {/* Subtle Uzbek ornamental pattern overlay */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 5 L35 15 L45 15 L37 22 L40 32 L30 26 L20 32 L23 22 L15 15 L25 15 Z' fill='%2300c7b1' fill-opacity='0.5'/%3E%3Ccircle cx='30' cy='30' r='3' fill='%2300c7b1' fill-opacity='0.3'/%3E%3C/svg%3E")`,
          backgroundSize: "120px 120px"
        }}
      />

      {/* Ambient glow */}
      <div 
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(0,199,177,0.08) 0%, transparent 60%)"
        }}
      />

      {/* Top controls */}
      <header className="relative z-10 flex items-center justify-between px-5 pt-6 pb-4">
        <button
          onClick={onClose}
          className="flex items-center gap-2 px-3 py-2 rounded-full bg-white/[0.06] backdrop-blur-sm border border-white/[0.08] text-white/60 hover:text-white hover:bg-white/[0.1] transition-all duration-300"
        >
          <MessageCircle className="w-4 h-4" />
          <span className="text-sm font-medium">{t('voice.switchToText')}</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="w-10 h-10 rounded-full bg-white/[0.06] backdrop-blur-sm border border-white/[0.08] flex items-center justify-center text-white/60 hover:text-white hover:bg-white/[0.1] transition-all duration-300"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/[0.06] backdrop-blur-sm border border-white/[0.08] flex items-center justify-center text-white/60 hover:text-white hover:bg-white/[0.1] transition-all duration-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main content - golden ratio spacing */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 -mt-8">
        {/* Bahor Emblem Orb */}
        <div className="relative mb-10">
          {/* Outer glow rings */}
          <div 
            className={cn(
              "absolute inset-0 -m-8 rounded-full transition-all duration-1000",
              state === "listening" && "animate-voice-ring-pulse"
            )}
            style={{
              background: "radial-gradient(circle, rgba(0,199,177,0.15) 0%, transparent 70%)"
            }}
          />
          <div 
            className={cn(
              "absolute inset-0 -m-16 rounded-full transition-all duration-1000",
              state !== "idle" && "animate-voice-ring-pulse-delayed"
            )}
            style={{
              background: "radial-gradient(circle, rgba(0,199,177,0.08) 0%, transparent 70%)"
            }}
          />

          {/* Particle shimmer ring */}
          <div className="absolute inset-0 -m-6">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className={cn(
                  "absolute w-1.5 h-1.5 rounded-full",
                  state !== "idle" ? "animate-voice-particle" : "opacity-30"
                )}
                style={{
                  background: "radial-gradient(circle, rgba(0,199,177,0.8) 0%, transparent 70%)",
                  top: "50%",
                  left: "50%",
                  transform: `rotate(${i * 45}deg) translateX(72px)`,
                  animationDelay: `${i * 0.15}s`
                }}
              />
            ))}
          </div>

          {/* Main orb */}
          <div
            className={cn(
              "relative w-[140px] h-[140px] rounded-full flex items-center justify-center",
              "bg-gradient-to-br from-[#042822] to-[#031e1a]",
              "border border-[rgba(0,199,177,0.2)]",
              "transition-all duration-700 ease-out",
              state === "listening" && "animate-voice-orb-breathe shadow-[0_0_60px_rgba(0,199,177,0.3)]",
              state === "thinking" && "animate-voice-orb-think shadow-[0_0_40px_rgba(0,199,177,0.2)]",
              state === "speaking" && "animate-voice-orb-speak shadow-[0_0_70px_rgba(0,199,177,0.35)]",
              state === "idle" && "shadow-[0_0_25px_rgba(0,199,177,0.15)]"
            )}
          >
            {/* Inner highlight */}
            <div 
              className="absolute inset-0 rounded-full"
              style={{
                background: "radial-gradient(circle at 35% 25%, rgba(0,199,177,0.1) 0%, transparent 50%)"
              }}
            />

            {/* Bahor logo */}
            <img
              src={bahorLogo}
              alt="Bahor AI"
              className={cn(
                "w-16 h-16 object-contain relative z-10 transition-all duration-500",
                state === "thinking" && "animate-voice-logo-spin"
              )}
              style={{
                filter: state !== "idle" 
                  ? "drop-shadow(0 0 15px rgba(0,199,177,0.6)) brightness(1.15)" 
                  : "drop-shadow(0 0 8px rgba(0,199,177,0.3))"
              }}
            />
          </div>
        </div>

        {/* Liquid silk waveform */}
        <div className="mb-10">
          <canvas
            ref={canvasRef}
            className="w-[320px] h-[80px]"
            style={{ width: 320, height: 80 }}
          />
        </div>

        {/* Text elements */}
        <div className="text-center mb-auto">
          <p 
            className={cn(
              "text-2xl font-medium tracking-wide text-white/90 mb-3",
              "transition-all duration-500",
              state !== "idle" && "animate-voice-text-fade"
            )}
            style={{ letterSpacing: "0.02em" }}
          >
            {getStateText()}
          </p>
          <p 
            className="text-sm text-white/40 tracking-wide"
            style={{ letterSpacing: "0.05em" }}
          >
            {getSubText()}
          </p>
        </div>
      </main>

      {/* Bottom mic button */}
      <footer className="relative z-10 flex justify-center pb-12 pt-6">
        <button
          onClick={handleMicClick}
          className={cn(
            "relative w-16 h-16 rounded-full flex items-center justify-center",
            "transition-all duration-300 ease-out",
            "focus:outline-none focus:ring-2 focus:ring-[#00c7b1]/50 focus:ring-offset-2 focus:ring-offset-[#021a17]"
          )}
        >
          {/* Button glow ring */}
          <div 
            className={cn(
              "absolute inset-0 rounded-full transition-all duration-300",
              state === "listening" 
                ? "bg-[#ff4d4d]/20 border-2 border-[#ff4d4d]/60 shadow-[0_0_25px_rgba(255,77,77,0.4)]" 
                : "bg-[#00c7b1]/15 border-2 border-[#00c7b1]/50 shadow-[0_0_20px_rgba(0,199,177,0.3)] hover:shadow-[0_0_30px_rgba(0,199,177,0.5)]"
            )}
          />
          
          {/* Ripple effect on press */}
          <div 
            className={cn(
              "absolute inset-0 rounded-full",
              state === "listening" && "animate-voice-ripple"
            )}
            style={{
              background: state === "listening" 
                ? "rgba(255,77,77,0.2)" 
                : "rgba(0,199,177,0.2)"
            }}
          />

          {/* Icon */}
          {state === "listening" ? (
            <Square className="w-5 h-5 text-[#ff4d4d] relative z-10" />
          ) : (
            <Mic className="w-6 h-6 text-[#00c7b1] relative z-10" />
          )}
        </button>
      </footer>
    </div>
  );
}
