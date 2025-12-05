import { useState, useEffect } from 'react';
import { X, Sparkles } from 'lucide-react';
import { useTranslation } from '@/i18n/LanguageProvider';

interface BetaBannerProps {
  daysRemaining: number;
}

const BANNER_DISMISSED_KEY = 'bahorai_beta_banner_dismissed';

export default function BetaBanner({ daysRemaining }: BetaBannerProps) {
  const { t } = useTranslation();
  const [isDismissed, setIsDismissed] = useState(true);

  useEffect(() => {
    const dismissed = localStorage.getItem(BANNER_DISMISSED_KEY);
    setIsDismissed(dismissed === 'true');
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(BANNER_DISMISSED_KEY, 'true');
    setIsDismissed(true);
  };

  if (isDismissed) return null;

  return (
    <div className="relative bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/10 border-b border-emerald-500/20">
      <div className="max-w-3xl mx-auto px-4 py-3">
        <div className="flex items-start gap-3">
          <div className="p-1.5 rounded-full bg-emerald-500/20 shrink-0">
            <Sparkles className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">
              {t('beta.bannerTitle')}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t('beta.bannerDesc').replace('{days}', String(daysRemaining))}
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1 hover:bg-muted/50 rounded-full transition-colors shrink-0"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
}
