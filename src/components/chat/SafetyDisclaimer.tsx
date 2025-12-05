import { AlertTriangle } from "lucide-react";
import { useTranslation } from "@/i18n/LanguageProvider";

// Keywords that trigger safety disclaimer
const SAFETY_KEYWORDS = {
  medical: [
    'dori', 'kasallik', 'diagnoz', 'davolash', 'shifokor', 'doktor', 'og\'riq', 'simptom',
    'medicine', 'doctor', 'disease', 'diagnosis', 'treatment', 'symptom', 'pain',
    'врач', 'болезнь', 'диагноз', 'лечение', 'лекарство'
  ],
  legal: [
    'huquqiy', 'advokat', 'sud', 'qonun', 'jarima', 'jinoyat',
    'lawyer', 'legal', 'court', 'law', 'crime', 'sue',
    'юрист', 'адвокат', 'суд', 'закон'
  ],
  financial: [
    'kredit', 'qarz', 'soliq', 'investitsiya', 'aksiya', 'moliyaviy maslahat',
    'tax', 'loan', 'investment', 'stock', 'financial advice', 'credit',
    'кредит', 'налог', 'инвестиция', 'акция'
  ]
};

type SafetyCategory = 'medical' | 'legal' | 'financial';

export function detectSafetyCategory(text: string): SafetyCategory | null {
  const lowerText = text.toLowerCase();
  
  for (const [category, keywords] of Object.entries(SAFETY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        return category as SafetyCategory;
      }
    }
  }
  return null;
}

interface SafetyDisclaimerProps {
  category: SafetyCategory;
}

export default function SafetyDisclaimer({ category }: SafetyDisclaimerProps) {
  const { t } = useTranslation();
  
  const messages: Record<SafetyCategory, string> = {
    medical: t('safety.medical') || "Bu tibbiy maslahat emas. Jiddiy muammolarda shifokorga murojaat qiling.",
    legal: t('safety.legal') || "Bu huquqiy maslahat emas. Professional advokatga murojaat qilishni tavsiya etamiz.",
    financial: t('safety.financial') || "Bu moliyaviy maslahat emas. Muhim qarorlar uchun mutaxassisga murojaat qiling."
  };

  return (
    <div className="flex items-start gap-2 mt-3 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
      <p className="text-xs text-amber-600 dark:text-amber-400 leading-relaxed">
        {messages[category]}
      </p>
    </div>
  );
}
