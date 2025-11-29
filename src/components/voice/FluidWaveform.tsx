import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface FluidWaveformProps {
  isActive: boolean;
  amplitude?: number;
  state: "listening" | "thinking" | "speaking" | "idle";
  className?: string;
}

export default function FluidWaveform({ isActive, amplitude = 0.5, state, className }: FluidWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const centerY = height / 2;

    let time = 0;

    const getStateColors = () => {
      switch (state) {
        case "listening":
          return {
            primary: { h: 172, s: 80, l: 45 },
            secondary: { h: 168, s: 70, l: 50 },
            glow: { h: 175, s: 85, l: 55 },
          };
        case "thinking":
          return {
            primary: { h: 190, s: 80, l: 45 },
            secondary: { h: 185, s: 70, l: 50 },
            glow: { h: 195, s: 85, l: 55 },
          };
        case "speaking":
          return {
            primary: { h: 155, s: 80, l: 45 },
            secondary: { h: 160, s: 70, l: 50 },
            glow: { h: 150, s: 85, l: 55 },
          };
        default:
          return {
            primary: { h: 175, s: 60, l: 40 },
            secondary: { h: 180, s: 50, l: 45 },
            glow: { h: 172, s: 65, l: 50 },
          };
      }
    };

    const animate = () => {
      if (!ctx || !canvas) return;
      
      ctx.clearRect(0, 0, width, height);
      const colors = getStateColors();
      const activeAmplitude = isActive ? amplitude : 0.15;

      // Draw multiple fluid wave layers
      const layers = 4;
      
      for (let layer = layers - 1; layer >= 0; layer--) {
        const layerOffset = layer * 0.2;
        const layerOpacity = 0.2 + (1 - layer / layers) * 0.5;
        const layerAmplitude = (height * 0.15 * activeAmplitude) * (1 - layer * 0.15);
        
        // Create gradient for this layer
        const gradient = ctx.createLinearGradient(0, 0, width, 0);
        const hueShift = layer * 5;
        
        gradient.addColorStop(0, `hsla(${colors.primary.h + hueShift}, ${colors.primary.s}%, ${colors.primary.l}%, ${layerOpacity * 0.6})`);
        gradient.addColorStop(0.25, `hsla(${colors.secondary.h + hueShift}, ${colors.secondary.s}%, ${colors.secondary.l}%, ${layerOpacity * 0.8})`);
        gradient.addColorStop(0.5, `hsla(${colors.glow.h + hueShift}, ${colors.glow.s}%, ${colors.glow.l}%, ${layerOpacity})`);
        gradient.addColorStop(0.75, `hsla(${colors.secondary.h + hueShift}, ${colors.secondary.s}%, ${colors.secondary.l}%, ${layerOpacity * 0.8})`);
        gradient.addColorStop(1, `hsla(${colors.primary.h + hueShift}, ${colors.primary.s}%, ${colors.primary.l}%, ${layerOpacity * 0.6})`);

        // Draw smooth bezier curve wave
        ctx.beginPath();
        ctx.moveTo(0, centerY);
        
        const segments = 100;
        const points: { x: number; y: number }[] = [];
        
        for (let i = 0; i <= segments; i++) {
          const x = (i / segments) * width;
          const normalizedX = i / segments;
          
          // Multiple sine waves for organic feel
          const wave1 = Math.sin(normalizedX * Math.PI * 4 + time * 0.03 + layerOffset) * layerAmplitude * 0.5;
          const wave2 = Math.sin(normalizedX * Math.PI * 6 - time * 0.04 + layerOffset) * layerAmplitude * 0.3;
          const wave3 = Math.sin(normalizedX * Math.PI * 2 + time * 0.02 + layerOffset) * layerAmplitude * 0.2;
          const wave4 = Math.cos(normalizedX * Math.PI * 8 + time * 0.05) * layerAmplitude * 0.1 * activeAmplitude;
          
          // Add envelope that tapers at edges
          const envelope = Math.sin(normalizedX * Math.PI);
          const y = centerY + (wave1 + wave2 + wave3 + wave4) * envelope;
          
          points.push({ x, y });
        }
        
        // Draw smooth curve through points
        for (let i = 0; i < points.length - 1; i++) {
          const p0 = points[Math.max(0, i - 1)];
          const p1 = points[i];
          const p2 = points[i + 1];
          const p3 = points[Math.min(points.length - 1, i + 2)];
          
          // Catmull-Rom to Bezier conversion
          const cp1x = p1.x + (p2.x - p0.x) / 6;
          const cp1y = p1.y + (p2.y - p0.y) / 6;
          const cp2x = p2.x - (p3.x - p1.x) / 6;
          const cp2y = p2.y - (p3.y - p1.y) / 6;
          
          ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
        }
        
        // Fill with gradient
        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.closePath();
        
        // Glow effect
        ctx.shadowColor = `hsla(${colors.glow.h}, ${colors.glow.s}%, ${colors.glow.l}%, 0.5)`;
        ctx.shadowBlur = 20 * (1 - layer * 0.2);
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.shadowBlur = 0;
        
        // Draw stroke on top layer
        if (layer === 0) {
          ctx.beginPath();
          ctx.moveTo(points[0].x, points[0].y);
          
          for (let i = 0; i < points.length - 1; i++) {
            const p0 = points[Math.max(0, i - 1)];
            const p1 = points[i];
            const p2 = points[i + 1];
            const p3 = points[Math.min(points.length - 1, i + 2)];
            
            const cp1x = p1.x + (p2.x - p0.x) / 6;
            const cp1y = p1.y + (p2.y - p0.y) / 6;
            const cp2x = p2.x - (p3.x - p1.x) / 6;
            const cp2y = p2.y - (p3.y - p1.y) / 6;
            
            ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
          }
          
          const strokeGradient = ctx.createLinearGradient(0, 0, width, 0);
          strokeGradient.addColorStop(0, `hsla(${colors.primary.h}, ${colors.primary.s}%, ${colors.primary.l + 10}%, 0.3)`);
          strokeGradient.addColorStop(0.5, `hsla(${colors.glow.h}, ${colors.glow.s}%, ${colors.glow.l + 10}%, 0.8)`);
          strokeGradient.addColorStop(1, `hsla(${colors.primary.h}, ${colors.primary.s}%, ${colors.primary.l + 10}%, 0.3)`);
          
          ctx.strokeStyle = strokeGradient;
          ctx.lineWidth = 2;
          ctx.shadowColor = `hsla(${colors.glow.h}, ${colors.glow.s}%, ${colors.glow.l}%, 0.8)`;
          ctx.shadowBlur = 15;
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
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
  }, [isActive, amplitude, state]);

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
            hsla(175, 70%, 50%, ${isActive ? 0.25 * amplitude : 0.08}) 0%, 
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
