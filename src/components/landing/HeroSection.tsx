import React from "react";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, MessageSquare, ArrowRight, Search, ExternalLink } from "lucide-react";
import { useTranslation } from "@/i18n/LanguageProvider";
import bahorLogo from "@/assets/bahor-logo.png";

interface HeroSectionProps {
  onOpenApp: () => void;
  onScrollToFeatures: () => void;
}

export function HeroSection({ onOpenApp, onScrollToFeatures }: HeroSectionProps) {
  const { t } = useTranslation();

  const proofChips = [
    t('landing.hero.chip.sources'),
    t('landing.hero.chip.modes'),
    t('landing.hero.chip.imageGen'),
    t('landing.hero.chip.circles'),
  ];

  const sourceChips = ['kun.uz', 'gazeta.uz', 'lex.uz'];

  return (
    <section className="relative pt-6 pb-12 sm:pt-10 sm:pb-16 lg:pt-12 lg:pb-20">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-10 lg:gap-12 items-center">
          {/* Left - Content */}
          <div className="text-center lg:text-left">
            {/* Beta badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-4">
              <Sparkles className="w-4 h-4" />
              {t('badge.beta')}
            </div>
            
            {/* Headline */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-[3.25rem] font-bold mb-4 text-foreground leading-[1.1] tracking-tight">
              Birinchi o'zbek sun'iy intellekti — o'zbeklar uchun.
            </h1>
            
            {/* Subheadline */}
            <p className="text-base sm:text-lg text-muted-foreground mb-5 max-w-xl mx-auto lg:mx-0">
              O'zbek tili, madaniyat va kundalik ehtiyojlar uchun yaratilgan tezkor AI yordamchi.
            </p>
            
            {/* 3 bullet value props */}
            <ul className="space-y-2 mb-5 text-left max-w-xl mx-auto lg:mx-0">
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-sm text-foreground">Web qidiruv — manbalar bilan (kun.uz, gazeta.uz, lex.uz…)</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-sm text-foreground">AI Amallar: reja, vazifa, xulosa, PDF</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-sm text-foreground">Rasm yaratish (AI) + fayl/rasm tahlili</span>
              </li>
            </ul>
            
            {/* CTA row */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mb-5">
              <Button onClick={onOpenApp} size="lg" className="h-12 px-7 font-semibold rounded-xl shadow-lg shadow-primary/25 hover:translate-x-0.5 transition-transform">
                <MessageSquare className="w-5 h-5 mr-2" />
                Bahor AI'ni ochish
              </Button>
              <Button variant="outline" size="lg" className="h-12 px-6 font-medium rounded-xl hover:translate-x-0.5 transition-transform" onClick={onScrollToFeatures}>
                Imkoniyatlarni ko'rish
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
            
            {/* Proof strip - compact chips */}
            <div className="flex flex-wrap gap-2 justify-center lg:justify-start mb-4">
              {proofChips.map((chip) => (
                <span key={chip} className="px-3 py-1.5 rounded-full bg-secondary/60 border border-border/30 text-xs font-medium text-foreground">
                  {chip}
                </span>
              ))}
            </div>
            
            {/* Local sources label */}
            <div className="flex flex-wrap items-center gap-2 justify-center lg:justify-start">
              <span className="text-xs text-muted-foreground">Mahalliy manbalar bilan javoblar:</span>
              {sourceChips.map((source) => (
                <span key={source} className="px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-medium text-primary flex items-center gap-1">
                  <ExternalLink className="w-3 h-3" />
                  {source}
                </span>
              ))}
            </div>
          </div>
          
          {/* Right - Hero Mockup */}
          <div className="relative w-full max-w-md mx-auto lg:max-w-none">
            {/* Glow effect */}
            <div className="absolute inset-0 bg-primary/15 rounded-full scale-90 translate-y-8 blur-3xl" />
            
            {/* Main card */}
            <div className="relative glass-premium rounded-2xl shadow-glow-lg border border-border/40 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/30 bg-card/50">
                <div className="flex items-center gap-3">
                  <img src={bahorLogo} alt="Bahor AI" className="w-7 h-7 object-contain" />
                  <span className="font-semibold text-foreground text-sm">Bahor AI</span>
                </div>
                <div className="flex items-center gap-1 bg-secondary/60 rounded-lg p-0.5">
                  <span className="text-[10px] px-2 py-1 rounded bg-background text-foreground font-medium">Tez</span>
                  <span className="text-[10px] px-2 py-1 text-muted-foreground">Aqlli</span>
                </div>
              </div>
              
              {/* Content preview */}
              <div className="p-4 space-y-3">
                {/* User message */}
                <div className="flex justify-end">
                  <div className="bg-primary/15 border border-primary/30 text-foreground px-4 py-2.5 rounded-2xl rounded-tr-sm max-w-[85%]">
                    <p className="text-sm">2024 yilda O'zbekistonda qanday iqtisodiy islohotlar bo'ldi?</p>
                  </div>
                </div>
                
                {/* Floating tag */}
                <div className="absolute top-20 -right-2 bg-primary/90 text-primary-foreground text-[10px] px-2.5 py-1 rounded-full font-medium shadow-lg animate-pulse">
                  Web qidiruv
                </div>
                
                {/* Sources */}
                <div className="flex items-center gap-2">
                  <Search className="w-3 h-3 text-primary" />
                  <span className="text-[10px] text-muted-foreground">4 ta manba topildi</span>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {['gazeta.uz', 'review.uz', 'lex.uz'].map((s) => (
                    <span key={s} className="text-[10px] px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                      {s}
                    </span>
                  ))}
                </div>
                
                {/* AI response preview */}
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">2024-yilgi asosiy iqtisodiy islohotlar</p>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                    2024-yilda O'zbekistonda bir qator muhim iqtisodiy islohotlar amalga oshirildi. Birinchidan, soliq tizimi isloh qilindi...
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
