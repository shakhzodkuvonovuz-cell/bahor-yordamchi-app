import React from "react";
import { Button } from "@/components/ui/button";
import { Check, ArrowRight, Search, ImagePlus, Users, FileText, Sparkles, ExternalLink, MessageSquare, ListTodo } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import samarkandImage from "@/assets/landing/samarkand-registan.jpg";
import tashkentImage from "@/assets/landing/tashkent-night.jpg";
import suzaniImage from "@/assets/landing/uzbek-suzani.jpg";
import bahorLogo from "@/assets/bahor-logo.png";

interface FeatureSpotlightsProps {
  onOpenApp: () => void;
}

export function FeatureSpotlights({ onOpenApp }: FeatureSpotlightsProps) {
  const ref1 = useScrollAnimation({ threshold: 0.1 });
  const ref2 = useScrollAnimation({ threshold: 0.1 });
  const ref3 = useScrollAnimation({ threshold: 0.1 });

  const circleOutcomes = ["Reja", "Vazifalar", "Qarorlar", "Xulosa"];

  return (
    <section id="imkoniyatlar" className="py-16 md:py-24">
      <div className="max-w-6xl mx-auto px-6">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-semibold tracking-tight mb-4 text-foreground">
            Asosiy imkoniyatlar
          </h2>
          <p className="text-base md:text-lg text-white/65 max-w-2xl mx-auto">
            Bahor AI oddiy chatbot emas — natijaga yo'naltirilgan yordamchi.
          </p>
        </div>

        {/* Spotlight 1 - Web Search */}
        <div
          ref={ref1.ref}
          className={`grid lg:grid-cols-2 gap-10 items-center mb-20 transition-all duration-700 ${
            ref1.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Search className="w-5 h-5 text-primary" />
              <h3 className="text-2xl sm:text-3xl font-bold text-foreground">Web qidiruv — manbalar bilan</h3>
            </div>
            <ul className="space-y-3 mb-6 max-w-prose">
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-foreground">Mahalliy manbalar bilan tekshirilgan javoblar</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-foreground">Havolalar (kun.uz, gazeta.uz, lex.uz…) bilan ko'rsatadi</span>
              </li>
            </ul>
            <button onClick={onOpenApp} className="text-primary hover:text-primary/80 font-medium text-sm flex items-center gap-1 hover:translate-x-0.5 transition-all">
              Sinab ko'rish <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          
          {/* Visual - Search proof */}
          <div className="glass-premium rounded-2xl p-5 border border-border/30">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground">4 ta manba topildi</span>
              </div>
              <div className="flex gap-2 flex-wrap">
                {['kun.uz', 'gazeta.uz', 'lex.uz', 'review.uz'].map((s) => (
                  <span key={s} className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20 flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" />{s}
                  </span>
                ))}
              </div>
              <div className="bg-secondary/40 rounded-xl p-4 mt-3">
                <p className="text-sm text-foreground font-medium mb-2">2024-yilgi asosiy islohotlar</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Soliq tizimi isloh qilindi, kichik biznes uchun soliq stavkalari pasaytirildi <span className="text-primary">[1]</span>. Xorijiy investitsiyalar uchun yangi imtiyozlar...
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Spotlight 2 - Image Generation */}
        <div
          ref={ref2.ref}
          className={`grid lg:grid-cols-2 gap-10 items-center mb-20 transition-all duration-700 ${
            ref2.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          {/* Visual - Image gallery (2x3 mosaic) */}
          <div className="order-2 lg:order-1 grid grid-cols-3 gap-2">
            {[samarkandImage, tashkentImage, suzaniImage, tashkentImage, samarkandImage, suzaniImage].map((img, i) => (
              <div key={i} className="aspect-square rounded-xl overflow-hidden border border-border/30 hover:scale-105 transition-transform">
                <img src={img} alt="" className="w-full h-full object-cover" loading="lazy" />
              </div>
            ))}
          </div>
          
          <div className="order-1 lg:order-2">
            <div className="flex items-center gap-2 mb-4">
              <ImagePlus className="w-5 h-5 text-primary" />
              <h3 className="text-2xl sm:text-3xl font-bold text-foreground">Rasm yaratish (AI) — o'zbek prompt bilan</h3>
            </div>
            <ul className="space-y-3 mb-6 max-w-prose">
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-foreground">O'zbekcha yozing — sifatli rasm oling</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-foreground">Chat ichida ham, Asboblar'da ham ishlaydi</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-foreground">Yuklab olish va ulashish oson</span>
              </li>
            </ul>
            <Button onClick={onOpenApp} className="h-10 px-5 rounded-xl font-medium shadow-lg shadow-primary/20 hover:translate-x-0.5 transition-transform">
              Rasm yaratishni sinab ko'rish
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>

        {/* Spotlight 3 - Circles */}
        <div
          ref={ref3.ref}
          id="doiralar"
          className={`grid lg:grid-cols-2 gap-10 items-start transition-all duration-700 ${
            ref3.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-primary" />
              <h3 className="text-2xl sm:text-3xl font-bold text-foreground">Doiralar — jamoa suhbati natijaga aylanadi</h3>
            </div>
            <ul className="space-y-3 mb-6 max-w-prose">
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-foreground">Guruh suhbati: real-time xabarlar, javoblar va fayl ulashish</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-foreground">/bahor bilan AI yordami: suhbat kontekstida savol bering</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-foreground">AI natijalari: reja, vazifalar, qarorlar, xulosa</span>
              </li>
            </ul>
            <p className="text-sm text-muted-foreground mb-3">Shablonlar:</p>
            <div className="flex flex-wrap gap-2">
              {['📚 Study', '💼 Work', '👨‍👩‍👧‍👦 Family', '🎨 Creator', '🏪 Small Biz'].map((t) => (
                <span key={t} className="px-3 py-1.5 rounded-lg bg-secondary/50 text-xs text-muted-foreground hover:bg-secondary transition-colors cursor-pointer">
                  {t}
                </span>
              ))}
            </div>
          </div>
          
          {/* Circles mockup */}
          <div className="glass-premium rounded-2xl p-4 border border-border/40 max-w-md mx-auto lg:mx-0">
            {/* Header */}
            <div className="flex items-center gap-3 pb-3 border-b border-border/30 mb-3">
              <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center text-sm">📊</div>
              <div className="flex-1">
                <span className="font-semibold text-sm text-foreground block">Marketing jamoasi</span>
                <span className="text-xs text-muted-foreground">6 a'zo</span>
              </div>
            </div>
            
            {/* AI Actions */}
            <div className="flex flex-wrap gap-2 mb-3">
              {circleOutcomes.map((o) => (
                <span key={o} className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20">
                  {o}
                </span>
              ))}
            </div>
            
            {/* Messages */}
            <div className="space-y-2.5">
              <div className="flex items-start gap-2">
                <div className="w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center text-[9px] text-white font-medium shrink-0">JA</div>
                <div className="bg-secondary/60 rounded-xl rounded-tl-sm px-3 py-2 text-xs text-foreground">
                  <span className="text-primary font-medium">/bahor</span> shu hafta qanday vazifalar qoldi?
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center shrink-0 overflow-hidden p-0.5">
                  <img src={bahorLogo} alt="" className="w-full h-full object-contain" />
                </div>
                <div className="bg-primary/10 border border-primary/20 rounded-xl rounded-tl-sm px-3 py-2 text-xs text-foreground leading-relaxed">
                  📋 Shu hafta uchun 3 ta vazifa:<br/>
                  1. Prezentatsiya tayyorlash ✅<br/>
                  2. Byudjet hisob-kitobi<br/>
                  3. Mijozlar bilan uchrashuv
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
