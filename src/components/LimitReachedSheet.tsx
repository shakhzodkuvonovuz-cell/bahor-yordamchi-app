import { Clock, Crown, Check, Sparkles, Zap, FolderArchive, Layers } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n/LanguageProvider';
import { useLanguage } from '@/hooks/useLanguage';

interface LimitReachedSheetProps {
  open: boolean;
  onClose: () => void;
  used?: number;
  limit?: number;
  scope?: 'chat_daily' | 'pdf_monthly' | 'search_daily' | 'vision_daily' | 'files_daily';
  onUpgrade?: () => void;
}

const BENEFITS = {
  uz: [
    { icon: Sparkles, text: "Ko'proq so'rovlar (cheklovsiz)" },
    { icon: Layers, text: "PDF Tools Pro (OCR, Protect/Unlock, Office→PDF…)" },
    { icon: Zap, text: "Tezroq javob (prioritet)" },
    { icon: FolderArchive, text: "Fayllar arxivi" },
  ],
  en: [
    { icon: Sparkles, text: "More requests (unlimited)" },
    { icon: Layers, text: "PDF Tools Pro (OCR, Protect/Unlock, Office→PDF…)" },
    { icon: Zap, text: "Faster responses (priority)" },
    { icon: FolderArchive, text: "File archive" },
  ],
  ru: [
    { icon: Sparkles, text: "Больше запросов (безлимит)" },
    { icon: Layers, text: "PDF Tools Pro (OCR, Protect/Unlock, Office→PDF…)" },
    { icon: Zap, text: "Быстрые ответы (приоритет)" },
    { icon: FolderArchive, text: "Архив файлов" },
  ],
  tr: [
    { icon: Sparkles, text: "Daha fazla istek (sınırsız)" },
    { icon: Layers, text: "PDF Tools Pro (OCR, Protect/Unlock, Office→PDF…)" },
    { icon: Zap, text: "Daha hızlı yanıt (öncelik)" },
    { icon: FolderArchive, text: "Dosya arşivi" },
  ],
};

const LABELS = {
  uz: {
    title: "Bugungi limit tugadi",
    subtitle: "Ertaga limit yangilanadi. Premiumga o'tsangiz cheklovlar yuqori va PDF Tools Pro ochiladi.",
    statsLabel: "Bugun",
    resetLabel: "Ertaga yangilanadi",
    upgrade: "Premiumga o'tish",
    upgradePrice: "49 000 so'm/oy",
    later: "Ertaga davom etaman",
    viewPlans: "Rejalarni ko'rish",
    withPremium: "Premium bilan:",
  },
  en: {
    title: "Daily limit reached",
    subtitle: "Limit resets tomorrow. Upgrade to Premium for higher limits and PDF Tools Pro.",
    statsLabel: "Today",
    resetLabel: "Resets tomorrow",
    upgrade: "Upgrade to Premium",
    upgradePrice: "$4.99/month",
    later: "Continue tomorrow",
    viewPlans: "View plans",
    withPremium: "With Premium:",
  },
  ru: {
    title: "Дневной лимит исчерпан",
    subtitle: "Лимит обновится завтра. Премиум даёт больше лимитов и PDF Tools Pro.",
    statsLabel: "Сегодня",
    resetLabel: "Обновится завтра",
    upgrade: "Перейти на Премиум",
    upgradePrice: "49 000 сум/мес",
    later: "Продолжу завтра",
    viewPlans: "Смотреть тарифы",
    withPremium: "С Премиум:",
  },
  tr: {
    title: "Günlük limit doldu",
    subtitle: "Limit yarın sıfırlanır. Premium ile daha yüksek limitler ve PDF Tools Pro alın.",
    statsLabel: "Bugün",
    resetLabel: "Yarın sıfırlanır",
    upgrade: "Premium'a geç",
    upgradePrice: "₺99/ay",
    later: "Yarın devam ederim",
    viewPlans: "Planları gör",
    withPremium: "Premium ile:",
  },
};

export default function LimitReachedSheet({ 
  open, 
  onClose, 
  used = 0,
  limit = 5,
  scope = 'chat_daily',
  onUpgrade,
}: LimitReachedSheetProps) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const lang = (language as 'uz' | 'en' | 'ru' | 'tr') || 'uz';
  
  const labels = LABELS[lang] || LABELS.uz;
  const benefits = BENEFITS[lang] || BENEFITS.uz;

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
              {labels.title}
            </SheetTitle>
            <p className="text-sm text-muted-foreground leading-relaxed px-2">
              {labels.subtitle}
            </p>
          </SheetHeader>
          
          {/* Stats row */}
          <div className="flex items-center justify-center gap-6 py-3 px-4 rounded-2xl bg-secondary/40 border border-border/30">
            <div className="text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">{labels.statsLabel}</p>
              <p className="text-lg font-semibold text-foreground">{used}/{limit}</p>
            </div>
            <div className="w-px h-8 bg-border/50" />
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span className="text-sm">{labels.resetLabel}</span>
            </div>
          </div>

          {/* Benefits */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground flex items-center gap-2">
              <Crown className="w-4 h-4 text-amber-400" />
              {labels.withPremium}
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
              {labels.upgrade}
              <span className="ml-2 text-xs opacity-90">({labels.upgradePrice})</span>
            </Button>
            <Button 
              variant="ghost" 
              onClick={onClose} 
              className="w-full h-11 text-muted-foreground hover:text-foreground rounded-xl"
            >
              {labels.later}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}