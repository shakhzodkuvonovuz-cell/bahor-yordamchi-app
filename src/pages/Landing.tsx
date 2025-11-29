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
} from "lucide-react";
import bahorLogo from "@/assets/bahor-logo.png";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useTranslation } from "@/i18n/LanguageProvider";
import LanguageSwitcher from "@/components/LanguageSwitcher";

// Chat mockup component for hero
function ChatMockup() {
  const { t } = useTranslation();
  
  return (
    <div className="relative w-full max-w-md mx-auto">
      {/* Glow effect behind */}
      <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-75 translate-y-4" />
      
      {/* Main card */}
      <div className="relative glass-premium rounded-3xl p-4 shadow-glow-lg animate-float">
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
      icon: <Globe className="w-5 h-5" />,
      title: t('feature.uzbekOptimized.title'),
      description: t('feature.uzbekOptimized.desc'),
    },
    {
      icon: <DollarSign className="w-5 h-5" />,
      title: t('feature.affordable.title'),
      description: t('feature.affordable.desc'),
    },
    {
      icon: <Target className="w-5 h-5" />,
      title: t('feature.specializedModes.title'),
      description: t('feature.specializedModes.desc'),
    },
  ];

  const modes = [
    { id: "ielts", icon: <BookOpen className="w-6 h-6" />, title: t('mode.english.title'), description: t('mode.english.desc') },
    { id: "homework", icon: <GraduationCap className="w-6 h-6" />, title: t('mode.homework.title'), description: t('mode.homework.desc') },
    { id: "tech", icon: <Code2 className="w-6 h-6" />, title: t('mode.tech.title'), description: t('mode.tech.desc') },
    { id: "daily", icon: <Home className="w-6 h-6" />, title: t('mode.life.title'), description: t('mode.life.desc') },
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
    <div className="min-h-screen bg-background relative">
      {/* Animated background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-primary/3 rounded-full blur-[80px]" />
      </div>
      
      {/* Header */}
      <header className="glass-strong sticky top-0 z-50 border-b border-border/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img 
              src={bahorLogo} 
              alt="Bahor AI" 
              className="h-9 w-auto sm:h-10 object-contain" 
            />
            <span className="text-xl sm:text-2xl font-bold text-foreground">
              Bahor AI
            </span>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher variant="pill" />
            <Button 
              onClick={() => navigate("/modes")} 
              size="sm"
              className="h-9 px-5 rounded-xl font-medium shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all"
            >
              {t('button.openApp')}
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section - Two Column */}
      <section className="relative py-16 sm:py-24 lg:py-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            ref={heroRef.ref}
            className={`grid lg:grid-cols-2 gap-12 lg:gap-16 items-center transition-all duration-700 ease-out ${
              heroRef.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
          >
            {/* Left - Content */}
            <div className="text-center lg:text-left order-2 lg:order-1">
              {/* Beta badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6 animate-badge-pulse">
                <Sparkles className="w-4 h-4" />
                {t('badge.beta')}
              </div>
              
              <h1 className="text-display-md sm:text-display-lg lg:text-display-xl font-bold mb-6 text-foreground leading-tight">
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
            
            {/* Right - Product Preview */}
            <div className="order-1 lg:order-2">
              <ChatMockup />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - 3 Column Grid */}
      <section id="features" className="py-20 sm:py-28 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div 
            ref={featuresRef.ref}
            className={`text-center mb-14 transition-all duration-600 ease-out ${
              featuresRef.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            <h2 className="text-display-sm sm:text-display-md font-bold mb-4 text-foreground">{t('section.whyChoose')}</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {t('section.whyChoose.subtitle')}
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className={`group relative p-8 rounded-3xl glass-premium hover:shadow-glow hover-lift transition-all duration-500 ${
                  featuresRef.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
                }`}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-6 group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-bold mb-3 text-foreground">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Modes Section */}
      <section className="py-20 sm:py-28 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div 
            ref={modesRef.ref}
            className={`text-center mb-14 transition-all duration-600 ease-out ${
              modesRef.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            <h2 className="text-display-sm sm:text-display-md font-bold mb-4 text-foreground">{t('section.exploreModes')}</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {t('section.exploreModes.subtitle')}
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
            {modes.map((mode, index) => (
              <button
                key={mode.id}
                className={`group text-left p-6 rounded-2xl glass-premium hover:shadow-glow hover:border-primary/30 cursor-pointer transition-all duration-300 hover-scale ${
                  modesRef.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
                }`}
                style={{ transitionDelay: `${index * 80}ms` }}
                onClick={() => navigate(`/chat/${mode.id}`)}
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                  {mode.icon}
                </div>
                <h3 className="font-bold text-foreground mb-2">{mode.title}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">{mode.description}</p>
              </button>
            ))}
          </div>
          
          <div className="text-center">
            <Button
              onClick={() => navigate("/modes")}
              size="lg"
              className="h-12 px-8 text-base font-semibold rounded-xl shadow-lg shadow-primary/20 transition-all hover-lift"
            >
              {t('button.startUsing')}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* Built for Uzbekistan Band */}
      <section className="py-20 sm:py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5" />
        <div className="absolute inset-0 pattern-uzbek opacity-30" />
        
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
          <h2 className="text-display-sm sm:text-display-md font-bold mb-6 text-foreground">
            {t('builtFor.title')}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {t('builtFor.description')}
          </p>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 sm:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div 
            ref={stepsRef.ref}
            className={`text-center mb-14 transition-all duration-600 ease-out ${
              stepsRef.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            <h2 className="text-display-sm sm:text-display-md font-bold mb-4 text-foreground">{t('section.howItWorks')}</h2>
            <p className="text-muted-foreground text-lg">
              {t('section.howItWorks.subtitle')}
            </p>
          </div>
          
          <div className="relative">
            {/* Connection line */}
            <div className="hidden md:block absolute top-12 left-[20%] right-[20%] h-0.5 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              {steps.map((step, index) => (
                <div 
                  key={index}
                  className={`text-center relative transition-all duration-500 ease-out ${
                    stepsRef.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
                  }`}
                  style={{ transitionDelay: `${index * 120}ms` }}
                >
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary text-2xl font-bold flex items-center justify-center mx-auto mb-5 border-2 border-background shadow-glow relative z-10">
                    {step.number}
                  </div>
                  <h3 className="text-lg font-bold mb-2 text-foreground">{step.title}</h3>
                  <p className="text-muted-foreground leading-relaxed max-w-[280px] mx-auto">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div 
            ref={pricingRef.ref}
            className={`text-center mb-14 transition-all duration-600 ease-out ${
              pricingRef.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            <h2 className="text-display-sm sm:text-display-md font-bold mb-4 text-foreground">{t('section.pricing')}</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              {t('section.pricing.subtitle')}
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <div 
                key={index}
                className={`relative p-7 rounded-3xl transition-all duration-500 ${
                  plan.highlighted 
                    ? "glass-premium border-primary/40 shadow-glow scale-[1.02]" 
                    : "glass-premium"
                } ${
                  pricingRef.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
                }`}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-4 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold shadow-lg">
                      {plan.badge}
                    </span>
                  </div>
                )}
                
                <div className="mb-6">
                  <h3 className="text-xl font-bold mb-2 text-foreground">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                    <span className="text-sm text-muted-foreground">{t('pricing.currency')}</span>
                  </div>
                </div>
                
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm">
                      <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Button 
                  className={`w-full h-11 rounded-xl font-semibold ${
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

      {/* FAQ Section */}
      <section className="py-20 sm:py-28">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div 
            ref={faqRef.ref}
            className={`text-center mb-12 transition-all duration-600 ease-out ${
              faqRef.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            <h2 className="text-display-sm sm:text-display-md font-bold mb-4 text-foreground">{t('section.faq')}</h2>
            <p className="text-muted-foreground text-lg">
              {t('section.faq.subtitle')}
            </p>
          </div>
          
          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className={`border-0 rounded-2xl overflow-hidden glass-premium transition-all duration-500 ${
                  faqRef.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                }`}
                style={{ transitionDelay: `${index * 80}ms` }}
              >
                <AccordionTrigger className="text-base font-semibold px-6 py-5 hover:no-underline text-foreground hover:text-primary transition-colors">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground px-6 pb-5 leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 border-t border-border/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <img src={bahorLogo} alt="Bahor AI" className="h-8 w-auto" />
              <span className="text-lg font-bold text-foreground">Bahor AI</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {t('footer.rights')}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}