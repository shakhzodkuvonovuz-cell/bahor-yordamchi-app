import { ModeInfo } from "@/types/chat";
import { Language } from "@/hooks/useLanguage";
import { getTranslation } from "@/data/translations";

interface ModeCardProps {
  mode: ModeInfo;
  language: Language;
  onClick: () => void;
}

export default function ModeCard({ mode, language, onClick }: ModeCardProps) {
  const t = getTranslation(language);
  const modeTranslation = t.modes[mode.id as keyof typeof t.modes];
  
  return (
    <button
      onClick={onClick}
      className="w-full p-4 bg-card dark:bg-card border border-border dark:border-border rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 text-left active:scale-95"
    >
      <div className="flex flex-col items-center text-center gap-2">
        <div className="text-4xl mb-1">{mode.icon}</div>
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-card-foreground dark:text-card-foreground leading-tight">
            {modeTranslation.title}
          </h3>
          <p className="text-xs text-muted-foreground dark:text-muted-foreground leading-relaxed line-clamp-2">
            {modeTranslation.subtitle}
          </p>
        </div>
      </div>
    </button>
  );
}
