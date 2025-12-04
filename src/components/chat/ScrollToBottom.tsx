import { ChevronDown } from "lucide-react";
import { useTranslation } from "@/i18n/LanguageProvider";

interface ScrollToBottomProps {
  visible: boolean;
  onClick: () => void;
}

export function ScrollToBottom({ visible, onClick }: ScrollToBottomProps) {
  const { language } = useTranslation();

  if (!visible) return null;

  const label = language === "uz" ? "Pastga" : language === "en" ? "Bottom" : language === "ru" ? "Вниз" : "Aşağı";

  return (
    <button
      onClick={onClick}
      className="fixed bottom-28 right-6 z-40 flex items-center gap-1.5 px-3 py-2 bg-card/95 backdrop-blur-sm border border-border/40 rounded-full shadow-lg hover:bg-card hover:shadow-xl transition-all duration-200 animate-fade-in group active:scale-95"
      aria-label={label}
    >
      <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
      <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors hidden sm:inline">
        {label}
      </span>
    </button>
  );
}
