import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface LiquidWaveformProps {
  isActive: boolean;
  amplitude?: number;
  className?: string;
}

export default function LiquidWaveform({ isActive, amplitude = 0.5, className }: LiquidWaveformProps) {
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

    // Bahor AI turquoise
    const teal = { r: 0, g: 199, b: 177 };

    const animate = () => {
      if (!ctx || !canvas) return;
      
      ctx.clearRect(0, 0, width, height);
      
      const activeAmplitude = isActive ? Math.max(0.3, amplitude) : 0.1;
      const waveHeight = height * 0.35 * activeAmplitude;

      // Draw multiple liquid wave layers
      for (let layer = 2; layer >= 0; layer--) {
        const layerAlpha = 0.15 + (1 - layer / 3) * 0.5;
        const layerOffset = layer * 0.5;
        const layerHeight = waveHeight * (1 - layer * 0.2);

        // Create gradient for this layer
        const gradient = ctx.createLinearGradient(0, centerY - layerHeight, width, centerY + layerHeight);
        gradient.addColorStop(0, `rgba(${teal.r}, ${teal.g}, ${teal.b}, 0)`);
        gradient.addColorStop(0.2, `rgba(${teal.r}, ${teal.g}, ${teal.b}, ${layerAlpha * 0.5})`);
        gradient.addColorStop(0.5, `rgba(${teal.r}, ${teal.g}, ${teal.b}, ${layerAlpha})`);
        gradient.addColorStop(0.8, `rgba(${teal.r}, ${teal.g}, ${teal.b}, ${layerAlpha * 0.5})`);
        gradient.addColorStop(1, `rgba(${teal.r}, ${teal.g}, ${teal.b}, 0)`);

        // Calculate smooth bezier wave points
        const points: { x: number; y: number }[] = [];
        const segments = 60;
        
        for (let i = 0; i <= segments; i++) {
          const x = (i / segments) * width;
          const normalizedX = i / segments;
          
          // Smooth organic wave using multiple sine functions
          const wave1 = Math.sin(normalizedX * Math.PI * 2 + time * 0.04 + layerOffset) * layerHeight * 0.6;
          const wave2 = Math.sin(normalizedX * Math.PI * 3.5 - time * 0.05 + layerOffset) * layerHeight * 0.3;
          const wave3 = Math.cos(normalizedX * Math.PI * 1.5 + time * 0.03) * layerHeight * 0.15;
          
          // Smooth envelope that fades edges
          const envelope = Math.pow(Math.sin(normalizedX * Math.PI), 0.6);
          const y = centerY + (wave1 + wave2 + wave3) * envelope;
          
          points.push({ x, y });
        }

        // Draw smooth bezier curve through points
        ctx.beginPath();
        ctx.moveTo(points[0].x, centerY);
        ctx.lineTo(points[0].x, points[0].y);
        
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
        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.closePath();
        
        // Fill with gradient
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // Glowing stroke on top layer
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
          strokeGradient.addColorStop(0, `rgba(${teal.r}, ${teal.g}, ${teal.b}, 0)`);
          strokeGradient.addColorStop(0.3, `rgba(${teal.r}, ${teal.g}, ${teal.b}, 0.8)`);
          strokeGradient.addColorStop(0.5, `rgba(${teal.r}, ${teal.g}, ${teal.b}, 1)`);
          strokeGradient.addColorStop(0.7, `rgba(${teal.r}, ${teal.g}, ${teal.b}, 0.8)`);
          strokeGradient.addColorStop(1, `rgba(${teal.r}, ${teal.g}, ${teal.b}, 0)`);
          
          ctx.strokeStyle = strokeGradient;
          ctx.lineWidth = 2;
          ctx.shadowColor = `rgba(${teal.r}, ${teal.g}, ${teal.b}, 0.6)`;
          ctx.shadowBlur = 10;
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
  }, [isActive, amplitude]);

  return (
    <div className={cn("relative", className)}>
      <canvas 
        ref={canvasRef}
        className="w-full h-full"
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}
