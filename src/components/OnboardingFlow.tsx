import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageSquare, Image, GraduationCap, Check, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n/LanguageProvider";
import bahorLogo from "@/assets/bahor-logo.png";

const ONBOARDING_KEY = "bahorai_onboarding_done";

export function checkOnboardingDone(): boolean {
  return localStorage.getItem(ONBOARDING_KEY) === "1";
}

export function markOnboardingDone() {
  localStorage.setItem(ONBOARDING_KEY, "1");
}

type Goal = "ielts" | "english" | "homework" | "daily" | "coding";

const goalStarterPrompts: Record<Goal, string> = {
  ielts: "IELTS Task 2 uchun reja tuzib ber: ...",
  english: "Mening inglizcha matnimni tekshir va to'g'rilab ber: ...",
  homework: "Mavzuni tushuntirib ber: ...",
  daily: "Menga kundalik hayot uchun maslahat: ...",
  coding: "Mana kod/masala, tushuntirib ber: ...",
};

const goalModes: Record<Goal, string> = {
  ielts: "ielts",
  english: "english",
  homework: "homework",
  daily: "daily_life",
  coding: "coding",
};

interface OnboardingFlowProps {
  onComplete: (goal: Goal) => void;
}

export default function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState(1);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const { language, setLanguage, t } = useTranslation();

  const goals: { id: Goal; label: string; icon: string }[] = [
    { id: "ielts", label: "IELTS", icon: "🎯" },
    { id: "english", label: "English", icon: "🇬🇧" },
    { id: "homework", label: t('onboarding.homework'), icon: "📚" },
    { id: "daily", label: t('onboarding.daily'), icon: "☀️" },
    { id: "coding", label: "Coding", icon: "💻" },
  ];

  const handleFinish = () => {
    markOnboardingDone();
    if (selectedGoal) {
      onComplete(selectedGoal);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-scale-in">
        {step === 1 && (
          <div className="text-center space-y-8">
            {/* Logo */}
            <div className="flex justify-center">
              <img src={bahorLogo} alt="Bahor AI" className="w-20 h-20 object-contain" />
            </div>

            {/* Title */}
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground">
                {t('onboarding.whatCanDo')}
              </h1>
            </div>

            {/* Features */}
            <div className="space-y-4 text-left">
              <div className="flex items-start gap-3 p-4 bg-card rounded-2xl border border-border/40">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <MessageSquare className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">
                    {t('onboarding.quickAnswers')}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-card rounded-2xl border border-border/40">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Image className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">
                    {t('onboarding.fileAnalysis')}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-card rounded-2xl border border-border/40">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <GraduationCap className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">
                    {t('onboarding.specialModes')}
                  </p>
                </div>
              </div>
            </div>

            {/* Continue Button */}
            <Button 
              onClick={() => setStep(2)} 
              className="w-full h-12 rounded-xl text-base font-medium"
            >
              {t('onboarding.continue')}
              <ChevronRight className="w-5 h-5 ml-1" />
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="text-center space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground">
                {t('onboarding.whatNeed')}
              </h1>
              <p className="text-muted-foreground">
                {t('onboarding.chooseOne')}
              </p>
            </div>

            {/* Language Selector */}
            <div className="flex justify-center gap-2">
              {(["uz", "en", "ru", "tr"] as const).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    language === lang
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  }`}
                >
                  {lang.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Goal Chips */}
            <div className="flex flex-wrap justify-center gap-3">
              {goals.map((goal) => (
                <button
                  key={goal.id}
                  onClick={() => setSelectedGoal(goal.id)}
                  className={`px-5 py-3 rounded-2xl font-medium transition-all flex items-center gap-2 ${
                    selectedGoal === goal.id
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                      : "bg-card border border-border/40 text-foreground hover:bg-secondary"
                  }`}
                >
                  <span>{goal.icon}</span>
                  <span>{goal.label}</span>
                  {selectedGoal === goal.id && <Check className="w-4 h-4" />}
                </button>
              ))}
            </div>

            {/* Start Button */}
            <Button 
              onClick={handleFinish} 
              disabled={!selectedGoal}
              className="w-full h-12 rounded-xl text-base font-medium"
            >
              {t('onboarding.start')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export { goalStarterPrompts, goalModes };
export type { Goal };
