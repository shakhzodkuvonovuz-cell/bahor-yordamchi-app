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

export default function Landing() {
  const navigate = useNavigate();

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
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-slate-50 dark:to-slate-950">
      {/* Header */}
      <header className="border-b border-border/40 backdrop-blur-sm bg-background/80 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src={bahorLogo} alt="Bahor AI" className="h-12 w-12 sm:h-11 sm:w-11" />
            <span className="text-[22px] font-semibold tracking-wide bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Bahor AI
            </span>
          </div>
          <Button 
            onClick={() => navigate("/modes")} 
            size="sm"
            className="h-10 px-5 rounded-[10px] font-medium border-[1.5px] shadow-sm hover:brightness-105 transition-all"
          >
            Open App
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-24 sm:py-36">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-10 animate-fade-in">
            <Sparkles className="w-4 h-4" />
            Currently in Beta
          </div>
          <h1 className="text-[2.75rem] sm:text-6xl lg:text-7xl font-bold mb-8 bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent leading-[1.15]">
            The first Uzbek artificial intelligence — made for Uzbekistan.
          </h1>
          <p className="text-xl sm:text-2xl text-[#4A4A4A] dark:text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
            A lightning-fast AI assistant designed specifically for the Uzbek language.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-6">
            <Button
              onClick={() => navigate("/modes")}
              size="lg"
              className="w-full sm:w-auto min-w-[200px] h-12 px-7 text-base font-medium shadow-lg hover:shadow-xl hover:brightness-105 transition-all rounded-[10px] border-[1.5px]"
            >
              <MessageSquare className="w-5 h-5 mr-2" />
              Open Bahor AI App
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto min-w-[200px] h-12 px-7 text-base font-medium rounded-[10px] border-[1.5px] hover:brightness-105 transition-all"
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
      <section className="py-24 bg-slate-50/50 dark:bg-slate-900/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl sm:text-5xl font-bold mb-5 tracking-tight">Why choose Bahor AI?</h2>
            <p className="text-xl text-muted-foreground">
              Built specifically for the needs of Uzbek speakers
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((feature, index) => (
              <Card
                key={index}
                className="p-8 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 border-border/50 bg-background/80 backdrop-blur shadow-[0_4px_12px_rgba(0,0,0,0.03)]"
              >
                <div className="flex items-start gap-5">
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                    {React.cloneElement(feature.icon as React.ReactElement, { className: "w-7 h-7" })}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2.5">{feature.title}</h3>
                    <p className="text-muted-foreground text-[15px] leading-relaxed">{feature.description}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Modes Preview Section */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl sm:text-5xl font-bold mb-5 tracking-tight">Explore Bahor AI Modes</h2>
            <p className="text-xl text-muted-foreground">
              Specialized AI assistants for every need
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-12">
            {modes.map((mode, index) => (
              <Card
                key={index}
                className="p-6 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 cursor-pointer border-[#E8E8E8] dark:border-border/50 bg-background/80 backdrop-blur group shadow-[0_4px_12px_rgba(0,0,0,0.03)]"
                onClick={() => navigate("/modes")}
              >
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-200">
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
          <div className="text-center">
            <Button
              onClick={() => navigate("/modes")}
              size="lg"
              className="min-w-[260px] h-12 text-base font-medium shadow-lg hover:shadow-xl hover:scale-[1.01] transition-all rounded-[10px]"
            >
              Start using Bahor AI
              <span className="ml-2">→</span>
            </Button>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-28 bg-slate-50/50 dark:bg-slate-900/20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl sm:text-5xl font-bold mb-5 tracking-tight">How Bahor AI Works</h2>
            <p className="text-xl text-muted-foreground">
              Get started in three simple steps
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {steps.map((step, index) => (
              <div key={index} className="text-center">
                <div className="w-20 h-20 rounded-full bg-primary/15 text-primary text-3xl font-bold flex items-center justify-center mx-auto mb-5 shadow-md">
                  {step.number}
                </div>
                <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                <p className="text-muted-foreground text-[15px] leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Teaser Section */}
      <section className="py-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl sm:text-5xl font-bold mb-8 tracking-tight">Pricing (coming soon)</h2>
          <div className="bg-slate-50 dark:bg-slate-900/40 rounded-3xl p-10 border border-border/50 shadow-[0_4px_12px_rgba(0,0,0,0.04)]">
            <p className="text-2xl font-semibold mb-5">Currently free during beta.</p>
            <p className="text-[#4A4A4A] dark:text-muted-foreground mb-5 text-lg leading-relaxed">
              All users can access Bahor AI with limited messages per day.
            </p>
            <p className="text-[15px] text-muted-foreground/70">
              Future plans will include monthly (49,000 UZS) and annual (340,000 UZS) subscriptions.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 bg-slate-50/50 dark:bg-slate-900/20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold mb-4 tracking-tight">Frequently Asked Questions</h2>
          </div>
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-background/80 backdrop-blur border border-border/50 rounded-lg px-7 py-1 transition-all duration-200"
              >
                <AccordionTrigger className="text-left hover:no-underline py-5">
                  <span className="font-semibold text-[15px]">{faq.question}</span>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-[15px] leading-relaxed pb-5">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/20 py-10 bg-background/80 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
            <p className="text-sm text-muted-foreground font-medium">© 2025 Bahor AI</p>
            <div className="flex gap-8 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors font-medium">
                Terms of Use
              </a>
              <a href="#" className="hover:text-foreground transition-colors font-medium">
                Privacy Policy
              </a>
              <a href="#" className="hover:text-foreground transition-colors font-medium">
                Help Center
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
