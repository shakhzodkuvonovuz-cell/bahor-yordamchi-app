import { Star } from "lucide-react";
import { useTranslation } from "@/i18n/LanguageProvider";

const MODE_USAGE_KEY = 'bahorai_mode_usage';

export function getModeUsageCount(modeId: string): number {
  try {
    const usage = JSON.parse(localStorage.getItem(MODE_USAGE_KEY) || '{}');
    return usage[modeId] || 0;
  } catch {
    return 0;
  }
}

export function incrementModeUsage(modeId: string): void {
  try {
    const usage = JSON.parse(localStorage.getItem(MODE_USAGE_KEY) || '{}');
    usage[modeId] = (usage[modeId] || 0) + 1;
    localStorage.setItem(MODE_USAGE_KEY, JSON.stringify(usage));
  } catch {
    // Ignore errors
  }
}

export function getMostUsedMode(): string | null {
  try {
    const usage = JSON.parse(localStorage.getItem(MODE_USAGE_KEY) || '{}');
    let maxCount = 0;
    let mostUsed: string | null = null;
    
    for (const [modeId, count] of Object.entries(usage)) {
      if ((count as number) > maxCount) {
        maxCount = count as number;
        mostUsed = modeId;
      }
    }
    
    // Only show recommendation if used at least 3 times
    return maxCount >= 3 ? mostUsed : null;
  } catch {
    return null;
  }
}

interface RecommendedBadgeProps {
  modeId: string;
}

export default function RecommendedBadge({ modeId }: RecommendedBadgeProps) {
  const { t } = useTranslation();
  const mostUsed = getMostUsedMode();
  
  if (mostUsed !== modeId) return null;

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[10px] font-medium">
      <Star className="w-3 h-3 fill-current" />
      {t('modes.recommended') || "Tavsiya"}
    </span>
  );
}
