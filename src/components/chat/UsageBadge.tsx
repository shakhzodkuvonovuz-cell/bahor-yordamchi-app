import { useTranslation } from "@/i18n/LanguageProvider";
import { useDailyUsageServer } from "@/hooks/useEntitlements";
import { Sparkles, Infinity } from "lucide-react";

export default function UsageBadge() {
  const { t } = useTranslation();
  const { usage, loading, isDevBypass, isBetaActive } = useDailyUsageServer();
  
  if (loading) {
    return (
      <div className="h-6 w-16 animate-pulse rounded-full bg-secondary" />
    );
  }
  
  // Dev bypass users or unlimited plans show infinity
  if (isDevBypass || usage.limit === -1) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
        <Infinity className="w-3.5 h-3.5" />
        <span>{t('settings.unlimited')}</span>
      </div>
    );
  }
  
  const remaining = Math.max(usage.limit - usage.used, 0);
  const isAtLimit = remaining === 0;
  const isNearLimit = remaining <= 2 && remaining > 0;
  
  return (
    <div 
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
        isAtLimit 
          ? 'bg-destructive/10 text-destructive' 
          : isNearLimit 
            ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
            : 'bg-secondary text-secondary-foreground'
      }`}
    >
      {isBetaActive && <Sparkles className="w-3 h-3" />}
      <span>
        {usage.used}/{usage.limit}
      </span>
    </div>
  );
}
