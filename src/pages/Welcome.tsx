import { useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { useTranslation } from "@/i18n/LanguageProvider";
import { SEO } from "@/components/SEO";

export default function Welcome() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <>
      <SEO 
        title="Xush kelibsiz"
        description="Bahor AI – birinchi o'zbek tiliga moslangan sun'iy intellekt yordamchi. Boshlash uchun tayyor!"
        url="/welcome"
      />
      <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-background to-primary-glow/20">
      <div className="w-full max-w-md mx-auto text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Logo/Icon */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="w-24 h-24 bg-gradient-to-br from-primary to-primary-light rounded-3xl flex items-center justify-center shadow-lg animate-in zoom-in duration-500">
              <Sparkles className="w-12 h-12 text-primary-foreground" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary-light rounded-3xl blur-xl opacity-30 animate-pulse" />
          </div>
        </div>

        {/* Title and Subtitle */}
        <div className="space-y-3">
          <h1 className="text-5xl font-bold text-foreground tracking-tight">
            Bahor AI
          </h1>
          <p className="text-xl text-muted-foreground font-medium">
            {t('welcome.tagline')}
          </p>
        </div>

        {/* Description */}
        <p className="text-base text-muted-foreground leading-relaxed max-w-sm mx-auto">
          {t('welcome.description')}
        </p>

        {/* CTA Button */}
        <button
          onClick={() => navigate("/")}
          className="w-full max-w-xs mx-auto bg-primary hover:bg-primary-light text-primary-foreground font-semibold py-4 px-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 active:scale-95 text-lg"
        >
          {t('welcome.start')}
        </button>

        {/* Version indicator */}
        <p className="text-xs text-muted-foreground/60 pt-4">
          {t('welcome.version')}
        </p>
      </div>
    </div>
    </>
  );
}