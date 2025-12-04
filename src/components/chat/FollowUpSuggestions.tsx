import { useTranslation } from "@/i18n/LanguageProvider";

interface FollowUpSuggestionsProps {
  onSelect: (suggestion: string) => void;
  disabled?: boolean;
  mode?: string;
}

const suggestionsByLanguage = {
  uz: [
    "Qisqaroq qilib ber",
    "Misol bilan tushuntir",
    "Reja tuzib ber",
    "Batafsilroq ayt",
  ],
  en: [
    "Make it shorter",
    "Explain with an example",
    "Create a plan",
    "Give more details",
  ],
  ru: [
    "Сделай короче",
    "Объясни на примере",
    "Составь план",
    "Расскажи подробнее",
  ],
  tr: [
    "Daha kısa yap",
    "Örnekle açıkla",
    "Bir plan yap",
    "Daha fazla detay ver",
  ],
};

export function FollowUpSuggestions({ onSelect, disabled, mode }: FollowUpSuggestionsProps) {
  const { language } = useTranslation();

  // Get mode-specific suggestions or defaults
  const getSuggestions = () => {
    const defaultSuggestions = suggestionsByLanguage[language as keyof typeof suggestionsByLanguage] || suggestionsByLanguage.en;
    
    // Mode-specific follow-up suggestions
    if (mode === "ielts" || mode === "english") {
      if (language === "uz") {
        return ["Band 7+ darajada yozib ber", "Grammatikasini tuzat", "Boshqa so'zlar bilan ayt"];
      }
      if (language === "en") {
        return ["Rewrite at Band 7+ level", "Fix grammar", "Rephrase differently"];
      }
    }
    
    if (mode === "tech" || mode === "technology") {
      if (language === "uz") {
        return ["Kodni optimallashtir", "Xatoni tushuntir", "Test yoz"];
      }
      if (language === "en") {
        return ["Optimize the code", "Explain the error", "Write tests"];
      }
    }

    return defaultSuggestions.slice(0, 3);
  };

  const suggestions = getSuggestions();

  return (
    <div className="flex flex-wrap gap-2 mt-3 animate-fade-in">
      {suggestions.map((suggestion, index) => (
        <button
          key={index}
          onClick={() => onSelect(suggestion)}
          disabled={disabled}
          className="px-3 py-1.5 text-xs font-medium bg-secondary/60 hover:bg-secondary border border-border/30 rounded-full text-muted-foreground hover:text-foreground transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
          style={{ animationDelay: `${index * 50}ms` }}
        >
          {suggestion}
        </button>
      ))}
    </div>
  );
}
