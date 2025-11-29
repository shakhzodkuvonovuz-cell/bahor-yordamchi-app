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
            primary: { r: 0, g: 212, b: 180 },
            secondary: { r: 0, g: 180, b: 220 },
            glow: { r: 0, g: 229, b: 193 },
          };
        case "speaking":
          return {
            primary: { r: 0, g: 220, b: 120 },
            secondary: { r: 0, g: 212, b: 180 },
            glow: { r: 100, g: 255, b: 150 },
          };
        default:
          return {
            primary: { r: 0, g: 180, b: 160 },
            secondary: { r: 0, g: 160, b: 180 },
            glow: { r: 0, g: 200, b: 180 },
          };
      }
    };

    const animate = () => {
      if (!ctx || !canvas) return;
      
      ctx.clearRect(0, 0, width, height);
      const colors = getStateColors();
      const activeAmplitude = isActive ? amplitude : 0.12;

      const layers = 5;
      
      for (let layer = layers - 1; layer >= 0; layer--) {
        const layerOffset = layer * 0.3;
        const layerOpacity = 0.15 + (1 - layer / layers) * 0.55;
        const layerAmplitude = (height * 0.35 * activeAmplitude) * (1 - layer * 0.12);
        
        const gradient = ctx.createLinearGradient(0, centerY - layerAmplitude, width, centerY + layerAmplitude);
        const c1 = colors.primary;
        const c2 = colors.secondary;
        const cg = colors.glow;
        
        gradient.addColorStop(0, `rgba(${c1.r}, ${c1.g}, ${c1.b}, ${layerOpacity * 0.4})`);
        gradient.addColorStop(0.3, `rgba(${c2.r}, ${c2.g}, ${c2.b}, ${layerOpacity * 0.7})`);
        gradient.addColorStop(0.5, `rgba(${cg.r}, ${cg.g}, ${cg.b}, ${layerOpacity})`);
        gradient.addColorStop(0.7, `rgba(${c2.r}, ${c2.g}, ${c2.b}, ${layerOpacity * 0.7})`);
        gradient.addColorStop(1, `rgba(${c1.r}, ${c1.g}, ${c1.b}, ${layerOpacity * 0.4})`);

        const segments = 120;
        const points: { x: number; y: number }[] = [];
        
        for (let i = 0; i <= segments; i++) {
          const x = (i / segments) * width;
          const normalizedX = i / segments;
          
          const speed = state === "speaking" ? 0.04 : 0.025;
          const wave1 = Math.sin(normalizedX * Math.PI * 3 + time * speed + layerOffset) * layerAmplitude * 0.5;
          const wave2 = Math.sin(normalizedX * Math.PI * 5 - time * (speed * 1.3) + layerOffset) * layerAmplitude * 0.3;
          const wave3 = Math.sin(normalizedX * Math.PI * 2 + time * (speed * 0.7) + layerOffset) * layerAmplitude * 0.25;
          const wave4 = Math.cos(normalizedX * Math.PI * 7 + time * (speed * 1.5)) * layerAmplitude * 0.12 * activeAmplitude;
          
          const envelope = Math.pow(Math.sin(normalizedX * Math.PI), 0.8);
          const y = centerY + (wave1 + wave2 + wave3 + wave4) * envelope;
          
          points.push({ x, y });
        }
        
        ctx.beginPath();
        ctx.moveTo(points[0].x, centerY);
        ctx.quadraticCurveTo(points[0].x, points[0].y, points[1].x, points[1].y);
        
        for (let i = 1; i < points.length - 2; i++) {
          const p0 = points[i - 1];
          const p1 = points[i];
          const p2 = points[i + 1];
          const p3 = points[Math.min(points.length - 1, i + 2)];
          
          const cp1x = p1.x + (p2.x - p0.x) / 6;
          const cp1y = p1.y + (p2.y - p0.y) / 6;
          const cp2x = p2.x - (p3.x - p1.x) / 6;
          const cp2y = p2.y - (p3.y - p1.y) / 6;
          
          ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
        }
        
        const lastPoint = points[points.length - 1];
        ctx.quadraticCurveTo(lastPoint.x, lastPoint.y, lastPoint.x, centerY);
        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.closePath();
        
        ctx.shadowColor = `rgba(${cg.r}, ${cg.g}, ${cg.b}, 0.4)`;
        ctx.shadowBlur = 25 * (1 - layer * 0.15);
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.shadowBlur = 0;
        
        if (layer === 0) {
          ctx.beginPath();
          ctx.moveTo(points[0].x, points[0].y);
          
          for (let i = 1; i < points.length - 2; i++) {
            const p0 = points[i - 1];
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
          strokeGradient.addColorStop(0, `rgba(${c1.r}, ${c1.g}, ${c1.b}, 0.2)`);
          strokeGradient.addColorStop(0.3, `rgba(${cg.r}, ${cg.g}, ${cg.b}, 0.8)`);
          strokeGradient.addColorStop(0.5, `rgba(${cg.r}, ${cg.g}, ${cg.b}, 1)`);
          strokeGradient.addColorStop(0.7, `rgba(${cg.r}, ${cg.g}, ${cg.b}, 0.8)`);
          strokeGradient.addColorStop(1, `rgba(${c1.r}, ${c1.g}, ${c1.b}, 0.2)`);
          
          ctx.strokeStyle = strokeGradient;
          ctx.lineWidth = 2.5;
          ctx.shadowColor = `rgba(${cg.r}, ${cg.g}, ${cg.b}, 0.7)`;
          ctx.shadowBlur = 20;
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      }

      const reflectionGradient = ctx.createLinearGradient(0, centerY + 20, 0, height);
      reflectionGradient.addColorStop(0, `rgba(${colors.glow.r}, ${colors.glow.g}, ${colors.glow.b}, 0.08)`);
      reflectionGradient.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = reflectionGradient;
      ctx.fillRect(0, centerY + 20, width, height - centerY - 20);

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
      <div 
        className={cn(
          "absolute inset-0 rounded-full blur-3xl transition-opacity duration-700",
          isActive ? "opacity-50" : "opacity-15"
        )}
        style={{
          background: `radial-gradient(ellipse 100% 80% at center, 
            ${state === "listening" ? "rgba(0,212,180,0.25)" : state === "speaking" ? "rgba(100,255,150,0.25)" : "rgba(0,180,220,0.25)"} 0%, 
            transparent 70%)`
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
