import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
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
  DollarSign,
  Heart,
  GraduationCap,
  Home,
  Globe,
  Zap,
  Target,
  Sparkles,
  MessageSquare,
  ArrowRight,
  Check,
  Send,
  Wallet,
} from "lucide-react";
import bahorLogo from "@/assets/bahor-logo.png";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useTranslation } from "@/i18n/LanguageProvider";
import LanguageSwitcher from "@/components/LanguageSwitcher";

// Chat mockup component for hero - NO BLUR
function ChatMockup() {
  const { t } = useTranslation();
  
  return (
    <div className="relative w-full max-w-md mx-auto">
      {/* Glow effect behind - softer, no blur on content */}
      <div className="absolute inset-0 bg-primary/15 rounded-full scale-90 translate-y-8 blur-3xl" />
      
      {/* Main card - sharp, no blur */}
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
          
          {/* AI message */}
          <div className="flex justify-start">
            <div className="bg-card border border-border/50 px-4 py-2.5 rounded-2xl rounded-tl-md max-w-[85%]">
              <p className="text-sm text-card-foreground">{t('mockup.aiMessage')}</p>
            </div>
          </div>
          
          {/* Typing indicator */}
          <div className="flex justify-start">
            <div className="bg-card border border-border/50 px-4 py-3 rounded-2xl rounded-tl-md">
              <div className="flex gap-1.5">
                <span className="w-2 h-2 rounded-full bg-primary typing-dot" />
                <span className="w-2 h-2 rounded-full bg-primary typing-dot" />
                <span className="w-2 h-2 rounded-full bg-primary typing-dot" />
              </div>
            </div>
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
  
  const heroRef = useScrollAnimation({ threshold: 0.2 });
  const featuresRef = useScrollAnimation({ threshold: 0.1 });
  const modesRef = useScrollAnimation({ threshold: 0.1 });
  const builtForRef = useScrollAnimation({ threshold: 0.1 });
  const stepsRef = useScrollAnimation({ threshold: 0.1 });
  const pricingRef = useScrollAnimation({ threshold: 0.1 });
  const faqRef = useScrollAnimation({ threshold: 0.1 });

  const features = [
    {
      icon: <Globe className="w-6 h-6" />,
      title: t('feature.uzbekOptimized.title'),
      description: t('feature.uzbekOptimized.desc'),
    },
    {
      icon: <DollarSign className="w-6 h-6" />,
      title: t('feature.affordable.title'),
      description: t('feature.affordable.desc'),
    },
    {
      icon: <Target className="w-6 h-6" />,
      title: t('feature.specializedModes.title'),
      description: t('feature.specializedModes.desc'),
    },
  ];

  // ALL 8 MODES with icons
  const allModes = [
    { id: "general", icon: <MessageSquare className="w-6 h-6" />, title: t('mode.general.title'), description: t('mode.general.desc') },
    { id: "tech", icon: <Code2 className="w-6 h-6" />, title: t('mode.tech.title'), description: t('mode.tech.desc') },
    { id: "daily", icon: <Home className="w-6 h-6" />, title: t('mode.life.title'), description: t('mode.life.desc') },
    { id: "business", icon: <Briefcase className="w-6 h-6" />, title: t('mode.business.title'), description: t('mode.business.desc') },
    { id: "ielts", icon: <BookOpen className="w-6 h-6" />, title: t('mode.english.title'), description: t('mode.english.desc') },
    { id: "homework", icon: <GraduationCap className="w-6 h-6" />, title: t('mode.homework.title'), description: t('mode.homework.desc') },
    { id: "job", icon: <Briefcase className="w-6 h-6" />, title: t('mode.job.title'), description: t('mode.job.desc') },
    { id: "financial", icon: <Wallet className="w-6 h-6" />, title: t('mode.finance.title'), description: t('mode.finance.desc') },
  ];

  const steps = [
    { number: "1", title: t('step.1.title'), description: t('step.1.desc') },
    { number: "2", title: t('step.2.title'), description: t('step.2.desc') },
    { number: "3", title: t('step.3.title'), description: t('step.3.desc') },
  ];

  const faqs = [
    { question: t('faq.1.question'), answer: t('faq.1.answer') },
    { question: t('faq.2.question'), answer: t('faq.2.answer') },
    { question: t('faq.3.question'), answer: t('faq.3.answer') },
    { question: t('faq.4.question'), answer: t('faq.4.answer') },
  ];

  const pricingPlans = [
    {
      name: t('pricing.free.name'),
      price: "0",
      description: t('pricing.free.desc'),
      features: [t('pricing.free.feature1'), t('pricing.free.feature2'), t('pricing.free.feature3')],
      cta: t('button.start'),
      ctaAction: "start",
      highlighted: false,
    },
    {
      name: t('pricing.monthly.name'),
      price: "49,000",
      description: t('pricing.monthly.desc'),
      features: [t('pricing.monthly.feature1'), t('pricing.monthly.feature2'), t('pricing.monthly.feature3'), t('pricing.monthly.feature4')],
      cta: t('button.comingSoon'),
      ctaAction: "soon",
      highlighted: true,
      badge: t('pricing.monthly.badge'),
    },
    {
      name: t('pricing.yearly.name'),
      price: "340,000",
      description: t('pricing.yearly.desc'),
      features: [t('pricing.yearly.feature1'), t('pricing.yearly.feature2'), t('pricing.yearly.feature3')],
      cta: t('button.comingSoon'),
      ctaAction: "soon",
      highlighted: false,
      badge: t('pricing.yearly.badge'),
    },
  ];

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden">
      {/* Unified animated background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute top-1/3 right-0 w-[500px] h-[500px] bg-primary/4 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 left-0 w-[400px] h-[400px] bg-primary/3 rounded-full blur-[80px]" />
      </div>
      
      {/* Header */}
      <header className="glass-strong sticky top-0 z-50 border-b border-border/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img 
              src={bahorLogo} 
              alt="Bahor AI" 
              className="h-8 sm:h-10 w-auto object-contain" 
            />
            <span className="text-lg sm:text-xl font-bold text-foreground">
              Bahor AI
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageSwitcher variant="pill" />
            <Button 
              onClick={() => navigate("/modes")} 
              size="sm"
              className="h-9 px-4 sm:px-5 rounded-xl font-medium shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all text-sm"
            >
              <span className="hidden sm:inline">{t('button.openApp')}</span>
              <span className="sm:hidden">{t('button.open')}</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section - Mobile: text first, mockup second */}
      <section className="relative py-12 sm:py-20 lg:py-28 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            ref={heroRef.ref}
            className={`grid lg:grid-cols-2 gap-10 lg:gap-16 items-center transition-all duration-700 ease-out ${
              heroRef.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
          >
            {/* Left - Content (always first on mobile) */}
            <div className="text-center lg:text-left">
              {/* Beta badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6 animate-badge-pulse">
                <Sparkles className="w-4 h-4" />
                {t('badge.beta')}
              </div>
              
              <h1 className="text-3xl sm:text-4xl lg:text-display-lg font-bold mb-5 text-foreground leading-tight">
                {t('app.tagline.main').split('—')[0]}—{' '}
                <span className="text-gradient-primary">{t('app.tagline.main').split('—')[1]?.trim() || "o'zbeklar uchun."}</span>
              </h1>
              
              <p className="text-base sm:text-lg text-muted-foreground mb-8 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                {t('app.tagline.sub')}
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                <Button
                  onClick={() => navigate("/modes")}
                  size="lg"
                  className="h-12 px-8 text-base font-semibold rounded-xl shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/35 transition-all hover-lift"
                >
                  <MessageSquare className="w-5 h-5 mr-2" />
                  {t('button.openApp')}
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="h-12 px-8 text-base font-medium rounded-xl border-border/60 hover:bg-secondary/50 transition-all"
                  onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  {t('button.learnMore')}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
              
              <p className="text-sm text-muted-foreground mt-6">
                {t('label.freeDuringBeta')}
              </p>
            </div>
            
            {/* Right - Product Preview (always second on mobile) */}
            <div className="mt-8 lg:mt-0">
              <ChatMockup />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - Consistent cards */}
      <section id="features" className="py-16 sm:py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div 
            ref={featuresRef.ref}
            className={`text-center mb-12 transition-all duration-600 ease-out ${
              featuresRef.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            <h2 className="text-2xl sm:text-3xl lg:text-display-md font-bold mb-4 text-foreground">{t('section.whyChoose')}</h2>
            <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto">
              {t('section.whyChoose.subtitle')}
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className={`group relative p-6 lg:p-8 rounded-2xl glass-premium hover:shadow-glow hover-lift transition-all duration-500 border border-border/30 ${
                  featuresRef.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
                }`}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-5 group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-bold mb-3 text-foreground">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed text-sm lg:text-base">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Modes Section - ALL 8 MODES */}
      <section className="py-16 sm:py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div 
            ref={modesRef.ref}
            className={`text-center mb-12 transition-all duration-600 ease-out ${
              modesRef.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            <h2 className="text-2xl sm:text-3xl lg:text-display-md font-bold mb-4 text-foreground">{t('section.exploreModes')}</h2>
            <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto">
              {t('section.exploreModes.subtitle')}
            </p>
          </div>
          
          {/* 8 mode cards - responsive grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5 mb-10">
            {allModes.map((mode, index) => (
              <button
                key={mode.id}
                className={`group text-left p-5 lg:p-6 rounded-2xl glass-premium hover:shadow-glow hover:border-primary/30 cursor-pointer transition-all duration-300 hover-scale border border-border/30 ${
                  modesRef.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
                }`}
                style={{ transitionDelay: `${index * 60}ms` }}
                onClick={() => navigate(`/chat/${mode.id}`)}
              >
                <div className="w-11 h-11 lg:w-12 lg:h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                  {mode.icon}
                </div>
                <h3 className="font-bold text-foreground mb-2 text-sm lg:text-base">{mode.title}</h3>
                <p className="text-xs lg:text-sm text-muted-foreground line-clamp-2 leading-relaxed">{mode.description}</p>
              </button>
            ))}
          </div>
          
          <div className="text-center">
            <Button
              onClick={() => navigate("/modes")}
              size="lg"
              className="h-11 lg:h-12 px-6 lg:px-8 text-sm lg:text-base font-semibold rounded-xl shadow-lg shadow-primary/20 transition-all hover-lift"
            >
              {t('button.startUsing')}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* Built for Uzbekistan Band */}
      <section className="py-16 sm:py-20 relative overflow-hidden">
        <div className="absolute inset-0 pattern-uzbek opacity-10" />
        
        <div 
          ref={builtForRef.ref}
          className={`max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 transition-all duration-600 ease-out ${
            builtForRef.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <Globe className="w-4 h-4" />
            {t('builtFor.badge')}
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-display-md font-bold mb-5 text-foreground">
            {t('builtFor.title')}
          </h2>
          <p className="text-base lg:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {t('builtFor.description')}
          </p>
        </div>
      </section>

      {/* How It Works Section - Premium flow */}
      <section className="py-16 sm:py-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div 
            ref={stepsRef.ref}
            className={`text-center mb-12 lg:mb-16 transition-all duration-600 ease-out ${
              stepsRef.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            <h2 className="text-2xl sm:text-3xl lg:text-display-md font-bold mb-4 text-foreground">{t('section.howItWorks')}</h2>
            <p className="text-muted-foreground text-base sm:text-lg">
              {t('section.howItWorks.subtitle')}
            </p>
          </div>
          
          <div className="relative">
            {/* Curved connection line - hidden on mobile */}
            <div className="hidden md:block absolute top-14 left-[15%] right-[15%] h-1">
              <svg className="w-full h-16" viewBox="0 0 800 60" fill="none" preserveAspectRatio="none">
                <path 
                  d="M0,30 Q200,0 400,30 T800,30" 
                  stroke="url(#gradient)" 
                  strokeWidth="2" 
                  fill="none"
                  strokeDasharray="8,8"
                  className="opacity-40"
                />
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                    <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity="1" />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-10">
              {steps.map((step, index) => (
                <div 
                  key={index}
                  className={`text-center relative transition-all duration-500 ease-out ${
                    stepsRef.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
                  }`}
                  style={{ transitionDelay: `${index * 120}ms` }}
                >
                  {/* Glowing circle number */}
                  <div className="relative mx-auto mb-6 w-16 h-16 lg:w-20 lg:h-20">
                    <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse-glow" />
                    <div className="relative w-full h-full rounded-full bg-gradient-to-br from-primary/20 to-primary/10 border-2 border-primary/30 flex items-center justify-center shadow-glow">
                      <span className="text-xl lg:text-2xl font-bold text-primary">{step.number}</span>
                    </div>
                  </div>
                  <h3 className="text-base lg:text-lg font-bold mb-2 text-foreground">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed max-w-[260px] mx-auto">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section - Polished with ChatGPT comparison */}
      <section className="py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div 
            ref={pricingRef.ref}
            className={`text-center mb-10 lg:mb-14 transition-all duration-600 ease-out ${
              pricingRef.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            <h2 className="text-2xl sm:text-3xl lg:text-display-md font-bold mb-4 text-foreground">{t('section.pricing')}</h2>
            <p className="text-muted-foreground text-base sm:text-lg max-w-xl mx-auto mb-4">
              {t('section.pricing.subtitle')}
            </p>
            {/* ChatGPT comparison line */}
            <p className="text-sm text-primary font-medium">
              {t('pricing.comparison')}
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6 max-w-5xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <div 
                key={index}
                className={`relative p-6 lg:p-7 rounded-2xl transition-all duration-500 border ${
                  plan.highlighted 
                    ? "glass-premium border-primary/40 shadow-glow scale-[1.02]" 
                    : "glass-premium border-border/30 hover:border-primary/20 hover:shadow-glow"
                } ${
                  pricingRef.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
                }`}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-4 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold shadow-lg whitespace-nowrap">
                      {plan.badge}
                    </span>
                  </div>
                )}
                
                <div className="mb-5 pt-2">
                  <h3 className="text-lg lg:text-xl font-bold mb-2 text-foreground">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl lg:text-4xl font-bold text-foreground">{plan.price}</span>
                    <span className="text-sm text-muted-foreground">{t('pricing.currency')}</span>
                  </div>
                </div>
                
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm">
                      <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Button 
                  className={`w-full h-10 lg:h-11 rounded-xl font-semibold text-sm ${
                    plan.highlighted 
                      ? "shadow-lg shadow-primary/25" 
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  }`}
                  disabled={plan.ctaAction === "soon"}
                  onClick={() => plan.ctaAction === "start" && navigate("/modes")}
                >
                  {plan.cta}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section - Consistent styling */}
      <section className="py-16 sm:py-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div 
            ref={faqRef.ref}
            className={`text-center mb-10 lg:mb-12 transition-all duration-600 ease-out ${
              faqRef.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            <h2 className="text-2xl sm:text-3xl lg:text-display-md font-bold mb-4 text-foreground">{t('section.faq')}</h2>
            <p className="text-muted-foreground text-base sm:text-lg">
              {t('section.faq.subtitle')}
            </p>
          </div>
          
          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className={`border-0 rounded-2xl overflow-hidden glass-premium border border-border/30 transition-all duration-500 ${
                  faqRef.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                }`}
                style={{ transitionDelay: `${index * 80}ms` }}
              >
                <AccordionTrigger className="text-sm lg:text-base font-semibold px-5 lg:px-6 py-4 lg:py-5 hover:no-underline text-foreground hover:text-primary transition-colors text-left">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground px-5 lg:px-6 pb-4 lg:pb-5 leading-relaxed text-sm">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 lg:py-10 border-t border-border/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <img src={bahorLogo} alt="Bahor AI" className="h-7 lg:h-8 w-auto" />
              <span className="text-base lg:text-lg font-bold text-foreground">Bahor AI</span>
            </div>
            <p className="text-xs lg:text-sm text-muted-foreground">
              {t('footer.rights')}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
