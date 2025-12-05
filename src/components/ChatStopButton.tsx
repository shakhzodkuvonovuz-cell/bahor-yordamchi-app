import { Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n/LanguageProvider";

interface ChatStopButtonProps {
  onStop: () => void;
  isVisible: boolean;
}

export default function ChatStopButton({ onStop, isVisible }: ChatStopButtonProps) {
  const { language } = useTranslation();

  if (!isVisible) return null;

  const label = language === "uz" ? "To'xtatish" : language === "ru" ? "Остановить" : "Stop";

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onStop}
      className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 bg-card/95 backdrop-blur-sm border-border/60 shadow-lg animate-fade-in"
    >
      <Square className="w-3 h-3 mr-2 fill-current" />
      {label}
    </Button>
  );
}
