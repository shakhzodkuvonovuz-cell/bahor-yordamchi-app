import { MessageSquare, AlertCircle, Crown, Shield, Infinity } from "lucide-react";
import { useTranslation } from "@/i18n/LanguageProvider";

interface DailyUsageIndicatorProps {
  used: number;
  limit: number;
  isNearLimit: boolean;
  hasReachedLimit: boolean;
  isPremium?: boolean;
  isDevBypass?: boolean;
}

export default function DailyUsageIndicator({ 
  used, 
  limit, 
  isNearLimit, 
  hasReachedLimit,
  isPremium = false,
  isDevBypass = false,
}: DailyUsageIndicatorProps) {
  const { t } = useTranslation();

  // Premium or dev bypass users see "Cheksiz" (unlimited)
  if (isPremium || isDevBypass) {
    return (
      <div className="flex justify-center py-2">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
          {isDevBypass ? (
            <>
              <Shield className="w-3.5 h-3.5" />
              <span>Dev Unlimited</span>
            </>
          ) : (
            <>
              <Crown className="w-3.5 h-3.5" />
              <span>Premium</span>
              <Infinity className="w-3.5 h-3.5 ml-1" />
            </>
          )}
        </div>
      </div>
    );
  }
  
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
          {t('usage.today')}: <span className="font-bold">{used} / {limit}</span> {t('usage.requests')}
        </span>
      </div>
    </div>
  );
}
