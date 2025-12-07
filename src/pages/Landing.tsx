import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Code2,
  Briefcase,
  BookOpen,
  GraduationCap,
  Home,
  Globe,
  Zap,
  Sparkles,
  MessageSquare,
  ArrowRight,
  Check,
  Send,
  Wallet,
  Users,
  FileText,
  Search,
  Image,
  Shield,
  ListTodo,
  ExternalLink,
  ImagePlus,
  Download,
} from "lucide-react";
import bahorLogo from "@/assets/bahor-logo.png";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useTranslation } from "@/i18n/LanguageProvider";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { AppFooter } from "@/components/layout/AppFooter";

// Hero mockup with chat + image generation preview
function HeroMockup() {
  const { t } = useTranslation();
  
  return (
    <div className="relative w-full max-w-md mx-auto">
      {/* Glow effect */}
      <div className="absolute inset-0 bg-primary/15 rounded-full scale-90 translate-y-8 blur-3xl" />
      
      {/* Main card */}
      <div className="relative glass-premium rounded-3xl p-5 shadow-glow-lg animate-float-slow border border-border/40">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-border/30">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <img src={bahorLogo} alt="Bahor AI" className="w-7 h-7 object-contain" />
          </div>
          <div>
            <p className="font-semibold text-foreground text-sm">Bahor AI</p>
            <p className="text-xs text-primary">{t('chat.typing')}</p>
          </div>
        </div>
        
        {/* Messages */}
        <div className="space-y-3">
          {/* User message */}
          <div className="flex justify-end">
            <div className="bg-primary text-primary-foreground px-4 py-2.5 rounded-2xl rounded-tr-md max-w-[80%]">
              <p className="text-sm">{t('mockup.userMessage')}</p>
            </div>
          </div>
          
          {/* AI message with sources */}
          <div className="flex justify-start">
            <div className="bg-card border border-border/50 px-4 py-2.5 rounded-2xl rounded-tl-md max-w-[85%]">
              <p className="text-sm text-card-foreground mb-2">{t('mockup.aiMessage')}</p>
              <div className="flex gap-1.5 flex-wrap">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">kun.uz</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">lex.uz</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Image generation preview overlay */}
        <div className="absolute -right-4 -bottom-4 w-24 h-24 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-border/40 shadow-lg flex items-center justify-center overflow-hidden">
          <div className="text-center">
            <ImagePlus className="w-6 h-6 text-primary mx-auto mb-1" />
            <span className="text-[9px] text-muted-foreground">AI Rasm</span>
          </div>
        </div>
        
        {/* Input mockup */}
        <div className="mt-4 pt-3 border-t border-border/30">
          <div className="flex items-center gap-2 bg-secondary/50 rounded-xl px-4 py-2.5">
            <span className="text-sm text-muted-foreground flex-1">{t('chat.input.placeholder')}</span>
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Send className="w-4 h-4 text-primary-foreground" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  
  const handleOpenApp = () => {
    if (user) {
      navigate("/modes");
    } else {
      navigate("/auth?next=/modes");
    }
  };

  const handleModeClick = (modeId: string) => {
    if (user) {
      navigate(`/chat/${modeId}`);
    } else {
      navigate(`/auth?next=${encodeURIComponent(`/chat/${modeId}`)}`);
    }
  };

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const heroRef = useScrollAnimation({ threshold: 0.2 });
  const featuresRef = useScrollAnimation({ threshold: 0.1 });
  const imageGenRef = useScrollAnimation({ threshold: 0.1 });
  const circlesRef = useScrollAnimation({ threshold: 0.1 });
  const stepsRef = useScrollAnimation({ threshold: 0.1 });
  const pricingRef = useScrollAnimation({ threshold: 0.1 });
  const faqRef = useScrollAnimation({ threshold: 0.1 });

  // 6 feature cards (merged, concise)
  const features = [
    { icon: <Search className="w-5 h-5" />, title: t('landing.feature.webSearch.title'), desc: t('landing.feature.webSearch.desc') },
    { icon: <ImagePlus className="w-5 h-5" />, title: t('landing.feature.imageGen.title'), desc: t('landing.feature.imageGen.desc'), badge: t('landing.badge.new') },
    { icon: <FileText className="w-5 h-5" />, title: t('landing.feature.fileAnalysis.title'), desc: t('landing.feature.fileAnalysis.desc') },
    { icon: <ListTodo className="w-5 h-5" />, title: t('landing.feature.aiActions.title'), desc: t('landing.feature.aiActions.desc') },
    { icon: <Users className="w-5 h-5" />, title: t('landing.feature.circles.title'), desc: t('landing.feature.circles.desc') },
    { icon: <Globe className="w-5 h-5" />, title: t('landing.feature.modes.title'), desc: t('landing.feature.modes.desc') },
  ];

  // 4 steps
  const steps = [
    { number: "1", title: t('landing.step.1.title'), desc: t('landing.step.1.desc') },
    { number: "2", title: t('landing.step.2.title'), desc: t('landing.step.2.desc') },
    { number: "3", title: t('landing.step.3.title'), desc: t('landing.step.3.desc') },
    { number: "4", title: t('landing.step.4.title'), desc: t('landing.step.4.desc') },
  ];

  // Circles outcome chips
  const circleOutcomes = [
    t('landing.circles.outcome.plan'),
    t('landing.circles.outcome.tasks'),
    t('landing.circles.outcome.decisions'),
    t('landing.circles.outcome.summary'),
  ];

  // FAQs (extended)
  const faqs = [
    { q: t('faq.1.question'), a: t('faq.1.answer') },
    { q: t('faq.2.question'), a: t('faq.2.answer') },
    { q: t('landing.faq.imageGen.question'), a: t('landing.faq.imageGen.answer') },
    { q: t('faq.webSearch.question'), a: t('faq.webSearch.answer') },
    { q: t('landing.faq.files.question'), a: t('landing.faq.files.answer') },
    { q: t('faq.circles.question'), a: t('faq.circles.answer') },
  ];

  // Pricing plans
  const pricingPlans = [
    {
      name: t('pricing.free.name'),
      price: "0",
      features: [t('landing.pricing.free.f1'), t('landing.pricing.free.f2'), t('landing.pricing.free.f3')],
      cta: t('button.start'),
      action: "start",
    },
    {
      name: t('pricing.monthly.name'),
      price: "49,000",
      features: [t('landing.pricing.monthly.f1'), t('landing.pricing.monthly.f2'), t('landing.pricing.monthly.f3'), t('landing.pricing.monthly.f4'), t('landing.pricing.monthly.f5')],
      cta: t('button.comingSoon'),
      action: "soon",
      highlighted: true,
      badge: t('pricing.monthly.badge'),
    },
    {
      name: t('pricing.yearly.name'),
      price: "340,000",
      features: [t('landing.pricing.yearly.f1'), t('landing.pricing.yearly.f2'), t('landing.pricing.yearly.f3')],
      cta: t('button.comingSoon'),
      action: "soon",
      badge: t('pricing.yearly.badge'),
    },
  ];

  // Sample image gallery placeholders
  const imageGallery = [
    { label: "Samarqand", emoji: "🏛️" },
    { label: "Toshkent", emoji: "🌆" },
    { label: "Study Poster", emoji: "📚" },
  ];

  // Source chips
  const sourceChips = ['kun.uz', 'gazeta.uz', 'lex.uz'];

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute top-1/3 right-0 w-[500px] h-[500px] bg-primary/4 rounded-full blur-[100px]" />
      </div>
      
      {/* Sticky Header with Nav */}
      <header className="glass-strong sticky top-0 z-50 border-b border-border/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <img src={bahorLogo} alt="Bahor AI" className="h-8 w-auto" />
            <span className="text-lg font-bold text-foreground">Bahor AI</span>
          </div>
          
          {/* Center Nav - hidden on mobile */}
          <nav className="hidden md:flex items-center gap-6">
            <button onClick={() => scrollToSection('features')} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {t('nav.features')}
            </button>
            <button onClick={() => scrollToSection('image-gen')} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {t('landing.nav.imageGen')}
            </button>
            <button onClick={() => scrollToSection('circles')} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {t('nav.circles')}
            </button>
            <button onClick={() => scrollToSection('pricing')} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {t('nav.pricing')}
            </button>
            <button onClick={() => scrollToSection('faq')} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              FAQ
            </button>
          </nav>
          
          {/* Right: Lang + CTA */}
          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageSwitcher variant="pill" />
            <Button onClick={handleOpenApp} size="sm" className="h-9 px-4 rounded-xl font-medium shadow-lg shadow-primary/20">
              <span className="hidden sm:inline">{t('button.openApp')}</span>
              <span className="sm:hidden">{t('button.open')}</span>
            </Button>
          </div>
        </div>
      </header>

      {/* HERO — 2-column, less words */}
      <section className="relative py-10 sm:py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            ref={heroRef.ref}
            className={`grid lg:grid-cols-2 gap-10 lg:gap-14 items-center transition-all duration-700 ${
              heroRef.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
          >
            {/* Left - Content */}
            <div className="text-center lg:text-left">
              {/* Beta badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-4">
                <Sparkles className="w-4 h-4" />
                {t('badge.beta')}
              </div>
              
              {/* Headline - shorter */}
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 text-foreground leading-tight">
                {t('landing.hero.headline')}
              </h1>
              
              {/* Subheadline - 1 line */}
              <p className="text-base sm:text-lg text-muted-foreground mb-6 max-w-lg mx-auto lg:mx-0">
                {t('landing.hero.subheadline')}
              </p>
              
              {/* 3 bullet value props */}
              <ul className="space-y-2 mb-6 text-left max-w-lg mx-auto lg:mx-0">
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-foreground">{t('landing.hero.bullet1')}</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-foreground">{t('landing.hero.bullet2')}</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-foreground">{t('landing.hero.bullet3')}</span>
                </li>
              </ul>
              
              {/* CTA row */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mb-5">
                <Button onClick={handleOpenApp} size="lg" className="h-11 px-6 font-semibold rounded-xl shadow-lg shadow-primary/25 hover-lift">
                  <MessageSquare className="w-5 h-5 mr-2" />
                  {t('button.openApp')}
                </Button>
                <Button variant="outline" size="lg" className="h-11 px-6 font-medium rounded-xl" onClick={() => scrollToSection('features')}>
                  {t('landing.hero.seeFeatures')}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
              
              {/* Trust strip */}
              <div className="flex flex-col sm:flex-row items-center gap-2 justify-center lg:justify-start text-sm text-muted-foreground">
                <span>{t('landing.hero.trustLine')}</span>
                <div className="flex gap-1.5">
                  {sourceChips.map((s) => (
                    <span key={s} className="px-2 py-0.5 rounded-full bg-secondary/80 text-xs">{s}</span>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Right - Mockup */}
            <div className="mt-4 lg:mt-0">
              <HeroMockup />
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 1 — Asosiy imkoniyatlar (6 cards) */}
      <section id="features" className="py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div ref={featuresRef.ref} className={`text-center mb-10 transition-all duration-600 ${featuresRef.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            <h2 className="text-2xl sm:text-3xl font-bold mb-3 text-foreground">{t('landing.features.title')}</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">{t('landing.features.subtitle')}</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f, i) => (
              <div
                key={i}
                className={`relative p-5 rounded-2xl glass-premium border border-border/30 hover:shadow-glow transition-all duration-500 ${
                  featuresRef.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
                }`}
                style={{ transitionDelay: `${i * 60}ms` }}
              >
                {f.badge && (
                  <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold">
                    {f.badge}
                  </span>
                )}
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-3">
                  {f.icon}
                </div>
                <h3 className="font-bold text-foreground mb-1">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 2 — Rasm yaratish (AI) */}
      <section id="image-gen" className="py-16 sm:py-20 relative">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div ref={imageGenRef.ref} className={`grid lg:grid-cols-2 gap-10 items-center transition-all duration-700 ${imageGenRef.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
            {/* Content */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium mb-4">
                <ImagePlus className="w-3.5 h-3.5" />
                {t('landing.badge.new')}
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold mb-4 text-foreground">{t('landing.imageGen.title')}</h2>
              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary mt-0.5" />
                  <span className="text-foreground">{t('landing.imageGen.bullet1')}</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary mt-0.5" />
                  <span className="text-foreground">{t('landing.imageGen.bullet2')}</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary mt-0.5" />
                  <span className="text-foreground">{t('landing.imageGen.bullet3')}</span>
                </li>
              </ul>
              <Button onClick={handleOpenApp} className="h-10 px-5 rounded-xl font-medium shadow-lg shadow-primary/20">
                {t('landing.imageGen.cta')}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
            
            {/* Mini gallery */}
            <div className="flex gap-3 justify-center lg:justify-end">
              {imageGallery.map((img, i) => (
                <div
                  key={i}
                  className={`w-24 h-28 sm:w-28 sm:h-32 rounded-xl bg-gradient-to-br from-secondary to-secondary/50 border border-border/40 flex flex-col items-center justify-center transition-all duration-500 ${
                    imageGenRef.isVisible ? "opacity-100 scale-100" : "opacity-0 scale-90"
                  }`}
                  style={{ transitionDelay: `${200 + i * 100}ms` }}
                >
                  <span className="text-2xl mb-1">{img.emoji}</span>
                  <span className="text-xs text-muted-foreground">{img.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3 — Doiralar (Circles) */}
      <section id="circles" className="py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div ref={circlesRef.ref} className={`grid lg:grid-cols-2 gap-10 items-center transition-all duration-700 ${circlesRef.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
            {/* Mockup */}
            <div className={`order-2 lg:order-1 transition-all duration-700 ${circlesRef.isVisible ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}>
              <div className="glass-premium rounded-2xl p-5 border border-border/40 max-w-sm mx-auto">
                <div className="flex items-center gap-2 pb-3 border-b border-border/30 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Users className="w-4 h-4 text-primary" />
                  </div>
                  <span className="font-semibold text-sm text-foreground">{t('landing.circles.mockupTitle')}</span>
                  <span className="ml-auto text-xs text-muted-foreground">5 {t('landing.circles.members')}</span>
                </div>
                <div className="flex gap-1 p-1 rounded-lg bg-secondary/50 mb-3">
                  {['Chat', 'Files', 'AI'].map((tab, i) => (
                    <div key={tab} className={`flex-1 py-1.5 rounded-md text-center text-xs ${i === 0 ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>
                      {tab}
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  {circleOutcomes.map((outcome) => (
                    <span key={outcome} className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                      {outcome}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Content */}
            <div className="order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium mb-4">
                <Users className="w-3.5 h-3.5" />
                {t('landing.circles.badge')}
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold mb-4 text-foreground">{t('landing.circles.title')}</h2>
              <p className="text-muted-foreground mb-4">{t('landing.circles.desc')}</p>
              <p className="text-sm text-muted-foreground mb-2">{t('landing.circles.templates')}</p>
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span className="px-2 py-1 rounded-lg bg-secondary/50">Study</span>
                <span className="px-2 py-1 rounded-lg bg-secondary/50">Work</span>
                <span className="px-2 py-1 rounded-lg bg-secondary/50">Family</span>
                <span className="px-2 py-1 rounded-lg bg-secondary/50">Creator</span>
                <span className="px-2 py-1 rounded-lg bg-secondary/50">Small Biz</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4 — Qanday ishlaydi (4 steps) */}
      <section className="py-16 sm:py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div ref={stepsRef.ref} className={`text-center mb-12 transition-all duration-600 ${stepsRef.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            <h2 className="text-2xl sm:text-3xl font-bold mb-3 text-foreground">{t('section.howItWorks')}</h2>
            <p className="text-muted-foreground">{t('section.howItWorks.subtitle.4steps')}</p>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, i) => (
              <div
                key={i}
                className={`text-center transition-all duration-500 ${stepsRef.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
                style={{ transitionDelay: `${i * 80}ms` }}
              >
                <div className="relative mx-auto mb-4 w-12 h-12">
                  <div className="absolute inset-0 bg-primary/20 rounded-full blur-lg" />
                  <div className="relative w-full h-full rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center">
                    <span className="text-lg font-bold text-primary">{step.number}</span>
                  </div>
                </div>
                <h3 className="font-bold text-foreground mb-1 text-sm">{step.title}</h3>
                <p className="text-xs text-muted-foreground">{step.desc}</p>
              </div>
            ))}
          </div>
          
          {/* Trust sources box */}
          <div className={`mt-12 glass-premium rounded-2xl p-6 border border-border/30 text-center max-w-lg mx-auto transition-all duration-700 ${stepsRef.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`} style={{ transitionDelay: '400ms' }}>
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary mx-auto mb-3">
              <ExternalLink className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-foreground mb-2">{t('trust.title')}</h3>
            <p className="text-sm text-muted-foreground mb-4">{t('trust.description')}</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {sourceChips.map((source) => (
                <span key={source} className="px-3 py-1 rounded-full bg-secondary/80 text-xs text-foreground">
                  {source}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 5 — Narxlar */}
      <section id="pricing" className="py-16 sm:py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div ref={pricingRef.ref} className={`text-center mb-10 transition-all duration-600 ${pricingRef.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            <h2 className="text-2xl sm:text-3xl font-bold mb-3 text-foreground">{t('section.pricing')}</h2>
            <p className="text-muted-foreground">{t('section.pricing.subtitle')}</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {pricingPlans.map((plan, i) => (
              <div
                key={i}
                className={`relative p-6 rounded-2xl transition-all duration-500 border ${
                  plan.highlighted ? "glass-premium border-primary/40 shadow-glow scale-[1.02]" : "glass-premium border-border/30"
                } ${pricingRef.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
                style={{ transitionDelay: `${i * 80}ms` }}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                      {plan.badge}
                    </span>
                  </div>
                )}
                <div className="mb-4 pt-2">
                  <h3 className="font-bold text-foreground mb-3">{plan.name}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                    <span className="text-sm text-muted-foreground">{t('pricing.currency')}</span>
                  </div>
                </div>
                <ul className="space-y-2 mb-5">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary mt-0.5" />
                      <span className="text-foreground">{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className={`w-full h-10 rounded-xl font-medium ${plan.highlighted ? "shadow-lg shadow-primary/25" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}
                  disabled={plan.action === "soon"}
                  onClick={() => plan.action === "start" && handleOpenApp()}
                >
                  {plan.cta}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 6 — FAQ */}
      <section id="faq" className="py-16 sm:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div ref={faqRef.ref} className={`text-center mb-10 transition-all duration-600 ${faqRef.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            <h2 className="text-2xl sm:text-3xl font-bold mb-3 text-foreground">{t('section.faq')}</h2>
            <p className="text-muted-foreground">{t('section.faq.subtitle')}</p>
          </div>
          
          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((faq, i) => (
              <AccordionItem
                key={i}
                value={`item-${i}`}
                className={`border-0 rounded-xl overflow-hidden glass-premium border border-border/30 transition-all duration-500 ${faqRef.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
                style={{ transitionDelay: `${i * 50}ms` }}
              >
                <AccordionTrigger className="text-sm font-semibold px-5 py-4 hover:no-underline text-foreground hover:text-primary text-left">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground px-5 pb-4 text-sm">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* FOOTER */}
      <AppFooter />
    </div>
  );
}
