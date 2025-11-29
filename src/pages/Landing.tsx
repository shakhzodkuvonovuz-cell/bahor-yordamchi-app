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
} from "lucide-react";
import bahorLogo from "@/assets/bahor-logo.png";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useTranslation } from "@/i18n/LanguageProvider";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default function Landing() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  const heroRef = useScrollAnimation({ threshold: 0.2 });
  const featuresRef = useScrollAnimation({ threshold: 0.1 });
  const modesRef = useScrollAnimation({ threshold: 0.1 });
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
      icon: <Target className="w-5 h-5" />,
      title: t('feature.specializedModes.title'),
      description: t('feature.specializedModes.desc'),
    },
    {
      icon: <Zap className="w-5 h-5" />,
      title: t('feature.fastSimple.title'),
      description: t('feature.fastSimple.desc'),
    },
    {
      icon: <Sparkles className="w-5 h-5" />,
      title: t('feature.futurePlans.title'),
      description: t('feature.futurePlans.desc'),
    },
  ];

  const modes = [
    { icon: <Code2 className="w-5 h-5" />, title: t('mode.tech.title'), description: t('mode.tech.desc') },
    { icon: <Home className="w-5 h-5" />, title: t('mode.life.title'), description: t('mode.life.desc') },
    { icon: <Briefcase className="w-5 h-5" />, title: t('mode.business.title'), description: t('mode.business.desc') },
    { icon: <BookOpen className="w-5 h-5" />, title: t('mode.english.title'), description: t('mode.english.desc') },
    { icon: <GraduationCap className="w-5 h-5" />, title: t('mode.homework.title'), description: t('mode.homework.desc') },
    { icon: <Briefcase className="w-5 h-5" />, title: t('mode.job.title'), description: t('mode.job.desc') },
    { icon: <DollarSign className="w-5 h-5" />, title: t('mode.finance.title'), description: t('mode.finance.desc') },
    { icon: <Heart className="w-5 h-5" />, title: t('mode.health.title'), description: t('mode.health.desc') },
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="glass-strong sticky top-0 z-50 border-b border-border/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img 
              src={bahorLogo} 
              alt="Bahor AI" 
              className="h-9 w-auto sm:h-10 object-contain" 
            />
            <span className="text-xl sm:text-2xl font-semibold text-foreground">
              Bahor AI
            </span>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher variant="pill" />
            <Button 
              onClick={() => navigate("/modes")} 
              size="sm"
              className="h-9 px-5 rounded-xl font-medium shadow-sm hover:shadow-md hover:glow-primary transition-all"
            >
              {t('button.openApp')}
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-16 sm:py-24 md:py-32 overflow-hidden">
        {/* Subtle gradient orb */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        
        <div
          ref={heroRef.ref}
          className={`max-w-4xl mx-auto px-4 sm:px-6 text-center relative transition-all duration-700 ease-out ${
            heroRef.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6 sm:mb-8">
            <Sparkles className="w-3.5 h-3.5" />
            {t('badge.beta')}
          </div>
          
          <h1 className="text-display-md sm:text-display-lg md:text-display-xl font-bold mb-4 sm:mb-6 text-foreground leading-tight">
            {t('app.tagline.main').split('—')[0]}— <br className="hidden sm:block" />
            <span className="text-gradient-primary">{t('app.tagline.main').split('—')[1]?.trim() || "o'zbeklar uchun."}</span>
          </h1>
          
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-8 sm:mb-10 max-w-2xl mx-auto leading-relaxed">
            {t('app.tagline.sub')}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Button
              onClick={() => navigate("/modes")}
              size="lg"
              className="w-full sm:w-auto min-w-[200px] h-12 px-6 text-base font-medium shadow-lg hover:shadow-xl glow-primary hover:glow-primary-strong transition-all rounded-xl"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              {t('button.openApp')}
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto min-w-[200px] h-12 px-6 text-base font-medium rounded-xl border-border/60 hover:bg-secondary/50 transition-all"
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
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 sm:py-20 border-t border-border/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div 
            ref={featuresRef.ref}
            className={`text-center mb-10 sm:mb-14 transition-all duration-600 ease-out ${
              featuresRef.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            <h2 className="text-display-sm sm:text-display-md font-bold mb-3 text-foreground">{t('section.whyChoose')}</h2>
            <p className="text-muted-foreground text-base sm:text-lg">
              {t('section.whyChoose.subtitle')}
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            {features.map((feature, index) => (
              <div
                key={index}
                className={`group p-5 sm:p-6 rounded-2xl bg-card border border-border/50 hover:border-primary/30 hover:shadow-premium-lg hover-lift transition-all duration-300 ${
                  featuresRef.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
                }`}
                style={{ transitionDelay: `${index * 80}ms` }}
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0 group-hover:bg-primary/15 transition-colors">
                    {feature.icon}
                  </div>
                  <div>
                    <h3 className="text-base font-semibold mb-1.5 text-foreground">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Modes Section */}
      <section className="py-16 sm:py-20 border-t border-border/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div 
            ref={modesRef.ref}
            className={`text-center mb-10 sm:mb-14 transition-all duration-600 ease-out ${
              modesRef.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            <h2 className="text-display-sm sm:text-display-md font-bold mb-3 text-foreground">{t('section.exploreModes')}</h2>
            <p className="text-muted-foreground text-base sm:text-lg">
              {t('section.exploreModes.subtitle')}
            </p>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8 sm:mb-10">
            {modes.map((mode, index) => (
              <div
                key={index}
                className={`group p-4 sm:p-5 rounded-2xl bg-card border border-border/50 hover:border-primary/30 hover:shadow-premium-md cursor-pointer transition-all duration-300 ${
                  modesRef.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
                }`}
                style={{ transitionDelay: `${index * 50}ms` }}
                onClick={() => navigate("/modes")}
              >
                <div className="flex flex-col items-center text-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-secondary flex items-center justify-center text-primary group-hover:bg-primary/10 transition-colors">
                    {mode.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm mb-1 text-foreground">{mode.title}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{mode.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="text-center">
            <Button
              onClick={() => navigate("/modes")}
              size="lg"
              className="h-11 px-6 text-base font-medium shadow-md hover:shadow-lg rounded-xl transition-all"
            >
              {t('button.startUsing')}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 sm:py-20 border-t border-border/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div 
            ref={stepsRef.ref}
            className={`text-center mb-10 sm:mb-14 transition-all duration-600 ease-out ${
              stepsRef.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            <h2 className="text-display-sm sm:text-display-md font-bold mb-3 text-foreground">{t('section.howItWorks')}</h2>
            <p className="text-muted-foreground text-base sm:text-lg">
              {t('section.howItWorks.subtitle')}
            </p>
          </div>
          
          <div className="relative">
            {/* Connection line */}
            <div className="hidden md:block absolute top-8 left-[20%] right-[20%] h-px bg-gradient-to-r from-transparent via-border to-transparent" />
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-10">
              {steps.map((step, index) => (
                <div 
                  key={index}
                  className={`text-center relative transition-all duration-500 ease-out ${
                    stepsRef.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
                  }`}
                  style={{ transitionDelay: `${index * 120}ms` }}
                >
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary text-xl font-bold flex items-center justify-center mx-auto mb-4 border-2 border-background shadow-premium-md relative z-10">
                    {step.number}
                  </div>
                  <h3 className="text-base font-semibold mb-2 text-foreground">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed max-w-[250px] mx-auto">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-16 sm:py-20 border-t border-border/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div 
            ref={pricingRef.ref}
            className={`text-center mb-10 sm:mb-14 transition-all duration-600 ease-out ${
              pricingRef.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            <h2 className="text-display-sm sm:text-display-md font-bold mb-3 text-foreground">{t('section.pricing')}</h2>
            <p className="text-muted-foreground text-base sm:text-lg max-w-xl mx-auto">
              {t('section.pricing.subtitle')}
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 max-w-5xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <div 
                key={index}
                className={`relative p-5 sm:p-6 rounded-2xl border transition-all duration-500 ${
                  plan.highlighted 
                    ? "bg-card border-primary/50 shadow-lg shadow-primary/10" 
                    : "bg-card border-border/50"
                } ${
                  pricingRef.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
                }`}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                      {plan.badge}
                    </span>
                  </div>
                )}
                
                <div className="mb-5">
                  <h3 className="text-lg font-bold mb-1 text-foreground">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground mb-3">{plan.description}</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                    <span className="text-sm text-muted-foreground">{t('pricing.currency')}</span>
                  </div>
                </div>
                
                <ul className="space-y-2.5 mb-6">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Button 
                  className={`w-full h-10 rounded-xl font-medium ${
                    plan.highlighted 
                      ? "" 
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
      <section className="py-16 sm:py-20 border-t border-border/30">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div 
            ref={faqRef.ref}
            className={`text-center mb-10 sm:mb-12 transition-all duration-600 ease-out ${
              faqRef.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            <h2 className="text-display-sm sm:text-display-md font-bold mb-3 text-foreground">{t('section.faq')}</h2>
            <p className="text-muted-foreground text-base sm:text-lg">
              {t('section.faq.subtitle')}
            </p>
          </div>
          
          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className={`border border-border/50 rounded-xl px-5 overflow-hidden bg-card transition-all duration-500 ${
                  faqRef.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                }`}
                style={{ transitionDelay: `${index * 80}ms` }}
              >
                <AccordionTrigger className="text-sm sm:text-base font-medium py-4 hover:no-underline text-foreground">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground pb-4 leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <img src={bahorLogo} alt="Bahor AI" className="h-7 w-auto" />
              <span className="text-lg font-semibold text-foreground">Bahor AI</span>
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
