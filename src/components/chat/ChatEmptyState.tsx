import { useTranslation } from "@/i18n/LanguageProvider";
import { ModeInfo } from "@/types/chat";
import StarterCards from "./StarterCards";

interface ChatEmptyStateProps {
  modeInfo: ModeInfo;
  modeTranslation?: { title: string; subtitle: string };
  onStarterSelect?: (prompt: string) => void;
}

export function ChatEmptyState({ modeInfo, modeTranslation, onStarterSelect }: ChatEmptyStateProps) {
  const { language } = useTranslation();

  const greeting = language === "uz" 
    ? "Assalomu alaykum 👋" 
    : language === "en" 
    ? "Hello 👋" 
    : language === "ru" 
    ? "Привет 👋" 
    : "Merhaba 👋";

  const hint = language === "uz" 
    ? "Savolingizni yozing yoki quyidagi tezkor takliflardan foydalaning" 
    : language === "en" 
    ? "Type your question or use quick suggestions below" 
    : language === "ru" 
    ? "Введите свой вопрос или используйте быстрые предложения ниже" 
    : "Sorunuzu yazın veya aşağıdaki hızlı önerileri kullanın";

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[50vh] gap-8">
      <div className="text-center max-w-md space-y-5 animate-fade-in px-4">
        <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-5xl glow-primary-subtle">
          {modeInfo.icon}
        </div>
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold text-foreground">{greeting}</h2>
          <p className="text-base text-primary/80 font-medium">
            {modeTranslation?.title || modeInfo.title}
          </p>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {modeTranslation?.subtitle || modeInfo.subtitle}
        </p>
        <p className="text-xs text-muted-foreground/70 pt-2">{hint}</p>
      </div>
      
      {/* Starter Cards */}
      {onStarterSelect && (
        <StarterCards onSelect={onStarterSelect} />
      )}
    </div>
  );
}
