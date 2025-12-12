import React, { useEffect } from "react";
import { SEO } from "@/components/SEO";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import bahorLogo from "@/assets/bahor-logo.png";
import { useTranslation } from "@/i18n/LanguageProvider";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { AppFooter } from "@/components/layout/AppFooter";
import { prefetchCriticalRoutes } from "@/lib/routePrefetch";
import {
  HeroSection,
  WhyBahorSection,
  FeatureSpotlights,
  UseCasesTabs,
  HowItWorksStepper,
  TrustSection,
  PricingSection,
  FaqSection,
  FinalCta,
} from "@/components/landing";

export default function Landing() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();

  useEffect(() => {
    const timer = setTimeout(prefetchCriticalRoutes, 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleOpenApp = () => {
    if (user) {
      navigate("/modes");
    } else {
      navigate("/auth?next=/modes");
    }
  };

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      <SEO url="/" />
      <div className="min-h-screen bg-background relative overflow-x-hidden">
        {/* Background - subtle radial gradients with noise overlay */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/8 rounded-full blur-[100px]" />
          <div className="absolute top-1/3 right-0 w-[400px] h-[400px] bg-primary/6 rounded-full blur-[80px]" />
          <div className="absolute bottom-1/4 left-0 w-[300px] h-[300px] bg-accent/10 rounded-full blur-[60px]" />
          {/* Noise overlay */}
          <div 
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            }}
          />
        </div>

        {/* Sticky Header */}
        <header className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b border-border/20">
          <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-2.5">
              <img src={bahorLogo} alt="Bahor AI" className="h-10 sm:h-11 w-auto" />
              <span className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Bahor AI</span>
            </div>

            {/* Center Nav - hidden on mobile */}
            <nav className="hidden md:flex items-center gap-6">
              <button onClick={() => scrollToSection("imkoniyatlar")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Imkoniyatlar
              </button>
              <button onClick={() => scrollToSection("rasm-yaratish")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Rasm yaratish
              </button>
              <button onClick={() => scrollToSection("doiralar")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Doiralar
              </button>
              <button onClick={() => scrollToSection("narxlar")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Narxlar
              </button>
              <button onClick={() => scrollToSection("faq")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                FAQ
              </button>
            </nav>

            {/* Right: Lang + CTA */}
            <div className="flex items-center gap-2 sm:gap-3">
              <LanguageSwitcher variant="pill" />
              <Button onClick={handleOpenApp} size="sm" className="h-9 px-4 rounded-xl font-medium shadow-lg shadow-primary/20 hover:translate-x-0.5 transition-transform">
                <span className="hidden sm:inline">Bahor AI'ni ochish</span>
                <span className="sm:hidden">Ochish</span>
              </Button>
            </div>
          </div>
        </header>

        {/* Page Sections */}
        <HeroSection onOpenApp={handleOpenApp} onScrollToFeatures={() => scrollToSection("imkoniyatlar")} />
        <WhyBahorSection />
        <FeatureSpotlights onOpenApp={handleOpenApp} />
        <UseCasesTabs onOpenApp={handleOpenApp} />
        <HowItWorksStepper />
        <PricingSection onOpenApp={handleOpenApp} />
        <TrustSection />
        <FaqSection />
        <FinalCta onOpenApp={handleOpenApp} />

        {/* Footer */}
        <AppFooter />
      </div>
    </>
  );
}
