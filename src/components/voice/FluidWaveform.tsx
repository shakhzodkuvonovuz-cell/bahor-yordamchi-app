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
    const centerY = height * 0.45; // Slightly above center for floating effect

    let time = 0;

    // Bahor AI colors
    const colors = {
      primary: { r: 0, g: 224, b: 200 },    // #00E0C8
      secondary: { r: 0, g: 200, b: 220 },  // Cyan
      glow: { r: 80, g: 255, b: 220 },      // Bright
    };

    const animate = () => {
      if (!ctx || !canvas) return;
      
      ctx.clearRect(0, 0, width, height);
      
      const activeAmplitude = isActive ? Math.max(0.2, amplitude) : 0.08;
      const speed = state === "speaking" ? 0.045 : 0.025;

      // Create curved floating waveform (like liquid light)
      const layers = 4;
      
      for (let layer = layers - 1; layer >= 0; layer--) {
        const layerOffset = layer * 0.4;
        const layerOpacity = 0.12 + (1 - layer / layers) * 0.45;
        const layerAmplitude = (height * 0.4 * activeAmplitude) * (1 - layer * 0.15);
        
        // Curved gradient
        const gradient = ctx.createLinearGradient(0, centerY - layerAmplitude, width, centerY + layerAmplitude);
        
        gradient.addColorStop(0, `rgba(${colors.primary.r}, ${colors.primary.g}, ${colors.primary.b}, ${layerOpacity * 0.3})`);
        gradient.addColorStop(0.25, `rgba(${colors.secondary.r}, ${colors.secondary.g}, ${colors.secondary.b}, ${layerOpacity * 0.6})`);
        gradient.addColorStop(0.5, `rgba(${colors.glow.r}, ${colors.glow.g}, ${colors.glow.b}, ${layerOpacity})`);
        gradient.addColorStop(0.75, `rgba(${colors.secondary.r}, ${colors.secondary.g}, ${colors.secondary.b}, ${layerOpacity * 0.6})`);
        gradient.addColorStop(1, `rgba(${colors.primary.r}, ${colors.primary.g}, ${colors.primary.b}, ${layerOpacity * 0.3})`);

        const segments = 100;
        const points: { x: number; y: number }[] = [];
        
        for (let i = 0; i <= segments; i++) {
          const x = (i / segments) * width;
          const normalizedX = i / segments;
          
          // Multiple organic sine waves
          const wave1 = Math.sin(normalizedX * Math.PI * 2.5 + time * speed + layerOffset) * layerAmplitude * 0.5;
          const wave2 = Math.sin(normalizedX * Math.PI * 4 - time * (speed * 1.2) + layerOffset) * layerAmplitude * 0.3;
          const wave3 = Math.cos(normalizedX * Math.PI * 1.5 + time * (speed * 0.8) + layerOffset) * layerAmplitude * 0.25;
          const wave4 = Math.sin(normalizedX * Math.PI * 6 + time * (speed * 1.6)) * layerAmplitude * 0.1 * activeAmplitude;
          
          // Smooth curved envelope
          const envelope = Math.pow(Math.sin(normalizedX * Math.PI), 0.7);
          const y = centerY + (wave1 + wave2 + wave3 + wave4) * envelope;
          
          points.push({ x, y });
        }
        
        // Draw smooth bezier curve
        ctx.beginPath();
        ctx.moveTo(0, centerY);
        
        // Catmull-Rom to Bezier for maximum smoothness
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
        
        ctx.lineTo(width, centerY);
        
        // Create 3D depth with soft shadow fill
        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.closePath();
        
        // Soft glow
        ctx.shadowColor = `rgba(${colors.glow.r}, ${colors.glow.g}, ${colors.glow.b}, 0.35)`;
        ctx.shadowBlur = 20 * (1 - layer * 0.2);
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.shadowBlur = 0;
        
        // Bright stroke on top layer
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
          strokeGradient.addColorStop(0, `rgba(${colors.primary.r}, ${colors.primary.g}, ${colors.primary.b}, 0.15)`);
          strokeGradient.addColorStop(0.3, `rgba(${colors.glow.r}, ${colors.glow.g}, ${colors.glow.b}, 0.7)`);
          strokeGradient.addColorStop(0.5, `rgba(${colors.glow.r}, ${colors.glow.g}, ${colors.glow.b}, 0.95)`);
          strokeGradient.addColorStop(0.7, `rgba(${colors.glow.r}, ${colors.glow.g}, ${colors.glow.b}, 0.7)`);
          strokeGradient.addColorStop(1, `rgba(${colors.primary.r}, ${colors.primary.g}, ${colors.primary.b}, 0.15)`);
          
          ctx.strokeStyle = strokeGradient;
          ctx.lineWidth = 2;
          ctx.shadowColor = `rgba(${colors.glow.r}, ${colors.glow.g}, ${colors.glow.b}, 0.6)`;
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
      {/* Ambient glow under waveform */}
      <div 
        className={cn(
          "absolute inset-x-0 bottom-0 h-1/2 rounded-full blur-2xl transition-opacity duration-700",
          isActive ? "opacity-40" : "opacity-10"
        )}
        style={{
          background: "radial-gradient(ellipse 80% 100% at center bottom, rgba(0,224,200,0.2) 0%, transparent 70%)"
        }}
      />
      
      <canvas 
        ref={canvasRef}
        className="w-full h-full relative z-10"
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}
