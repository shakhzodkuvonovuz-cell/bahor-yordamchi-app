import { Link } from "react-router-dom";
import { useTranslation } from "@/i18n/LanguageProvider";
import bahorLogo from "@/assets/bahor-logo.png";

export function AppFooter() {
  const { t } = useTranslation();

  return (
    <footer className="bg-card border-t border-border py-12 px-4 sm:px-6 mt-auto">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <img 
                src={bahorLogo} 
                alt="Bahor AI" 
                className="h-8 w-8 object-contain" 
              />
              <span className="font-bold text-lg text-foreground">Bahor AI</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {t('footer.tagline')}
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-semibold text-sm text-foreground mb-3">
              {t('footer.product')}
            </h4>
            <ul className="space-y-2">
              <li>
                <Link to="/modes" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {t('sidebar.chat')}
                </Link>
              </li>
              <li>
                <Link to="/modes-list" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {t('sidebar.modes')}
                </Link>
              </li>
              <li>
                <Link to="/circles" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {t('nav.circles')}
                </Link>
              </li>
              <li>
                <Link to="/tools/documents" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {t('nav.tools')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-semibold text-sm text-foreground mb-3">
              {t('footer.support')}
            </h4>
            <ul className="space-y-2">
              <li>
                <Link to="/support" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {t('support.title')}
                </Link>
              </li>
              <li>
                <Link to="/feedback" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {t('feedback.title')}
                </Link>
              </li>
              <li>
                <a href="mailto:support@bahorai.com" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {t('footer.contact')}
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold text-sm text-foreground mb-3">
              {t('footer.legal')}
            </h4>
            <ul className="space-y-2">
              <li>
                <Link to="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {t('settings.privacy')}
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {t('settings.terms')}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-10 pt-6 border-t border-border/50 text-center">
          <p className="text-xs text-muted-foreground">
            © 2025 Bahor AI. {t('footer.allRightsReserved')}
          </p>
        </div>
      </div>
    </footer>
  );
}
