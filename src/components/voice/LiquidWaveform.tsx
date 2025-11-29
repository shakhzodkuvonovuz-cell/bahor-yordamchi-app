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

    // Bahor AI turquoise gradient colors
    const tealStart = { r: 0, g: 199, b: 177 };
    const tealEnd = { r: 0, g: 230, b: 210 };

    const animate = () => {
      if (!ctx || !canvas) return;
      
      ctx.clearRect(0, 0, width, height);
      
      const activeAmplitude = isActive ? Math.max(0.3, amplitude) : 0.1;
      const waveHeight = height * 0.35 * activeAmplitude;

      // Draw multiple wave layers for depth
      for (let layer = 0; layer < 3; layer++) {
        const layerAlpha = (3 - layer) / 4;
        const layerOffset = layer * 0.3;
        const layerSpeed = 1 - layer * 0.15;
        
        const points: { x: number; y: number }[] = [];
        const segments = 100;
        
        for (let i = 0; i <= segments; i++) {
          const x = (i / segments) * width;
          const normalizedX = i / segments;
          
          // Complex organic wave with multiple harmonics
          const wave1 = Math.sin(normalizedX * Math.PI * 3 + time * 0.04 * layerSpeed) * waveHeight * 0.6;
          const wave2 = Math.sin(normalizedX * Math.PI * 5 - time * 0.055 * layerSpeed + layerOffset) * waveHeight * 0.25;
          const wave3 = Math.cos(normalizedX * Math.PI * 1.5 + time * 0.03 * layerSpeed) * waveHeight * 0.15;
          const wave4 = Math.sin(normalizedX * Math.PI * 7 + time * 0.07 * layerSpeed) * waveHeight * 0.08;
          
          // Smooth envelope with 3D-like bulge in center
          const envelope = Math.pow(Math.sin(normalizedX * Math.PI), 0.4);
          const centerBulge = 1 + Math.pow(Math.sin(normalizedX * Math.PI), 2) * 0.3;
          const y = centerY + (wave1 + wave2 + wave3 + wave4) * envelope * centerBulge;
          
          points.push({ x, y });
        }

        // Draw smooth bezier curve
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
        
        // Create gradient stroke
        const strokeGradient = ctx.createLinearGradient(0, 0, width, 0);
        strokeGradient.addColorStop(0, `rgba(${tealStart.r}, ${tealStart.g}, ${tealStart.b}, 0)`);
        strokeGradient.addColorStop(0.1, `rgba(${tealStart.r}, ${tealStart.g}, ${tealStart.b}, ${0.3 * layerAlpha})`);
        strokeGradient.addColorStop(0.5, `rgba(${tealEnd.r}, ${tealEnd.g}, ${tealEnd.b}, ${0.85 * layerAlpha})`);
        strokeGradient.addColorStop(0.9, `rgba(${tealStart.r}, ${tealStart.g}, ${tealStart.b}, ${0.3 * layerAlpha})`);
        strokeGradient.addColorStop(1, `rgba(${tealStart.r}, ${tealStart.g}, ${tealStart.b}, 0)`);
        
        // Glow effect (outer layer only)
        if (layer === 0) {
          ctx.shadowColor = `rgba(${tealEnd.r}, ${tealEnd.g}, ${tealEnd.b}, 0.5)`;
          ctx.shadowBlur = 12;
        } else {
          ctx.shadowBlur = 0;
        }
        
        ctx.strokeStyle = strokeGradient;
        ctx.lineWidth = layer === 0 ? 2.5 : layer === 1 ? 1.5 : 1;
        ctx.lineCap = "round";
        ctx.stroke();
      }

      // Add subtle glow dots at peaks
      if (isActive && amplitude > 0.4) {
        const dotCount = 5;
        for (let i = 0; i < dotCount; i++) {
          const x = width * (0.2 + (i / dotCount) * 0.6);
          const normalizedX = x / width;
          const wave = Math.sin(normalizedX * Math.PI * 3 + time * 0.04) * waveHeight * 0.6;
          const envelope = Math.pow(Math.sin(normalizedX * Math.PI), 0.4);
          const y = centerY + wave * envelope;
          
          const dotGradient = ctx.createRadialGradient(x, y, 0, x, y, 4);
          dotGradient.addColorStop(0, `rgba(${tealEnd.r}, ${tealEnd.g}, ${tealEnd.b}, ${0.6 * amplitude})`);
          dotGradient.addColorStop(1, `rgba(${tealEnd.r}, ${tealEnd.g}, ${tealEnd.b}, 0)`);
          
          ctx.beginPath();
          ctx.arc(x, y, 4, 0, Math.PI * 2);
          ctx.fillStyle = dotGradient;
          ctx.fill();
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
      {/* Ambient glow behind waveform */}
      <div 
        className="absolute inset-0 rounded-full blur-2xl opacity-30"
        style={{
          background: "radial-gradient(ellipse 80% 50% at center, rgba(0,199,177,0.3) 0%, transparent 70%)"
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
