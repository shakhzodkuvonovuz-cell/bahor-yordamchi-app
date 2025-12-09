import { Clock, Crown, Sparkles, Zap, FolderArchive, Layers } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n/LanguageProvider';

interface LimitReachedSheetProps {
  open: boolean;
  onClose: () => void;
  used?: number;
  limit?: number;
  scope?: 'chat_daily' | 'pdf_monthly' | 'search_daily' | 'vision_daily' | 'files_daily';
  onUpgrade?: () => void;
}

export default function LimitReachedSheet({ 
  open, 
  onClose, 
  used = 0,
  limit = 5,
  scope = 'chat_daily',
  onUpgrade,
}: LimitReachedSheetProps) {
  const { t } = useTranslation();

  const benefits = [
    { icon: Sparkles, text: t('limitSheet.benefit1') },
    { icon: Layers, text: t('limitSheet.benefit2') },
    { icon: Zap, text: t('limitSheet.benefit3') },
    { icon: FolderArchive, text: t('limitSheet.benefit4') },
  ];

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent 
        side="bottom" 
        className="rounded-t-3xl border-t border-border/40 bg-gradient-to-b from-card/95 to-background/95 backdrop-blur-xl p-0 max-h-[85vh]"
      >
        <div className="p-6 space-y-5">
          {/* Header */}
          <SheetHeader className="text-center space-y-2">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center mb-2">
              <Crown className="w-7 h-7 text-amber-400" />
            </div>
            <SheetTitle className="text-xl font-semibold text-foreground">
              {t('limitSheet.title')}
            </SheetTitle>
            <p className="text-sm text-muted-foreground leading-relaxed px-2">
              {t('limitSheet.subtitle')}
            </p>
          </SheetHeader>
          
          {/* Stats row */}
          <div className="flex items-center justify-center gap-6 py-3 px-4 rounded-2xl bg-secondary/40 border border-border/30">
            <div className="text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('limitSheet.today')}</p>
              <p className="text-lg font-semibold text-foreground">{used}/{limit}</p>
            </div>
            <div className="w-px h-8 bg-border/50" />
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span className="text-sm">{t('limitSheet.resetLabel')}</span>
            </div>
          </div>

          {/* Benefits */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground flex items-center gap-2">
              <Crown className="w-4 h-4 text-amber-400" />
              {t('limitSheet.withPremium')}
            </p>
            <div className="grid grid-cols-1 gap-2">
              {benefits.map((benefit, i) => {
                const Icon = benefit.icon;
                return (
                  <div 
                    key={i} 
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-secondary/30 border border-border/20"
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-sm text-foreground">{benefit.text}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-3 pt-2">
            <Button 
              className="w-full h-12 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-medium rounded-xl shadow-lg shadow-amber-500/25"
              onClick={() => {
                onClose();
                onUpgrade?.();
              }}
            >
              <Crown className="w-4 h-4 mr-2" />
              {t('limitSheet.upgrade')}
              <span className="ml-2 text-xs opacity-90">({t('limitSheet.price')})</span>
            </Button>
            <Button 
              variant="ghost" 
              onClick={onClose} 
              className="w-full h-11 text-muted-foreground hover:text-foreground rounded-xl"
            >
              {t('limitSheet.later')}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
