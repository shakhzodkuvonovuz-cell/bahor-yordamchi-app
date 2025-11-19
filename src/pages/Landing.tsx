import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
} from "lucide-react";
import bahorLogo from "@/assets/bahor-logo.png";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

export default function Landing() {
  const navigate = useNavigate();
  
  // Scroll animations
  const heroRef = useScrollAnimation({ threshold: 0.2 });
  const featuresRef = useScrollAnimation({ threshold: 0.1 });
  const modesRef = useScrollAnimation({ threshold: 0.1 });
  const stepsRef = useScrollAnimation({ threshold: 0.1 });
  const pricingRef = useScrollAnimation({ threshold: 0.1 });
  const faqRef = useScrollAnimation({ threshold: 0.1 });

  const features = [
    {
      icon: <Globe className="w-6 h-6" />,
      title: "Optimized for Uzbek language",
      description: "Understands Uzbek slang, natural phrasing, and real-life context.",
    },
    {
      icon: <Target className="w-6 h-6" />,
      title: "Specialized modes",
      description: "Coding, IELTS, business, marketing, homework help, and more.",
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: "Fast, simple, intuitive",
      description: "No complicated menus. Just ask and get instant help.",
    },
    {
      icon: <Sparkles className="w-6 h-6" />,
      title: "Future premium plans",
      description: "Currently free in beta. Paid plans will launch soon with additional features.",
    },
  ];

  const modes = [
    {
      icon: <Code2 className="w-6 h-6" />,
      title: "Technology & Coding",
      description: "Get help with programming, debugging, and technical questions.",
    },
    {
      icon: <Home className="w-6 h-6" />,
      title: "Life Assistance",
      description: "Practical advice for everyday life, recipes, and daily tasks.",
    },
    {
      icon: <Briefcase className="w-6 h-6" />,
      title: "Business & Marketing",
      description: "Strategic guidance for business growth and marketing campaigns.",
    },
    {
      icon: <BookOpen className="w-6 h-6" />,
      title: "English & IELTS",
      description: "Improve your English skills and prepare for IELTS exams.",
    },
    {
      icon: <GraduationCap className="w-6 h-6" />,
      title: "Homework & Subjects",
      description: "Get help with school assignments and academic subjects.",
    },
    {
      icon: <Briefcase className="w-6 h-6" />,
      title: "Job & Resume",
      description: "Build professional resumes and prepare for job interviews.",
    },
    {
      icon: <DollarSign className="w-6 h-6" />,
      title: "Financial Literacy",
      description: "Learn about budgeting, saving, and financial planning.",
    },
    {
      icon: <Heart className="w-6 h-6" />,
      title: "Health & Fitness",
      description: "Get advice on wellness, nutrition, and healthy living.",
    },
  ];

  const steps = [
    {
      number: "1",
      title: "Ask anything",
      description: "From school assignments to recipes to coding help.",
    },
    {
      number: "2",
      title: "Choose a mode (optional)",
      description: "Get more precise answers by selecting a specialized mode.",
    },
    {
      number: "3",
      title: "Continue the conversation",
      description: "Refine, adjust, or ask follow-up questions instantly.",
    },
  ];

  const faqs = [
    {
      question: "Is Bahor AI the same as ChatGPT?",
      answer: "No. Bahor AI is customized for Uzbek users, local culture, and local use cases.",
    },
    {
      question: "Why is Bahor AI free right now?",
      answer: "We are in beta, collecting feedback and improving the service.",
    },
    {
      question: "What languages does Bahor AI support?",
      answer: "Primary language is Uzbek. English and Russian are also understood.",
    },
    {
      question: "Is my data safe?",
      answer: "Yes. No personal data is shared with third parties. See our privacy policy.",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50/40 via-slate-50/30 to-slate-50/40 dark:from-slate-950/40 dark:via-slate-950/30 dark:to-slate-950/40">
      {/* Header */}
      <header className="border-b border-border/40 backdrop-blur-sm bg-background/80 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src={bahorLogo} 
              alt="Bahor AI" 
              className="h-12 w-auto sm:h-[52px] object-contain" 
            />
            <span className="text-[27px] sm:text-[29px] font-semibold tracking-[0.02em] bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Bahor AI
            </span>
          </div>
          <Button 
            onClick={() => navigate("/modes")} 
            size="sm"
            className="h-9 px-6 rounded-[10px] font-medium border-[1.5px] shadow-sm hover:shadow-md hover:brightness-105 transition-all active:scale-[0.97]"
          >
            Open App
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-28 sm:py-40">
        <div
          ref={heroRef.ref}
          className={`max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative transition-all duration-500 ease-out ${
            heroRef.isVisible 
              ? "opacity-100 translate-y-0" 
              : "opacity-0 translate-y-4"
          }`}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-12">
            <Sparkles className="w-4 h-4" />
            Currently in Beta
          </div>
          <h1 className="text-[2.4rem] sm:text-5xl lg:text-[3.5rem] font-bold mb-10 bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent leading-[1.15]">
            The first Uzbek artificial intelligence — made for Uzbekistan.
          </h1>
          <p className="text-[21px] sm:text-[23px] text-[#3D3D3D] dark:text-muted-foreground/90 mb-14 max-w-2xl mx-auto leading-[1.5]">
            A lightning-fast AI assistant designed specifically for the Uzbek language.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-7">
            <Button
              onClick={() => navigate("/modes")}
              size="lg"
              className="w-full sm:w-auto min-w-[220px] h-14 px-8 text-base font-medium shadow-lg hover:shadow-xl hover:brightness-105 transition-all rounded-[10px] border-[1.5px] active:scale-[0.97]"
            >
              <MessageSquare className="w-5 h-5 mr-2" />
              Open Bahor AI App
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto min-w-[220px] h-14 px-8 text-base font-medium rounded-[10px] border-[1.5px] hover:brightness-105 transition-all active:scale-[0.97]"
              disabled
            >
              Mobile apps coming soon
            </Button>
          </div>
          <p className="text-sm text-muted-foreground/80">
            Currently available for free during beta.
          </p>
        </div>
      </section>

      {/* Why Bahor AI Section */}
      <section className="py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div 
            ref={featuresRef.ref}
            className={`text-center mb-24 transition-all duration-500 ease-out ${
              featuresRef.isVisible 
                ? "opacity-100 translate-y-0" 
                : "opacity-0 translate-y-4"
            }`}
          >
            <h2 className="text-4xl sm:text-5xl font-bold mb-6 tracking-tight">Why choose Bahor AI?</h2>
            <p className="text-xl text-muted-foreground">
              Built specifically for the needs of Uzbek speakers
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-7">
            {features.map((feature, index) => (
              <Card
                key={index}
                className={`p-10 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-[#E8E8E8] dark:border-border/50 bg-background/80 backdrop-blur shadow-[0_4px_14px_rgba(0,0,0,0.04)] ${
                  featuresRef.isVisible 
                    ? "opacity-100 translate-y-0" 
                    : "opacity-0 translate-y-6"
                }`}
                style={{
                  transitionDelay: `${index * 100}ms`,
                }}
              >
                <div className="flex items-start gap-6">
                  <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                    {React.cloneElement(feature.icon as React.ReactElement, { className: "w-8 h-8" })}
                  </div>
                  <div>
                    <h3 className="text-[19px] font-semibold mb-3">{feature.title}</h3>
                    <p className="text-muted-foreground text-[15px] leading-relaxed">{feature.description}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Modes Preview Section */}
      <section className="py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div 
            ref={modesRef.ref}
            className={`text-center mb-24 transition-all duration-500 ease-out ${
              modesRef.isVisible 
                ? "opacity-100 translate-y-0" 
                : "opacity-0 translate-y-4"
            }`}
          >
            <h2 className="text-4xl sm:text-5xl font-bold mb-6 tracking-tight">Explore Bahor AI Modes</h2>
            <p className="text-xl text-muted-foreground">
              Specialized AI assistants for every need
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-14">
            {modes.map((mode, index) => (
              <Card
                key={index}
                className={`p-6 hover:shadow-lg hover:scale-[1.01] hover:-translate-y-1 transition-all duration-300 cursor-pointer border-[#E8E8E8] dark:border-border/50 bg-background/80 backdrop-blur group shadow-[0_2px_8px_rgba(0,0,0,0.02)] ${
                  modesRef.isVisible 
                    ? "opacity-100 translate-y-0" 
                    : "opacity-0 translate-y-6"
                }`}
                style={{
                  transitionDelay: `${index * 80}ms`,
                }}
                onClick={() => navigate("/modes")}
              >
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-primary group-hover:scale-110 group-hover:brightness-110 transition-all duration-200">
                    {React.cloneElement(mode.icon as React.ReactElement, { className: "w-7 h-7" })}
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1.5 text-[15px]">{mode.title}</h3>
                    <p className="text-[13px] text-muted-foreground line-clamp-2 leading-relaxed">
                      {mode.description}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
          <div className="text-center mt-12">
            <Button
              onClick={() => navigate("/modes")}
              size="lg"
              className="px-8 h-12 text-base font-medium shadow-md hover:shadow-lg hover:scale-[1.02] transition-all rounded-[10px] active:scale-[0.98]"
            >
              Start using Bahor AI
              <span className="ml-2">→</span>
            </Button>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-32">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div 
            ref={stepsRef.ref}
            className={`text-center mb-24 transition-all duration-500 ease-out ${
              stepsRef.isVisible 
                ? "opacity-100 translate-y-0" 
                : "opacity-0 translate-y-4"
            }`}
          >
            <h2 className="text-4xl sm:text-5xl font-bold mb-6 tracking-tight">How Bahor AI Works</h2>
            <p className="text-xl text-muted-foreground">
              Get started in three simple steps
            </p>
          </div>
          <div className="relative">
            {/* Connecting line - horizontal on desktop, vertical on mobile */}
            <div className="hidden md:block absolute top-10 left-[20%] right-[20%] h-[2px] bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20" />
            <div className="md:hidden absolute top-0 bottom-0 left-1/2 w-[2px] bg-gradient-to-b from-primary/20 via-primary/40 to-primary/20 -translate-x-1/2" />
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-16 md:gap-8 relative">
              {steps.map((step, index) => (
                <div 
                  key={index} 
                  className={`text-center relative transition-all duration-500 ease-out ${
                    stepsRef.isVisible 
                      ? "opacity-100 translate-y-0" 
                      : "opacity-0 translate-y-6"
                  }`}
                  style={{
                    transitionDelay: `${index * 150}ms`,
                  }}
                >
                  <div className="w-24 h-24 rounded-full bg-primary/15 text-primary text-[36px] font-bold flex items-center justify-center mx-auto mb-6 shadow-lg relative z-10 backdrop-blur-sm border-4 border-background">
                    {step.number}
                  </div>
                  <h3 className="text-[19px] font-semibold mb-4">{step.title}</h3>
                  <p className="text-muted-foreground text-[15px] leading-relaxed max-w-xs mx-auto">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div 
            ref={pricingRef.ref}
            className={`text-center mb-24 transition-all duration-500 ease-out ${
              pricingRef.isVisible 
                ? "opacity-100 translate-y-0" 
                : "opacity-0 translate-y-4"
            }`}
          >
            <h2 className="text-4xl sm:text-5xl font-bold mb-6 tracking-tight">Pricing</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Choose the plan that works best for you
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Free Plan */}
            <Card 
              className={`p-8 border-[#E8E8E8] dark:border-border/50 shadow-[0_4px_14px_rgba(0,0,0,0.04)] bg-background/80 backdrop-blur relative transition-all duration-500 ease-out ${
                pricingRef.isVisible 
                  ? "opacity-100 translate-y-0 scale-100" 
                  : "opacity-0 translate-y-6 scale-98"
              }`}
              style={{
                transitionDelay: "0ms",
              }}
            >
              <div className="mb-6">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Boshlash uchun</p>
                <h3 className="text-2xl font-bold mb-2">Free (beta)</h3>
                <div className="flex items-baseline gap-1 mb-3">
                  <span className="text-4xl font-bold">0</span>
                  <span className="text-lg text-muted-foreground">UZS</span>
                </div>
                <p className="text-sm text-muted-foreground">Boshlang'ich foydalanish uchun cheklangan rejim.</p>
              </div>
              
              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-2 text-sm">
                  <span className="text-muted-foreground">•</span>
                  <span>Cheklangan — kuniga 5 ta xabar gacha</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <span className="text-muted-foreground">•</span>
                  <span>Fayl va rasm yuklash imkoniyati yo'q</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <span className="text-muted-foreground">•</span>
                  <span>Faqat umumiy suhbat (maxsus rejimlar yo'q)</span>
                </li>
              </ul>
              
              <p className="text-xs text-muted-foreground/70 mt-6">
                Cheklovlar beta davrida o'zgarishi mumkin.
              </p>
            </Card>

            {/* Monthly Plan - Most Popular */}
            <Card 
              className={`p-8 border-primary/40 dark:border-primary/30 shadow-[0_8px_24px_rgba(0,0,0,0.08)] bg-background relative scale-105 md:scale-110 transition-all duration-500 ease-out ${
                pricingRef.isVisible 
                  ? "opacity-100 translate-y-0" 
                  : "opacity-0 translate-y-6 scale-98"
              }`}
              style={{
                transitionDelay: "100ms",
              }}
            >
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-full shadow-lg">
                Eng mashhur reja
              </div>
              
              <div className="mb-6 mt-2">
                <h3 className="text-2xl font-bold mb-2">Oylik reja</h3>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-4xl font-bold">49,000</span>
                  <span className="text-lg text-muted-foreground">UZS</span>
                </div>
                <p className="text-sm text-muted-foreground mb-3">/ oy</p>
                <p className="text-xs text-primary font-medium">
                  Taxminan 80% arzonroq chet el AI chatbotlaridan
                </p>
              </div>
              
              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-2 text-sm">
                  <span className="text-primary">✓</span>
                  <span>Barcha maxsus rejimlar ochiq (IELTS, kod, biznes, moliya va boshqalar)</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <span className="text-primary">✓</span>
                  <span>Fayl va rasm yuklash hamda tahlil qilish</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <span className="text-primary">✓</span>
                  <span>Ko'proq kunlik xabar limiti</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <span className="text-primary">✓</span>
                  <span>Kelajakda ustuvor qo'llab-quvvatlash va yangiliklar</span>
                </li>
              </ul>
              
              <Button 
                className="w-full h-11 rounded-[10px] font-medium shadow-md hover:shadow-lg transition-all"
                onClick={() => navigate("/modes")}
              >
                Tez orada
              </Button>
            </Card>

            {/* Yearly Plan - Best Value */}
            <Card 
              className={`p-8 border-[#E8E8E8] dark:border-border/50 shadow-[0_4px_14px_rgba(0,0,0,0.04)] bg-background/80 backdrop-blur relative transition-all duration-500 ease-out ${
                pricingRef.isVisible 
                  ? "opacity-100 translate-y-0 scale-100" 
                  : "opacity-0 translate-y-6 scale-98"
              }`}
              style={{
                transitionDelay: "200ms",
              }}
            >
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-accent text-accent-foreground text-xs font-semibold rounded-full shadow-lg">
                Eng tejamkor
              </div>
              
              <div className="mb-6 mt-2">
                <h3 className="text-2xl font-bold mb-2">Yillik reja</h3>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-4xl font-bold">340,000</span>
                  <span className="text-lg text-muted-foreground">UZS</span>
                </div>
                <p className="text-sm text-muted-foreground mb-1">/ yil</p>
                <p className="text-xs text-accent-foreground font-medium mb-1">
                  Taxminan 28,300 UZS / oy ekvivalent
                </p>
                <p className="text-xs text-primary font-medium">
                  Oylik rejaga nisbatan taxminan 42% tejamkor
                </p>
              </div>
              
              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-2 text-sm">
                  <span className="text-primary">✓</span>
                  <span>Barcha oylik reja imkoniyatlari</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <span className="text-primary">✓</span>
                  <span>Yiliga bir marta to'lov — ko'proq tejash</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <span className="text-primary">✓</span>
                  <span>Beta foydalanuvchilari uchun maxsus bonuslar (kelajakda)</span>
                </li>
              </ul>
              
              <Button 
                variant="outline"
                className="w-full h-11 rounded-[10px] font-medium hover:bg-accent transition-all"
                onClick={() => navigate("/modes")}
              >
                Tez orada
              </Button>
            </Card>
          </div>
          
          <p className="text-center text-sm text-muted-foreground/80 mt-12 max-w-2xl mx-auto leading-relaxed">
            Hozircha barcha foydalanuvchilar bepul beta rejimdan foydalanishyapti. Pullik rejimlar keyinroq ishga tushiriladi.
          </p>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-28">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div 
            ref={faqRef.ref}
            className={`text-center mb-20 transition-all duration-500 ease-out ${
              faqRef.isVisible 
                ? "opacity-100 translate-y-0" 
                : "opacity-0 translate-y-4"
            }`}
          >
            <h2 className="text-4xl sm:text-5xl font-bold mb-4 tracking-tight">Frequently Asked Questions</h2>
          </div>
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className={`bg-background/80 backdrop-blur border border-border/50 rounded-lg px-8 py-1 transition-all duration-300 hover:shadow-md ${
                  faqRef.isVisible 
                    ? "opacity-100 translate-y-0" 
                    : "opacity-0 translate-y-4"
                }`}
                style={{
                  transitionDelay: `${index * 100}ms`,
                }}
              >
                <AccordionTrigger className="text-left hover:no-underline py-6 [&[data-state=open]>svg]:rotate-180">
                  <span className="font-semibold text-[15px] pr-4">{faq.question}</span>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-[15px] leading-relaxed pb-6 animate-accordion-down">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/30 py-14 bg-background/80 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
            <p className="text-sm text-muted-foreground/80 font-medium">© 2025 Bahor AI</p>
            <div className="flex gap-8 text-sm text-muted-foreground/70">
              <a href="#" className="hover:text-foreground transition-colors font-medium relative after:absolute after:bottom-0 after:left-0 after:w-0 after:h-[1px] after:bg-foreground after:transition-all hover:after:w-full">
                Terms of Use
              </a>
              <a href="#" className="hover:text-foreground transition-colors font-medium relative after:absolute after:bottom-0 after:left-0 after:w-0 after:h-[1px] after:bg-foreground after:transition-all hover:after:w-full">
                Privacy Policy
              </a>
              <a href="#" className="hover:text-foreground transition-colors font-medium relative after:absolute after:bottom-0 after:left-0 after:w-0 after:h-[1px] after:bg-foreground after:transition-all hover:after:w-full">
                Help Center
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
