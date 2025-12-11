import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTranslation } from "@/i18n/LanguageProvider";
import { SEO } from "@/components/SEO";

export default function Privacy() {
  const navigate = useNavigate();
  const { t, language } = useTranslation();

  return (
    <>
      <SEO 
        title="Maxfiylik siyosati" 
        description="Bahor AI maxfiylik siyosati va ma'lumotlarni himoya qilish qoidalari."
        url="/privacy"
      />
      <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 bg-card/95 backdrop-blur-lg border-b border-border/40 shadow-premium-sm z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-secondary rounded-xl transition-colors"
            aria-label={t('common.back')}
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">{t('privacy.title')}</h1>
        </div>
      </header>

      {/* Content */}
      <ScrollArea className="h-[calc(100vh-56px)]">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
          {/* Translation notice for non-Uzbek users */}
          {language !== 'uz' && (
            <div className="bg-muted/50 border border-border/40 rounded-xl p-4 text-sm text-muted-foreground">
              {t('privacy.languageNotice')}
            </div>
          )}

          <div className="prose prose-sm dark:prose-invert max-w-none">
            <p className="text-muted-foreground text-sm">
              {t('privacy.lastUpdated')}
            </p>

            <h2 className="text-lg font-semibold text-foreground mt-6">{t('privacy.section1.title')}</h2>
            <p className="text-foreground/80">
              {t('privacy.section1.intro')}
            </p>
            <ul className="list-disc pl-5 text-foreground/80 space-y-1">
              <li>{t('privacy.section1.item1')}</li>
              <li>{t('privacy.section1.item2')}</li>
              <li>{t('privacy.section1.item3')}</li>
              <li>{t('privacy.section1.item4')}</li>
            </ul>

            <h2 className="text-lg font-semibold text-foreground mt-6">{t('privacy.section2.title')}</h2>
            <p className="text-foreground/80">
              {t('privacy.section2.intro')}
            </p>
            <ul className="list-disc pl-5 text-foreground/80 space-y-1">
              <li>{t('privacy.section2.item1')}</li>
              <li>{t('privacy.section2.item2')}</li>
              <li>{t('privacy.section2.item3')}</li>
              <li>{t('privacy.section2.item4')}</li>
            </ul>

            <h2 className="text-lg font-semibold text-foreground mt-6">{t('privacy.section3.title')}</h2>
            <p className="text-foreground/80">
              {t('privacy.section3.content')}
            </p>

            <h2 className="text-lg font-semibold text-foreground mt-6">{t('privacy.section4.title')}</h2>
            <p className="text-foreground/80">
              {t('privacy.section4.intro')}
            </p>
            <ul className="list-disc pl-5 text-foreground/80 space-y-1">
              <li>{t('privacy.section4.item1')}</li>
              <li>{t('privacy.section4.item2')}</li>
            </ul>
            <p className="text-foreground/80 mt-2">
              {t('privacy.section4.note')}
            </p>

            <h2 className="text-lg font-semibold text-foreground mt-6">{t('privacy.section5.title')}</h2>
            <p className="text-foreground/80">
              {t('privacy.section5.intro')}
            </p>
            <ul className="list-disc pl-5 text-foreground/80 space-y-1">
              <li>{t('privacy.section5.item1')}</li>
              <li>{t('privacy.section5.item2')}</li>
              <li>{t('privacy.section5.item3')}</li>
            </ul>

            <h2 className="text-lg font-semibold text-foreground mt-6">{t('privacy.section6.title')}</h2>
            <p className="text-foreground/80">
              {t('privacy.section6.content')} <a href="mailto:support@bahorai.com" className="text-primary hover:underline">support@bahorai.com</a>
            </p>
          </div>
        </div>
      </ScrollArea>
    </div>
    </>
  );
}