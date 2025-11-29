/**
 * CONCEPT A: "Whisper"
 * Ultra-minimal, elegant, soft blur, Apple/Siri-style fluidity
 * 
 * Visual Identity: Pure white/soft grey with single accent color
 * Animation: Soft breathing circle that expands like a whisper
 * Typography: SF Pro-like, ultra-light, generous spacing
 * Color Palette: #FAFAFA, #E5E5E5, #00C7B1 (accent), #1A1A1A (text)
 */

import { useState, useEffect, useRef } from "react";
import { X, Mic } from "lucide-react";
import { cn } from "@/lib/utils";
import bahorLogo from "@/assets/bahor-logo.png";

type VoiceState = "idle" | "listening" | "thinking" | "speaking";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function VoiceConceptA({ isOpen, onClose }: Props) {
  const [state, setState] = useState<VoiceState>("idle");
  const [ripples, setRipples] = useState<number[]>([]);
  const rippleId = useRef(0);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => setState("listening"), 500);
    }
  }, [isOpen]);

  useEffect(() => {
    if (state === "listening") {
      const interval = setInterval(() => {
        rippleId.current += 1;
        setRipples(prev => [...prev.slice(-3), rippleId.current]);
      }, 1200);
      return () => clearInterval(interval);
    }
  }, [state]);

  // Demo cycle
  useEffect(() => {
    if (state === "listening") {
      const t1 = setTimeout(() => setState("thinking"), 4000);
      return () => clearTimeout(t1);
    }
    if (state === "thinking") {
      const t2 = setTimeout(() => setState("speaking"), 2500);
      return () => clearTimeout(t2);
    }
    if (state === "speaking") {
      const t3 = setTimeout(() => setState("listening"), 3000);
      return () => clearTimeout(t3);
    }
  }, [state]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#FAFAFA] flex flex-col items-center justify-center overflow-hidden">
      {/* Subtle gradient overlay */}
      <div 
        className="absolute inset-0 opacity-50"
        style={{
          background: "radial-gradient(circle at 50% 40%, rgba(0,199,177,0.08) 0%, transparent 60%)"
        }}
      />

      {/* Close button - top right, minimal */}
      <button
        onClick={onClose}
        className="absolute top-6 right-6 w-10 h-10 rounded-full bg-black/5 flex items-center justify-center hover:bg-black/10 transition-all"
      >
        <X className="w-5 h-5 text-[#1A1A1A]/60" />
      </button>

      {/* Central breathing circle with ripples */}
      <div className="relative flex items-center justify-center mb-16">
        {/* Ripple waves */}
        {ripples.map((id) => (
          <div
            key={id}
            className="absolute w-32 h-32 rounded-full border border-[#00C7B1]/30 animate-concept-a-ripple"
          />
        ))}

        {/* Main breathing orb */}
        <div 
          className={cn(
            "relative w-32 h-32 rounded-full flex items-center justify-center transition-all duration-1000",
            state === "listening" && "animate-concept-a-breathe",
            state === "thinking" && "animate-concept-a-pulse",
            state === "speaking" && "animate-concept-a-speak"
          )}
          style={{
            background: state === "idle" 
              ? "linear-gradient(145deg, #F0F0F0, #E8E8E8)"
              : "linear-gradient(145deg, rgba(0,199,177,0.15), rgba(0,199,177,0.05))",
            boxShadow: state !== "idle" 
              ? "0 0 60px rgba(0,199,177,0.2), inset 0 0 30px rgba(0,199,177,0.1)"
              : "0 4px 20px rgba(0,0,0,0.05)"
          }}
        >
          {/* Logo - subtle, centered */}
          <img 
            src={bahorLogo} 
            alt="" 
            className={cn(
              "w-12 h-12 object-contain transition-all duration-500",
              state !== "idle" && "opacity-90"
            )}
            style={{
              filter: state !== "idle" ? "drop-shadow(0 0 8px rgba(0,199,177,0.4))" : "none"
            }}
          />
        </div>
      </div>

      {/* State text - ultra minimal */}
      <div className="text-center">
        <p 
          className={cn(
            "text-3xl font-extralight tracking-[0.15em] text-[#1A1A1A] transition-all duration-500",
            state === "listening" && "text-[#00C7B1]"
          )}
          style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}
        >
          {state === "idle" && "Tap to speak"}
          {state === "listening" && "Listening..."}
          {state === "thinking" && "Processing"}
          {state === "speaking" && "Speaking"}
        </p>
        <p className="mt-4 text-sm font-light text-[#1A1A1A]/40 tracking-widest">
          BAHOR AI
        </p>
      </div>

      {/* Bottom mic button - floating pill */}
      <div className="absolute bottom-12">
        <button
          onClick={() => setState(state === "listening" ? "idle" : "listening")}
          className={cn(
            "px-8 py-4 rounded-full flex items-center gap-3 transition-all duration-300",
            state === "listening" 
              ? "bg-[#00C7B1] text-white shadow-[0_0_30px_rgba(0,199,177,0.4)]"
              : "bg-[#1A1A1A] text-white hover:bg-[#333]"
          )}
        >
          <Mic className="w-5 h-5" />
          <span className="font-light tracking-wide">
            {state === "listening" ? "Stop" : "Speak"}
          </span>
        </button>
      </div>
    </div>
  );
}
