import { ModeInfo } from "@/types/chat";
import { Language } from "@/hooks/useLanguage";
import { getTranslation } from "@/data/translations";
import RecommendedBadge, { incrementModeUsage } from "@/components/RecommendedBadge";

interface ModeCardProps {
  mode: ModeInfo;
  language: Language;
  onClick: () => void;
}

export default function ModeCard({ mode, language, onClick }: ModeCardProps) {
  const t = getTranslation(language);
  const modeTranslation = t.modes[mode.id as keyof typeof t.modes];
  
  const handleClick = () => {
    incrementModeUsage(mode.id);
    onClick();
  };
  
  return (
    <button
      onClick={handleClick}
      className="w-full rounded-2xl bg-card border border-border/50 shadow-premium-sm hover:shadow-premium-md hover:border-primary/30 hover:-translate-y-0.5 transition-all duration-200 p-4 flex flex-col gap-3 text-left active:scale-[0.98]"
    >
      <div className="flex flex-col items-center text-center gap-2.5">
        <div className="w-11 h-11 rounded-xl bg-secondary flex items-center justify-center text-2xl">
          {mode.icon}
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-center gap-1.5 flex-wrap">
            <h3 className="text-sm font-semibold text-foreground leading-tight">
              {modeTranslation.title}
            </h3>
            <RecommendedBadge modeId={mode.id} />
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
            {modeTranslation.subtitle}
          </p>
        </div>
      </div>
    </button>
  );
}
