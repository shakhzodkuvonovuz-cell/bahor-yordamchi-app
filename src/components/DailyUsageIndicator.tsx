import { MessageSquare, AlertCircle, Crown, Shield, Infinity, Sparkles } from "lucide-react";
import { useTranslation } from "@/i18n/LanguageProvider";
import type { PlanType } from "@/lib/entitlements";

interface DailyUsageIndicatorProps {
  used: number;
  limit: number;  // -1 for unlimited
  isNearLimit: boolean;
  hasReachedLimit: boolean;
  plan?: PlanType;
  isPremium?: boolean;
  isDevBypass?: boolean;
  isBetaActive?: boolean;
  daysRemaining?: number;
}

export default function DailyUsageIndicator({ 
  used, 
  limit, 
  isNearLimit, 
  hasReachedLimit,
  plan = 'free',
  isPremium = false,
  isDevBypass = false,
  isBetaActive = false,
  daysRemaining = 0,
}: DailyUsageIndicatorProps) {
  const { t } = useTranslation();

  // Dev unlimited users see "Cheksiz ♾️"
  if (isDevBypass || plan === 'dev_unlimited') {
    return (
      <div className="flex justify-center py-2">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
          <Shield className="w-3.5 h-3.5" />
          <span>{t('plan.devUnlimited')}</span>
          <Infinity className="w-3.5 h-3.5 ml-1" />
        </div>
      </div>
    );
  }

  // Beta Premium users see usage with days remaining
  if (plan === 'beta_premium' && isBetaActive) {
    return (
      <div className="flex justify-center py-2">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
          <Sparkles className="w-3.5 h-3.5" />
          <span>
            Beta Premium: <span className="font-bold">{used}/{limit}</span> • {daysRemaining} {t('trial.daysLeft')}
          </span>
        </div>
      </div>
    );
  }
  
  // Free users see regular usage indicator
  return (
    <div className="flex justify-center py-2">
      <div 
        className={`
          inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium
          ${hasReachedLimit 
            ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
            : isNearLimit 
              ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
              : 'bg-slate-100 dark:bg-slate-800/70 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
          }
        `}
      >
        {hasReachedLimit ? (
          <AlertCircle className="w-3.5 h-3.5" />
        ) : (
          <MessageSquare className="w-3.5 h-3.5" />
        )}
        <span>
          {t('usage.today')}: <span className="font-bold">{used}/{limit}</span> {t('usage.requests')}
        </span>
      </div>
    </div>
  );
}
