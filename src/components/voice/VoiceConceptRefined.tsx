/**
 * REFINED BAHOR AI VOICE MODE
 * The official voice interface identity - dark, elegant, teal, calm, premium
 * 
 * Features:
 * - Centered circular core with breathing glow
 * - Floating micro-particles
 * - Smooth teal frequency ribbon
 * - Soft radial gradient depth
 * - Premium animations throughout
 */

import { useState, useEffect, useRef } from "react";
import { X, Mic, Square, MessageSquare, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/i18n/LanguageProvider";
import bahorLogo from "@/assets/bahor-logo.png";

type VoiceState = "idle" | "listening" | "thinking" | "speaking";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

// Micro-particle component
function MicroParticle({ index, total }: { index: number; total: number }) {
  const angle = (index / total) * 360;
  const distance = 100 + Math.random() * 40;
  const size = 2 + Math.random() * 2;
  const duration = 8 + Math.random() * 6;
  const delay = Math.random() * 4;
  
  return (
    <div
      className="absolute rounded-full animate-voice-particle-float"
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle, rgba(0, 224, 200, 0.6) 0%, rgba(0, 224, 200, 0) 70%)`,
        left: '50%',
        top: '50%',
        transform: `rotate(${angle}deg) translateX(${distance}px)`,
        animationDuration: `${duration}s`,
        animationDelay: `${delay}s`,
        boxShadow: '0 0 6px rgba(0, 224, 200, 0.4)',
      }}
    />
  );
}

export default function VoiceConceptRefined({ isOpen, onClose }: Props) {
  const { t } = useTranslation();
  const [state, setState] = useState<VoiceState>("idle");
  const [amplitude, setAmplitude] = useState(0.5);
  const [isMuted, setIsMuted] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  // Initialize state when opened
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setState("listening"), 400);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Demo state cycle
  useEffect(() => {
    if (!isOpen) return;
    
    if (state === "listening") {
      const t1 = setTimeout(() => setState("thinking"), 5000);
      return () => clearTimeout(t1);
    }
    if (state === "thinking") {
      const t2 = setTimeout(() => setState("speaking"), 2500);
      return () => clearTimeout(t2);
    }
    if (state === "speaking") {
      const t3 = setTimeout(() => setState("listening"), 3500);
      return () => clearTimeout(t3);
    }
  }, [state, isOpen]);

  // Simulate voice amplitude
  useEffect(() => {
    if (state !== "listening") return;
    
    const interval = setInterval(() => {
      setAmplitude(0.3 + Math.random() * 0.7);
    }, 100);
    
    return () => clearInterval(interval);
  }, [state]);

  // Frequency ribbon canvas animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth * 2;
      canvas.height = canvas.offsetHeight * 2;
      ctx.scale(2, 2);
    };
    resize();

    let time = 0;

    const draw = () => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      
      ctx.clearRect(0, 0, w, h);

      // Draw frequency ribbon
      const ribbonY = h / 2;
      const ribbonHeight = 40;
      
      ctx.beginPath();
      ctx.moveTo(0, ribbonY);

      for (let x = 0; x <= w; x += 2) {
        const progress = x / w;
        const wave1 = Math.sin(progress * Math.PI * 3 + time * 2) * 12 * amplitude;
        const wave2 = Math.sin(progress * Math.PI * 5 + time * 1.5) * 6 * amplitude;
        const wave3 = Math.sin(progress * Math.PI * 2 + time * 0.8) * 8 * amplitude;
        
        const y = ribbonY + wave1 + wave2 + wave3;
        ctx.lineTo(x, y);
      }

      // Create gradient stroke
      const gradient = ctx.createLinearGradient(0, ribbonY - ribbonHeight, w, ribbonY + ribbonHeight);
      gradient.addColorStop(0, 'rgba(0, 224, 200, 0.1)');
      gradient.addColorStop(0.3, 'rgba(0, 224, 200, 0.6)');
      gradient.addColorStop(0.5, 'rgba(100, 255, 218, 0.8)');
      gradient.addColorStop(0.7, 'rgba(0, 224, 200, 0.6)');
      gradient.addColorStop(1, 'rgba(0, 224, 200, 0.1)');

      ctx.strokeStyle = gradient;
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Add glow effect
      ctx.shadowColor = 'rgba(0, 224, 200, 0.5)';
      ctx.shadowBlur = 15;
      ctx.stroke();
      ctx.shadowBlur = 0;

      time += 0.02;
      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [amplitude, state]);

  const handleMicClick = () => {
    setState(state === "listening" ? "idle" : "listening");
  };

  const getStateText = () => {
    switch (state) {
      case "listening": return t('voice.listening') || "Tinglayapman...";
      case "thinking": return t('voice.thinking') || "O'ylayapman...";
      case "speaking": return t('voice.speaking') || "Javob beryapman...";
      default: return t('voice.tapToSpeak') || "Bosib gapiring";
    }
  };

  const getSubText = () => {
    switch (state) {
      case "listening": return t('voice.speakNaturally') || "Erkin gapiring. Bahor AI tinglayapti.";
      case "thinking": return t('voice.processing') || "Javob tayyorlanmoqda...";
      case "speaking": return t('voice.responding') || "Audio javob berilmoqda...";
      default: return t('voice.ready') || "Tayyor";
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex flex-col overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, #02080a 0%, #071215 50%, #0b1113 100%)'
      }}
    >
      {/* Subtle Uzbek ornamental pattern overlay */}
      <div 
        className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 5L35 15L45 15L37 22L40 32L30 26L20 32L23 22L15 15L25 15Z' fill='%2300e0c8' fill-opacity='0.3'/%3E%3C/svg%3E")`,
          backgroundSize: '80px 80px'
        }}
      />

      {/* Radial gradient depth behind center */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 50% 45%, rgba(0, 224, 200, 0.08) 0%, rgba(0, 224, 200, 0.02) 30%, transparent 60%)'
        }}
      />

      {/* Header controls */}
      <div className="relative z-10 flex items-center justify-between px-6 py-5">
        <button
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 text-white/70 hover:bg-white/10 transition-all"
        >
          <MessageSquare className="w-4 h-4" />
          <span className="text-sm font-light">{t('voice.textMode') || "Matn rejimi"}</span>
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="w-10 h-10 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white/70 hover:bg-white/10 transition-all"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white/70 hover:bg-white/10 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main content - centered */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 -mt-16">
        
        {/* Central orb with breathing glow and particles */}
        <div className="relative flex items-center justify-center mb-12">
          
          {/* Micro-particles */}
          <div className="absolute inset-0 flex items-center justify-center">
            {[...Array(8)].map((_, i) => (
              <MicroParticle key={i} index={i} total={8} />
            ))}
          </div>

          {/* Outer breathing glow ring */}
          <div 
            className={cn(
              "absolute rounded-full transition-all duration-1000",
              state === "listening" && "animate-voice-breathe-outer"
            )}
            style={{
              width: 200,
              height: 200,
              background: 'radial-gradient(circle, rgba(0, 224, 200, 0.15) 0%, rgba(0, 224, 200, 0.05) 50%, transparent 70%)',
              filter: 'blur(20px)',
            }}
          />

          {/* Inner glow ring */}
          <div 
            className={cn(
              "absolute rounded-full transition-all duration-700",
              state !== "idle" && "animate-voice-breathe-inner"
            )}
            style={{
              width: 160,
              height: 160,
              background: 'radial-gradient(circle, rgba(0, 224, 200, 0.2) 0%, transparent 60%)',
              filter: 'blur(10px)',
            }}
          />

          {/* Main circular core */}
          <div 
            className={cn(
              "relative w-32 h-32 rounded-full flex items-center justify-center transition-all duration-500",
              state === "listening" && "animate-voice-core-pulse"
            )}
            style={{
              background: 'linear-gradient(145deg, rgba(0, 224, 200, 0.15) 0%, rgba(0, 224, 200, 0.05) 100%)',
              border: '1px solid rgba(0, 224, 200, 0.3)',
              boxShadow: state !== "idle" 
                ? '0 0 40px rgba(0, 224, 200, 0.3), inset 0 0 30px rgba(0, 224, 200, 0.1)'
                : '0 0 20px rgba(0, 224, 200, 0.15)',
            }}
          >
            {/* Bahor AI Logo */}
            <img 
              src={bahorLogo} 
              alt="Bahor AI" 
              className={cn(
                "w-16 h-16 object-contain transition-all duration-500",
                state !== "idle" && "animate-voice-logo-glow"
              )}
              style={{
                filter: state !== "idle" 
                  ? 'drop-shadow(0 0 12px rgba(0, 224, 200, 0.6))'
                  : 'drop-shadow(0 0 6px rgba(0, 224, 200, 0.3))',
              }}
            />
          </div>
        </div>

        {/* State text with fade-in animation */}
        <div className="text-center mb-8">
          <p 
            className={cn(
              "text-2xl font-light tracking-wide text-white mb-3 transition-all duration-500",
              state !== "idle" && "animate-voice-text-glow"
            )}
            style={{
              textShadow: state === "listening" ? '0 0 20px rgba(0, 224, 200, 0.4)' : 'none'
            }}
          >
            {getStateText()}
          </p>
          <p className="text-sm text-white/40 font-light tracking-wide">
            {getSubText()}
          </p>
        </div>

        {/* Frequency ribbon */}
        <div className="w-full max-w-md h-20 relative">
          <canvas 
            ref={canvasRef}
            className="w-full h-full"
            style={{ opacity: state === "idle" ? 0.3 : 1 }}
          />
        </div>
      </div>

      {/* Bottom control */}
      <div className="relative z-10 flex justify-center pb-12">
        {state === "listening" ? (
          // Stop button with red glow and heartbeat
          <button
            onClick={handleMicClick}
            className="relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 animate-voice-stop-heartbeat group"
            style={{
              background: 'linear-gradient(145deg, rgba(239, 68, 68, 0.2) 0%, rgba(239, 68, 68, 0.1) 100%)',
              border: '2px solid rgba(239, 68, 68, 0.5)',
              boxShadow: '0 0 30px rgba(239, 68, 68, 0.3)',
            }}
          >
            {/* Ripple effect on tap */}
            <div className="absolute inset-0 rounded-full bg-red-500/20 scale-0 group-active:scale-150 group-active:opacity-0 transition-all duration-500" />
            <Square className="w-5 h-5 text-red-400 fill-red-400" />
          </button>
        ) : (
          // Mic button with teal glow
          <button
            onClick={handleMicClick}
            className="relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-105 group"
            style={{
              background: 'linear-gradient(145deg, rgba(0, 224, 200, 0.2) 0%, rgba(0, 224, 200, 0.1) 100%)',
              border: '2px solid rgba(0, 224, 200, 0.5)',
              boxShadow: '0 0 30px rgba(0, 224, 200, 0.3)',
            }}
          >
            {/* Ripple effect on tap */}
            <div className="absolute inset-0 rounded-full bg-teal-400/20 scale-0 group-active:scale-150 group-active:opacity-0 transition-all duration-500" />
            <Mic className="w-6 h-6 text-teal-400" />
          </button>
        )}
      </div>
    </div>
  );
}
