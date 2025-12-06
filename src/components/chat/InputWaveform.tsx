import { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface InputWaveformProps {
  active: boolean;
  amplitude?: number;
  className?: string;
}

export function InputWaveform({ active, amplitude = 0.5, className }: InputWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const phaseRef = useRef(0);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const animate = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      
      // Set canvas size
      if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
      }

      ctx.clearRect(0, 0, rect.width, rect.height);

      if (!active) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      phaseRef.current += 0.06;
      const phase = phaseRef.current;
      const height = rect.height;
      const width = rect.width;
      const centerY = height / 2;

      // Create gradient from primary color
      const gradient = ctx.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, "rgba(0, 199, 177, 0)");
      gradient.addColorStop(0.15, "rgba(0, 199, 177, 0.3)");
      gradient.addColorStop(0.3, "rgba(0, 199, 177, 0.5)");
      gradient.addColorStop(0.5, "rgba(0, 199, 177, 0.7)");
      gradient.addColorStop(0.7, "rgba(0, 199, 177, 0.5)");
      gradient.addColorStop(0.85, "rgba(0, 199, 177, 0.3)");
      gradient.addColorStop(1, "rgba(0, 199, 177, 0)");

      // Glow layer (blurred)
      ctx.save();
      ctx.filter = "blur(4px)";
      ctx.beginPath();
      ctx.moveTo(0, centerY);

      for (let x = 0; x <= width; x += 2) {
        const normalizedX = x / width;
        // Multi-frequency wave for organic look
        const wave1 = Math.sin(normalizedX * Math.PI * 4 + phase) * Math.sin(normalizedX * Math.PI);
        const wave2 = Math.sin(normalizedX * Math.PI * 6 + phase * 1.5) * 0.5;
        const wave3 = Math.sin(normalizedX * Math.PI * 2 + phase * 0.7) * 0.3;
        const combined = (wave1 + wave2 + wave3) * (amplitude * 10 + 3);
        ctx.lineTo(x, centerY + combined);
      }

      ctx.strokeStyle = "rgba(0, 199, 177, 0.25)";
      ctx.lineWidth = 8;
      ctx.lineCap = "round";
      ctx.stroke();
      ctx.restore();

      // Main wave line
      ctx.beginPath();
      ctx.moveTo(0, centerY);

      for (let x = 0; x <= width; x += 2) {
        const normalizedX = x / width;
        const wave1 = Math.sin(normalizedX * Math.PI * 4 + phase) * Math.sin(normalizedX * Math.PI);
        const wave2 = Math.sin(normalizedX * Math.PI * 6 + phase * 1.5) * 0.5;
        const wave3 = Math.sin(normalizedX * Math.PI * 2 + phase * 0.7) * 0.3;
        const combined = (wave1 + wave2 + wave3) * (amplitude * 10 + 3);
        ctx.lineTo(x, centerY + combined);
      }

      ctx.strokeStyle = gradient;
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.stroke();

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [active, amplitude]);

  if (!active) return null;

  return (
    <div
      className={cn(
        "absolute inset-0 pointer-events-none z-10 flex items-center justify-center",
        className
      )}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}

export default InputWaveform;
