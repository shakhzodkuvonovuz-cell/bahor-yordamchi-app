import { cn } from "@/lib/utils";

interface ThinkingOrbProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "rainbow" | "pulse";
}

export function ThinkingOrb({ 
  className, 
  size = "md",
  variant = "default" 
}: ThinkingOrbProps) {
  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-10 h-10",
    lg: "w-16 h-16",
  };

  return (
    <div className={cn("relative", sizeClasses[size], className)}>
      {/* Outer glow ring */}
      <div 
        className={cn(
          "absolute inset-0 rounded-full animate-thinking-glow",
          variant === "rainbow" && "animate-thinking-rainbow"
        )}
        style={{
          background: variant === "rainbow" 
            ? "conic-gradient(from 0deg, hsl(var(--primary)), hsl(280 100% 70%), hsl(var(--primary)))"
            : "radial-gradient(circle, hsl(var(--primary) / 0.6) 0%, transparent 70%)",
          filter: "blur(8px)",
        }}
      />
      
      {/* Middle spinning ring */}
      <div 
        className="absolute inset-1 rounded-full animate-thinking-spin"
        style={{
          background: "conic-gradient(from 0deg, transparent, hsl(var(--primary) / 0.8), transparent)",
        }}
      />
      
      {/* Inner core orb */}
      <div 
        className={cn(
          "absolute inset-2 rounded-full animate-thinking-pulse",
          "bg-gradient-to-br from-primary/90 via-primary to-primary/70",
          "shadow-[0_0_20px_hsl(var(--primary)/0.5)]"
        )}
      >
        {/* Highlight */}
        <div 
          className="absolute top-1 left-1 w-1/3 h-1/3 rounded-full bg-white/40 blur-[2px]"
        />
      </div>
      
      {/* Orbiting particles */}
      <div className="absolute inset-0 animate-thinking-orbit">
        <div 
          className="absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-primary/80 shadow-[0_0_6px_hsl(var(--primary))]"
        />
      </div>
      <div className="absolute inset-0 animate-thinking-orbit-reverse">
        <div 
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary/60 shadow-[0_0_4px_hsl(var(--primary))]"
        />
      </div>
    </div>
  );
}
