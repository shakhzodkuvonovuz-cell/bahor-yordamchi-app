import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import bahorLogo from "@/assets/bahor-logo.png";
import { Mail, Phone, Shield, Info } from "lucide-react";
import { useTranslation } from "@/i18n/LanguageProvider";

export default function Auth() {
  const [searchParams] = useSearchParams();
  const queryString = searchParams.toString();
  const [showDevHint, setShowDevHint] = useState(false);
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background via-background to-primary/5">
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-[420px] mx-auto animate-fade-in">
          {/* Logo & Header */}
          <div className="text-center mb-10">
            <div className="flex items-center justify-center gap-3 mb-4">
              <img 
                src={bahorLogo} 
                alt="Bahor AI" 
                className="w-14 h-14 object-contain"
              />
              <h1 className="text-2xl font-bold text-foreground">Bahor AI</h1>
            </div>
            <p className="text-muted-foreground text-[15px]">
              {t('auth.title')}
            </p>
          </div>

          {/* Method Buttons */}
          <div className="space-y-4">
            {/* Email */}
            <Link to={`/auth/email${queryString ? `?${queryString}` : ''}`} className="block">
              <button className="w-full bg-card hover:bg-card/80 border border-border/50 rounded-[20px] p-5 text-left transition-all duration-200 hover:shadow-lg hover:border-primary/30 active:scale-[0.98] group min-h-[80px]">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                    <Mail className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground text-[15px] mb-0.5">
                      {t('auth.emailContinue')}
                    </p>
                    <p className="text-[13px] text-muted-foreground">
                      {t('auth.emailDesc')}
                    </p>
                  </div>
                </div>
              </button>
            </Link>

            {/* Google */}
            <Link to={`/auth/google${queryString ? `?${queryString}` : ''}`} className="block">
              <button className="w-full bg-card hover:bg-card/80 border border-border/50 rounded-[20px] p-5 text-left transition-all duration-200 hover:shadow-lg hover:border-primary/30 active:scale-[0.98] group min-h-[80px]">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-card border border-border/50 flex items-center justify-center shrink-0 group-hover:border-primary/30 transition-colors">
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground text-[15px] mb-0.5">
                      {t('auth.googleContinue')}
                    </p>
                    <p className="text-[13px] text-muted-foreground">
                      {t('auth.googleDesc')}
                    </p>
                  </div>
                </div>
              </button>
            </Link>

            {/* Phone */}
            <Link to={`/auth/phone${queryString ? `?${queryString}` : ''}`} className="block">
              <button className="w-full bg-card hover:bg-card/80 border border-border/50 rounded-[20px] p-5 text-left transition-all duration-200 hover:shadow-lg hover:border-primary/30 active:scale-[0.98] group min-h-[80px]">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                    <Phone className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground text-[15px] mb-0.5">
                      {t('auth.phoneContinue')}
                    </p>
                    <p className="text-[13px] text-muted-foreground">
                      {t('auth.phoneDesc')}
                    </p>
                  </div>
                </div>
              </button>
            </Link>
          </div>

          {/* Trust Line */}
          <div className="flex items-center justify-center gap-2 mt-8 text-muted-foreground">
            <Shield className="w-4 h-4" />
            <p className="text-[13px]">{t('auth.dataSafe')}</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-6 pt-0">
        <div className="max-w-[420px] mx-auto">
          {/* Consent Text */}
          <p className="text-[11px] text-center text-muted-foreground leading-relaxed mb-4">
            {t('auth.consent')}{" "}
            <Link to="/terms" className="text-primary hover:underline">
              {t('auth.termsLink')}
            </Link>{" "}
            {t('auth.and')}{" "}
            <Link to="/privacy" className="text-primary hover:underline">
              {t('auth.privacyLink')}
            </Link>
            {t('auth.consentEnd')}
          </p>

          {/* Help Link */}
          <div className="text-center">
            <Link to="/support" className="text-[12px] text-muted-foreground hover:text-foreground transition-colors">
              {t('auth.needHelp')}
            </Link>
          </div>

          {/* Developer Hint (hidden by default) */}
          <div className="mt-4 flex justify-center">
            <button 
              onClick={() => setShowDevHint(!showDevHint)}
              className="w-6 h-6 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
            >
              <Info className="w-3 h-3" />
            </button>
          </div>
          
          {showDevHint && (
            <div className="mt-2 p-3 bg-muted/30 rounded-xl text-[11px] text-muted-foreground text-center animate-fade-in">
              Supabase: Google provider + redirect URLs + SMS provider kerak
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
