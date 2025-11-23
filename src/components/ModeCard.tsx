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
      className="w-full rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow p-3 md:p-4 lg:p-5 flex flex-col gap-2 md:gap-3 text-left active:scale-95"
    >
      <div className="flex flex-col items-center text-center gap-2">
        <div className="w-11 h-11 md:w-14 md:h-14 lg:w-16 lg:h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-2xl md:text-3xl lg:text-4xl shadow-sm">
          {mode.icon}
        </div>
        <div className="space-y-1">
          <h3 className="text-base md:text-lg lg:text-xl font-semibold text-slate-900 dark:text-slate-100 leading-tight">
            {modeTranslation.title}
          </h3>
          <p className="text-xs md:text-sm lg:text-base text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
            {modeTranslation.subtitle}
          </p>
        </div>
      </div>
    </button>
  );
}
