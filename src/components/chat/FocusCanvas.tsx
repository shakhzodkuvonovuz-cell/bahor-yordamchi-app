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
          // Canvas styling - subtle elevation
          "bg-gradient-to-b from-card/30 via-card/20 to-card/30",
          "lg:border-x lg:border-border/10",
          "lg:shadow-[inset_0_0_60px_rgba(0,0,0,0.02)]",
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
