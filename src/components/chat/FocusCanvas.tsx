import { ReactNode, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface FocusCanvasProps {
  children: ReactNode;
  className?: string;
}

/**
 * Focus Canvas - The main chat area that floats above the background
 * with a subtle paper/glass feel for a premium experience.
 */
export const FocusCanvas = forwardRef<HTMLDivElement, FocusCanvasProps>(
  ({ children, className }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex-1 flex flex-col min-w-0",
          // Canvas styling - visible elevation and glass effect
          "bg-gradient-to-b from-card/50 via-card/40 to-card/50",
          "lg:mx-4 lg:my-2 lg:rounded-2xl",
          "lg:border lg:border-border/30",
          "lg:shadow-xl lg:shadow-black/5",
          "lg:backdrop-blur-sm",
          className
        )}
      >
        {children}
      </div>
    );
  }
);

FocusCanvas.displayName = "FocusCanvas";

/**
 * Message area wrapper that constrains text width for readability
 * while allowing the canvas to be wide.
 */
export function MessageArea({ 
  children, 
  className 
}: { 
  children: ReactNode; 
  className?: string;
}) {
  return (
    <div className={cn(
      "w-full mx-auto",
      // Readable line width - optimal for text content
      "max-w-3xl",
      className
    )}>
      {children}
    </div>
  );
}
