import { useState, useEffect } from "react";
import { User, Briefcase, GraduationCap, MessageCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useTranslation } from "@/i18n/LanguageProvider";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const PREFERENCES_KEY = "bahorai_user_preferences";

export interface UserPreferences {
  tone: "friendly" | "formal" | "concise";
  ieltsLevel: string;
  profession: string;
}

const defaultPreferences: UserPreferences = {
  tone: "friendly",
  ieltsLevel: "",
  profession: "",
};

export function getUserPreferences(): UserPreferences {
  try {
    const saved = localStorage.getItem(PREFERENCES_KEY);
    if (saved) {
      return { ...defaultPreferences, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error("Failed to load user preferences:", e);
  }
  return defaultPreferences;
}

export function getPreferencesPromptContext(): string {
  const prefs = getUserPreferences();
  const parts: string[] = [];
  
  if (prefs.tone === "friendly") {
    parts.push("Do'stona va samimiy uslubda javob ber.");
  } else if (prefs.tone === "formal") {
    parts.push("Rasmiy va professional uslubda javob ber.");
  } else if (prefs.tone === "concise") {
    parts.push("Qisqa va aniq javob ber, ortiqcha tafsilotlarsiz.");
  }
  
  if (prefs.ieltsLevel) {
    parts.push(`Foydalanuvchining IELTS darajasi: ${prefs.ieltsLevel}.`);
  }
  
  if (prefs.profession) {
    parts.push(`Foydalanuvchining kasbi: ${prefs.profession}.`);
  }
  
  return parts.length > 0 ? parts.join(" ") : "";
}

export default function UserPreferencesSection() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setPreferences(getUserPreferences());
  }, []);

  const savePreferences = async (newPrefs: UserPreferences) => {
    setPreferences(newPrefs);
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(newPrefs));
    
    // If logged in, also save to profile metadata
    if (user) {
      setSaving(true);
      try {
        const { error } = await supabase
          .from("profiles")
          .update({ 
            updated_at: new Date().toISOString()
          })
          .eq("user_id", user.id);
        
        if (error) throw error;
      } catch (e) {
        console.error("Failed to sync preferences:", e);
      } finally {
        setSaving(false);
      }
    }
    
    toast({ description: t('settings.preferencesSaved') });
  };

  const handleToneChange = (tone: UserPreferences["tone"]) => {
    savePreferences({ ...preferences, tone });
  };

  const handleFieldChange = (field: keyof UserPreferences, value: string) => {
    savePreferences({ ...preferences, [field]: value });
  };

  return (
    <section className="bg-card border border-border/40 rounded-2xl overflow-hidden shadow-premium-sm w-full">
      <header className="px-4 py-3 border-b border-border/40">
        <h2 className="text-[15px] font-semibold text-foreground">{t('settings.personalPreferences')}</h2>
      </header>
      
      <div className="p-4 space-y-5">
        {/* Tone Selection */}
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

        {/* IELTS Level */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-muted-foreground" />
            <Label htmlFor="ielts-level" className="text-sm font-medium">{t('settings.ieltsLevel')}</Label>
          </div>
          <Input
            id="ielts-level"
            placeholder={t('settings.ieltsLevelPlaceholder')}
            value={preferences.ieltsLevel}
            onChange={(e) => handleFieldChange("ieltsLevel", e.target.value)}
            className="h-10"
          />
        </div>

        {/* Profession */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-muted-foreground" />
            <Label htmlFor="profession" className="text-sm font-medium">{t('settings.profession')}</Label>
          </div>
          <Input
            id="profession"
            placeholder={t('settings.professionPlaceholder')}
            value={preferences.profession}
            onChange={(e) => handleFieldChange("profession", e.target.value)}
            className="h-10"
          />
        </div>
      </div>
    </section>
  );
}
