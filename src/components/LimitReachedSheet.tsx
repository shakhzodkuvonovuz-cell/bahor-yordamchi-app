import { Clock, AlertCircle, Sparkles } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n/LanguageProvider';

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
}

export default function LimitReachedSheet({ 
  open, 
  onClose, 
  reason, 
  message,
  resetsAt,
  remaining,
}: LimitReachedSheetProps) {
  const { t } = useTranslation();

  const isFeatureLimit = ['search_limit_reached', 'vision_limit_reached', 'file_limit_reached'].includes(reason);
  const isGlobalLimit = reason.startsWith('global_');
  
  // Calculate reset time display
  const getResetTimeDisplay = () => {
    if (!resetsAt) return t('trial.tomorrow');
    try {
      const resetDate = new Date(resetsAt);
      const now = new Date();
      const diffHours = Math.ceil((resetDate.getTime() - now.getTime()) / (1000 * 60 * 60));
      if (diffHours <= 24) {
        return `~${diffHours} ${t('trial.hours')}`;
      }
      return t('trial.tomorrow');
    } catch {
      return t('trial.tomorrow');
    }
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader className="text-left">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-full bg-amber-500/20">
              <AlertCircle className="w-5 h-5 text-amber-400" />
            </div>
            <SheetTitle className="text-lg">
              {isGlobalLimit ? t('trial.systemBusy') : t('trial.limitReached')}
            </SheetTitle>
          </div>
        </SheetHeader>
        
        <div className="space-y-4 py-4">
          <p className="text-muted-foreground">{message}</p>
          
          {!isGlobalLimit && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>{t('trial.resetsIn')}: {getResetTimeDisplay()}</span>
            </div>
          )}

          {isFeatureLimit && remaining && remaining.messages > 0 && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <p className="text-sm text-emerald-300">
                {t('trial.canStillChat', { count: remaining.messages })}
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              {t('common.ok')}
            </Button>
            {!isGlobalLimit && (
              <Button 
                className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white"
                onClick={() => {
                  onClose();
                  // Could navigate to upgrade page in future
                }}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {t('trial.upgradeSoon')}
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
