import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface VoiceWaveformProps {
  isActive: boolean;
  amplitude?: number; // 0-1 for voice input level
  className?: string;
}

export default function VoiceWaveform({ isActive, amplitude = 0.5, className }: VoiceWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [bars] = useState(() => 
    Array.from({ length: 48 }, () => ({
      height: Math.random() * 0.3 + 0.1,
      targetHeight: Math.random() * 0.3 + 0.1,
      velocity: Math.random() * 0.02 + 0.01,
      phase: Math.random() * Math.PI * 2,
    }))
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set up canvas for high DPI
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    let time = 0;

    const animate = () => {
      if (!ctx || !canvas) return;
      
      const width = rect.width;
      const height = rect.height;
      const centerY = height / 2;
      
      // Clear canvas
      ctx.clearRect(0, 0, width, height);
      
      // Calculate bar properties
      const barCount = bars.length;
      const barWidth = 3;
      const gap = (width - barCount * barWidth) / (barCount + 1);
      
      // Draw bars with smooth animation
      bars.forEach((bar, i) => {
        // Update target height based on activity
        if (isActive) {
          const wave = Math.sin(time * 0.05 + bar.phase + i * 0.15) * 0.5 + 0.5;
          const centerInfluence = 1 - Math.abs((i - barCount / 2) / (barCount / 2));
          bar.targetHeight = (0.15 + wave * 0.6 * amplitude + centerInfluence * 0.2 * amplitude);
        } else {
          bar.targetHeight = 0.08 + Math.sin(time * 0.02 + bar.phase) * 0.04;
        }
        
        // Smooth interpolation
        bar.height += (bar.targetHeight - bar.height) * 0.15;
        
        const x = gap + i * (barWidth + gap);
        const barHeight = bar.height * height * 0.7;
        const y = centerY - barHeight / 2;
        
        // Create gradient for each bar
        const gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
        const glowIntensity = isActive ? amplitude * 0.8 + 0.2 : 0.3;
        
        gradient.addColorStop(0, `hsla(175, 60%, 48%, ${glowIntensity * 0.4})`);
        gradient.addColorStop(0.3, `hsla(175, 60%, 55%, ${glowIntensity})`);
        gradient.addColorStop(0.5, `hsla(180, 65%, 60%, ${glowIntensity})`);
        gradient.addColorStop(0.7, `hsla(175, 60%, 55%, ${glowIntensity})`);
        gradient.addColorStop(1, `hsla(175, 60%, 48%, ${glowIntensity * 0.4})`);
        
        // Draw bar with rounded caps
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, barWidth / 2);
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // Add glow effect when active
        if (isActive && amplitude > 0.3) {
          ctx.shadowColor = "hsla(175, 60%, 50%, 0.6)";
          ctx.shadowBlur = 8 * amplitude;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      });
      
      time++;
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive, amplitude, bars]);

  return (
    <div className={cn("relative", className)}>
      {/* Glow background */}
      <div 
        className={cn(
          "absolute inset-0 rounded-full blur-3xl transition-opacity duration-500",
          isActive ? "opacity-40" : "opacity-10"
        )}
        style={{
          background: `radial-gradient(ellipse at center, 
            hsla(175, 60%, 50%, ${isActive ? 0.3 * amplitude : 0.1}) 0%, 
            transparent 70%)`
        }}
      />
      
      <canvas 
        ref={canvasRef}
        className="w-full h-full"
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}
