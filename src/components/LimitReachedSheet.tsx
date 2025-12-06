import { Clock, AlertCircle, Crown, Check } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n/LanguageProvider';
import { useLanguage } from '@/hooks/useLanguage';
import { PREMIUM_BENEFITS, SCOPE_LABELS, RESET_TEXT } from '@/lib/limits';

interface LimitReachedSheetProps {
  open: boolean;
  onClose: () => void;
  reason: string;
  message: string;
  resetsAt?: string;
  remaining?: {
    messages: number;
    searches: number;
    vision: number;
    files: number;
  };
  scope?: 'chat_daily' | 'pdf_monthly' | 'search_daily' | 'vision_daily' | 'files_daily';
  used?: number;
  limit?: number;
}

export default function LimitReachedSheet({ 
  open, 
  onClose, 
  reason, 
  message,
  resetsAt,
  remaining,
  scope = 'chat_daily',
  used = 0,
  limit = 0,
}: LimitReachedSheetProps) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const lang = (language as 'uz' | 'en' | 'ru' | 'tr') || 'uz';

  const isFeatureLimit = ['search_limit_reached', 'vision_limit_reached', 'file_limit_reached'].includes(reason);
  const isGlobalLimit = reason.startsWith('global_');
  
  const benefits = PREMIUM_BENEFITS[lang] || PREMIUM_BENEFITS.uz;
  const scopeLabel = SCOPE_LABELS[scope]?.[lang] || scope;
  const period = scope.includes('monthly') ? 'monthly' : 'daily';
  const resetText = RESET_TEXT[period]?.[lang] || RESET_TEXT.daily.uz;
  
  // Calculate reset time display
  const getResetTimeDisplay = () => {
    if (!resetsAt) return resetText;
    try {
      const resetDate = new Date(resetsAt);
      const now = new Date();
      const diffHours = Math.ceil((resetDate.getTime() - now.getTime()) / (1000 * 60 * 60));
      if (diffHours <= 24) {
        return `~${diffHours} ${t('trial.hours')}`;
      }
      return resetText;
    } catch {
      return resetText;
    }
  };

  const labels = {
    uz: { premiumBenefits: 'Premium bilan:', upgrade: 'Premiumga o\'tish' },
    en: { premiumBenefits: 'With Premium:', upgrade: 'Upgrade to Premium' },
    ru: { premiumBenefits: 'С Премиум:', upgrade: 'Перейти на Премиум' },
    tr: { premiumBenefits: 'Premium ile:', upgrade: 'Premium\'a Geç' },
  };
  const labelT = labels[lang] || labels.uz;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="bottom" className="rounded-t-3xl border-t-2 border-amber-500/30 bg-gradient-to-b from-card to-background">
        <SheetHeader className="text-left">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30">
              <AlertCircle className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <SheetTitle className="text-lg">
                {isGlobalLimit ? t('trial.systemBusy') : `${scopeLabel}: ${t('trial.limitReached')}`}
              </SheetTitle>
              {limit > 0 && (
                <p className="text-sm text-muted-foreground">{used}/{limit} {t('usage.requests')}</p>
              )}
            </div>
          </div>
        </SheetHeader>
        
        <div className="space-y-4 py-4">
          <p className="text-muted-foreground">{message}</p>
          
          {!isGlobalLimit && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
              <Clock className="w-4 h-4" />
              <span>{t('trial.resetsIn')}: {getResetTimeDisplay()}</span>
            </div>
          )}

          {isFeatureLimit && remaining && remaining.messages > 0 && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <p className="text-sm text-emerald-400">
                {t('trial.canStillChat', { count: remaining.messages })}
              </p>
            </div>
          )}

          {/* Premium benefits */}
          {!isGlobalLimit && (
            <div className="space-y-3 pt-2">
              <p className="text-sm font-medium text-foreground flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-400" />
                {labelT.premiumBenefits}
              </p>
              <ul className="space-y-2">
                {benefits.slice(0, 4).map((benefit, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              {t('common.ok')}
            </Button>
            {!isGlobalLimit && (
              <Button 
                className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-amber-500/25"
                onClick={() => {
                  onClose();
                  // Could navigate to upgrade page in future
                }}
              >
                <Crown className="w-4 h-4 mr-2" />
                {labelT.upgrade}
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
