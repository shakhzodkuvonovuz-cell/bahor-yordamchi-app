import { useState, useEffect, useCallback } from "react";
import { MessageCircle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useTranslation } from "@/i18n/LanguageProvider";
import { toast } from "@/hooks/use-toast";

const PREFERENCES_KEY = "bahorai_user_preferences";

export interface UserPreferences {
  tone: "friendly" | "formal" | "concise";
}

const defaultPreferences: UserPreferences = {
  tone: "friendly",
};

export function getUserPreferences(): UserPreferences {
  try {
    const saved = localStorage.getItem(PREFERENCES_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { tone: parsed.tone || defaultPreferences.tone };
    }
  } catch (e) {
    console.error("Failed to load user preferences:", e);
  }
  return defaultPreferences;
}

export function getPreferencesPromptContext(): string {
  const prefs = getUserPreferences();
  
  if (prefs.tone === "friendly") {
    return "Do'stona va samimiy uslubda javob ber.";
  } else if (prefs.tone === "formal") {
    return "Rasmiy va professional uslubda javob ber.";
  } else if (prefs.tone === "concise") {
    return "Qisqa va aniq javob ber, ortiqcha tafsilotlarsiz.";
  }
  
  return "";
}

export default function UserPreferencesSection() {
  const { t } = useTranslation();
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);

  useEffect(() => {
    setPreferences(getUserPreferences());
  }, []);

  const handleToneChange = useCallback((tone: UserPreferences["tone"]) => {
    const newPrefs = { tone };
    setPreferences(newPrefs);
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(newPrefs));
    toast({ description: t('settings.preferencesSaved') });
  }, [t]);

  return (
    <section className="bg-card border border-border/40 rounded-2xl overflow-hidden shadow-premium-sm w-full">
      <header className="px-4 py-3 border-b border-border/40">
        <h2 className="text-[15px] font-semibold text-foreground">{t('settings.personalPreferences')}</h2>
      </header>
      
      <div className="p-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-muted-foreground" />
            <Label className="text-sm font-medium">{t('settings.responseTone')}</Label>
          </div>
          <RadioGroup 
            value={preferences.tone} 
            onValueChange={(v) => handleToneChange(v as UserPreferences["tone"])}
            className="flex flex-wrap gap-2"
          >
            <div className="flex items-center">
              <RadioGroupItem value="friendly" id="tone-friendly" className="sr-only peer" />
              <Label 
                htmlFor="tone-friendly" 
                className="px-3 py-1.5 rounded-lg text-sm cursor-pointer border border-border/60 peer-data-[state=checked]:bg-primary peer-data-[state=checked]:text-primary-foreground peer-data-[state=checked]:border-primary transition-colors"
              >
                {t('settings.toneFriendly')}
              </Label>
            </div>
            <div className="flex items-center">
              <RadioGroupItem value="formal" id="tone-formal" className="sr-only peer" />
              <Label 
                htmlFor="tone-formal" 
                className="px-3 py-1.5 rounded-lg text-sm cursor-pointer border border-border/60 peer-data-[state=checked]:bg-primary peer-data-[state=checked]:text-primary-foreground peer-data-[state=checked]:border-primary transition-colors"
              >
                {t('settings.toneFormal')}
              </Label>
            </div>
            <div className="flex items-center">
              <RadioGroupItem value="concise" id="tone-concise" className="sr-only peer" />
              <Label 
                htmlFor="tone-concise" 
                className="px-3 py-1.5 rounded-lg text-sm cursor-pointer border border-border/60 peer-data-[state=checked]:bg-primary peer-data-[state=checked]:text-primary-foreground peer-data-[state=checked]:border-primary transition-colors"
              >
                {t('settings.toneConcise')}
              </Label>
            </div>
          </RadioGroup>
        </div>
      </div>
    </section>
  );
}
