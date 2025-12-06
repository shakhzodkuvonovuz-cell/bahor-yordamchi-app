import { AlertCircle, Crown, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/hooks/useLanguage';
import { PREMIUM_BENEFITS, SCOPE_LABELS, RESET_TEXT } from '@/lib/limits';

interface LimitReachedCardProps {
  scope?: 'chat_daily' | 'pdf_monthly' | 'search_daily' | 'vision_daily' | 'files_daily';
  used?: number;
  limit?: number;
  period?: 'daily' | 'monthly';
  onClose?: () => void;
  onUpgrade?: () => void;
  compact?: boolean;
}

export default function LimitReachedCard({
  scope = 'chat_daily',
  used = 0,
  limit = 5,
  period = 'daily',
  onClose,
  onUpgrade,
  compact = false,
}: LimitReachedCardProps) {
  const { language } = useLanguage();
  const lang = (language as 'uz' | 'en' | 'ru' | 'tr') || 'uz';
  
  const scopeLabel = SCOPE_LABELS[scope]?.[lang] || scope;
  const resetText = RESET_TEXT[period]?.[lang] || RESET_TEXT.daily.uz;
  const benefits = PREMIUM_BENEFITS[lang] || PREMIUM_BENEFITS.uz;
  
  const labels = {
    uz: {
      limitReached: 'Limitga yetdingiz',
      usageText: `${used}/${limit} ishlatildi`,
      upgrade: 'Premiumga o\'tish',
      close: 'Yopish',
      premiumBenefits: 'Premium bilan:',
    },
    en: {
      limitReached: 'Limit reached',
      usageText: `${used}/${limit} used`,
      upgrade: 'Upgrade to Premium',
      close: 'Close',
      premiumBenefits: 'With Premium:',
    },
    ru: {
      limitReached: 'Лимит достигнут',
      usageText: `${used}/${limit} использовано`,
      upgrade: 'Перейти на Премиум',
      close: 'Закрыть',
      premiumBenefits: 'С Премиум:',
    },
    tr: {
      limitReached: 'Limite ulaşıldı',
      usageText: `${used}/${limit} kullanıldı`,
      upgrade: 'Premium\'a Geç',
      close: 'Kapat',
      premiumBenefits: 'Premium ile:',
    },
  };
  
  const t = labels[lang] || labels.uz;

  if (compact) {
    return (
      <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/30">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-amber-500/20 shrink-0">
              <AlertCircle className="w-5 h-5 text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground">
                {scopeLabel}: {t.limitReached}
              </p>
              <p className="text-sm text-muted-foreground">{resetText}</p>
            </div>
            <Button 
              size="sm" 
              className="bg-gradient-to-r from-amber-500 to-orange-500 text-white shrink-0"
              onClick={onUpgrade}
            >
              <Crown className="w-4 h-4 mr-1" />
              Premium
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex justify-center my-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <Card className="max-w-md w-full overflow-hidden border-2 border-amber-500/30 shadow-xl bg-gradient-to-br from-card via-card to-amber-500/5">
        <CardContent className="relative p-6 space-y-5">
          {/* Close button */}
          {onClose && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}

          {/* Header */}
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30">
              <AlertCircle className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                {scopeLabel}: {t.limitReached}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t.usageText} • {resetText}
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-2">
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div 
                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500"
                style={{ width: '100%' }}
              />
            </div>
          </div>

          {/* Premium benefits */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground flex items-center gap-2">
              <Crown className="w-4 h-4 text-amber-400" />
              {t.premiumBenefits}
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

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            {onClose && (
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={onClose}
              >
                {t.close}
              </Button>
            )}
            <Button 
              className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-amber-500/25"
              onClick={onUpgrade}
            >
              <Crown className="w-4 h-4 mr-2" />
              {t.upgrade}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
