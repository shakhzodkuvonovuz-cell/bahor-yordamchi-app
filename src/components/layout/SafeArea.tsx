// SafeArea wrapper for iOS notch and home indicator
// Provides consistent spacing across all pages

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SafeAreaProps {
  children: ReactNode;
  className?: string;
  /** Apply top safe area padding (for notch) */
  top?: boolean;
  /** Apply bottom safe area padding (for home indicator) */
  bottom?: boolean;
  /** Apply both top and bottom */
  all?: boolean;
}

export function SafeArea({ 
  children, 
  className,
  top = false,
  bottom = false,
  all = false,
}: SafeAreaProps) {
  return (
    <div
      className={cn(
        (all || top) && "pt-[env(safe-area-inset-top)]",
        (all || bottom) && "pb-[env(safe-area-inset-bottom)]",
        className
      )}
    >
      {children}
    </div>
  );
}

// Convenience components for common patterns
export function SafeAreaTop({ children, className }: { children: ReactNode; className?: string }) {
  return <SafeArea top className={className}>{children}</SafeArea>;
}

export function SafeAreaBottom({ children, className }: { children: ReactNode; className?: string }) {
  return <SafeArea bottom className={className}>{children}</SafeArea>;
}

export function SafeAreaAll({ children, className }: { children: ReactNode; className?: string }) {
  return <SafeArea all className={className}>{children}</SafeArea>;
}
