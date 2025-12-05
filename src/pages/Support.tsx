import { ArrowLeft, Mail, MessageSquare, Bug, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n/LanguageProvider";

export default function Support() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
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
          <h1 className="text-lg font-semibold text-foreground">{t('support.title')}</h1>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Contact Card */}
        <section className="bg-card border border-border/40 rounded-2xl p-6 shadow-premium-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Mail className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">{t('support.contact')}</h2>
              <p className="text-sm text-muted-foreground">{t('support.contactDesc')}</p>
            </div>
          </div>
          
          <a
            href="mailto:support@bahorai.com"
            className="block w-full"
          >
            <Button variant="outline" className="w-full min-h-[48px] text-base">
              <Mail className="w-5 h-5 mr-2" />
              support@bahorai.com
              <ExternalLink className="w-4 h-4 ml-auto" />
            </Button>
          </a>
        </section>

        {/* Report Bug Card */}
        <section className="bg-card border border-border/40 rounded-2xl p-6 shadow-premium-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-destructive/10 rounded-xl">
              <Bug className="w-6 h-6 text-destructive" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">{t('support.reportBug')}</h2>
              <p className="text-sm text-muted-foreground">{t('support.reportBugDesc')}</p>
            </div>
          </div>
          
          <Button
            onClick={() => navigate("/feedback")}
            className="w-full min-h-[48px] text-base"
          >
            <MessageSquare className="w-5 h-5 mr-2" />
            {t('support.sendBug')}
          </Button>
        </section>

        {/* How to Report */}
        <section className="bg-card border border-border/40 rounded-2xl p-6 shadow-premium-sm">
          <h2 className="text-lg font-semibold text-foreground mb-4">{t('support.howToReport')}</h2>
          
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">
                1
              </div>
              <p className="text-foreground/80 text-sm">
                {t('support.step1')}
              </p>
            </div>
            
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">
                2
              </div>
              <p className="text-foreground/80 text-sm">
                {t('support.step2')}
              </p>
            </div>
            
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">
                3
              </div>
              <p className="text-foreground/80 text-sm">
                {t('support.step3')}
              </p>
            </div>
            
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">
                4
              </div>
              <p className="text-foreground/80 text-sm">
                {t('support.step4')}
              </p>
            </div>
          </div>
        </section>

        {/* FAQ Placeholder */}
        <section className="bg-muted/30 border border-border/40 rounded-2xl p-6">
          <p className="text-center text-muted-foreground text-sm">
            {t('support.faqComingSoon')}
          </p>
        </section>
      </div>
    </div>
  );
}