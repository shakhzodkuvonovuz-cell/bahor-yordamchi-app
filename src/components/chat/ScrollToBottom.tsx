import { ChevronDown } from "lucide-react";

interface ScrollToBottomProps {
  visible: boolean;
  onClick: () => void;
}

export function ScrollToBottom({ visible, onClick }: ScrollToBottomProps) {
  if (!visible) return null;

  return (
    <button
      onClick={onClick}
      className="absolute bottom-36 sm:bottom-32 right-4 sm:right-6 z-30 w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center bg-card/90 backdrop-blur-sm border border-border/40 rounded-full shadow-md hover:bg-card hover:shadow-lg transition-all duration-200 animate-fade-in active:scale-95 touch-manipulation"
      aria-label="Scroll to bottom"
    >
      <ChevronDown className="w-5 h-5 text-muted-foreground" />
    </button>
  );
}
