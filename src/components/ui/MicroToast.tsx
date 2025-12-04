import { cn } from "@/lib/utils";

interface MicroToastProps {
  message: string | null;
  variant?: "success" | "error" | "info";
  visible: boolean;
}

export function MicroToast({ message, variant = "success", visible }: MicroToastProps) {
  if (!message) return null;

  return (
    <div className="min-h-[28px] flex items-center justify-center mb-2">
      <div
        className={cn(
          "px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ease-out",
          "border shadow-sm",
          visible 
            ? "opacity-100 translate-y-0" 
            : "opacity-0 -translate-y-1.5 pointer-events-none",
          variant === "success" && "bg-primary/10 text-primary border-primary/20",
          variant === "error" && "bg-destructive/10 text-destructive border-destructive/20",
          variant === "info" && "bg-muted text-muted-foreground border-border"
        )}
      >
        {message}
      </div>
    </div>
  );
}
