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
  ArrowRight,
  ChevronDown,
} from "lucide-react";
import bahorLogo from "@/assets/bahor-logo.png";
import { useState, useEffect } from "react";

export default function Landing() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const features = [
    {
      icon: <Globe className="w-7 h-7" />,
      title: "Optimized for Uzbek language",
      description: "Understands Uzbek slang, natural phrasing, and real-life context.",
    },
    {
      icon: <Target className="w-7 h-7" />,
      title: "Specialized modes",
      description: "Coding, IELTS, business, marketing, homework help, and more.",
    },
    {
      icon: <Zap className="w-7 h-7" />,
      title: "Fast, simple, intuitive",
      description: "No complicated menus. Just ask and get instant help.",
    },
    {
      icon: <Sparkles className="w-7 h-7" />,
      title: "Future premium plans",
      description: "Currently free in beta. Paid plans will launch soon with additional features.",
    },
  ];

  const modes = [
    {
      icon: <Code2 className="w-7 h-7" />,
      title: "Technology & Coding",
      description: "Get help with programming, debugging, and technical questions.",
    },
    {
      icon: <Home className="w-7 h-7" />,
      title: "Life Assistance",
      description: "Practical advice for everyday life, recipes, and daily tasks.",
    },
    {
      icon: <Briefcase className="w-7 h-7" />,
      title: "Business & Marketing",
      description: "Strategic guidance for business growth and marketing campaigns.",
    },
    {
      icon: <BookOpen className="w-7 h-7" />,
      title: "English & IELTS",
      description: "Improve your English skills and prepare for IELTS exams.",
    },
    {
      icon: <GraduationCap className="w-7 h-7" />,
      title: "Homework & Subjects",
      description: "Get help with school assignments and academic subjects.",
    },
    {
      icon: <Briefcase className="w-7 h-7" />,
      title: "Job & Resume",
      description: "Build professional resumes and prepare for job interviews.",
    },
    {
      icon: <DollarSign className="w-7 h-7" />,
      title: "Financial Literacy",
      description: "Learn about budgeting, saving, and financial planning.",
    },
    {
      icon: <Heart className="w-7 h-7" />,
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
      <header
        className={`border-b sticky top-0 z-50 transition-all duration-300 ${
          scrolled
            ? "border-border/40 backdrop-blur-xl bg-background/80 shadow-sm"
            : "border-border/40 backdrop-blur-sm bg-background/80"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src={bahorLogo} 
              alt="Bahor AI" 
              className="h-12 w-12 sm:h-14 sm:w-14 lg:h-12 lg:w-12 transition-transform hover:scale-105" 
            />
            <span className="text-xl sm:text-2xl font-semibold tracking-wide bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Bahor AI
            </span>
          </div>
          <Button 
            onClick={() => navigate("/modes")} 
            size="lg"
            className="rounded-xl shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105"
          >
            Open App
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-24 sm:py-36 lg:py-40 animate-fade-in">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-10 animate-fade-in shadow-sm">
            <Sparkles className="w-4 h-4" />
            Currently in Beta
          </div>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-8 bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent leading-[1.15] tracking-tight">
            The first Uzbek artificial intelligence — made for Uzbekistan.
          </h1>
          <p className="text-xl sm:text-2xl text-muted-foreground/80 mb-12 max-w-3xl mx-auto leading-relaxed">
            A lightning-fast AI assistant designed specifically for the Uzbek language.
          </p>
          <div className="flex flex-col sm:flex-row gap-5 justify-center items-center mb-6">
            <Button
              onClick={() => navigate("/modes")}
              size="lg"
              className="w-full sm:w-auto min-w-[220px] h-14 text-base rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 group"
            >
              <MessageSquare className="w-5 h-5 mr-2" />
              Open Bahor AI App
              <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto min-w-[220px] h-14 text-base rounded-xl border-2 hover:bg-accent/50 transition-all duration-200"
              disabled
            >
              Mobile apps coming soon
            </Button>
          </div>
          <p className="text-sm text-muted-foreground/70">
            Currently available for free during beta.
          </p>
        </div>
      </section>

      {/* Why Bahor AI Section */}
      <section className="py-24 bg-slate-50/50 dark:bg-slate-900/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl sm:text-5xl font-bold mb-5 tracking-tight">Why choose Bahor AI?</h2>
            <p className="text-xl text-muted-foreground/80">
              Built specifically for the needs of Uzbek speakers
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {features.map((feature, index) => (
              <Card
                key={index}
                className="p-8 hover:shadow-xl transition-all duration-300 border-border/50 bg-background/80 backdrop-blur hover:-translate-y-1 group cursor-default"
              >
                <div className="flex items-start gap-5">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                    {feature.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                    <p className="text-muted-foreground text-base leading-relaxed max-w-md">{feature.description}</p>
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
            <p className="text-xl text-muted-foreground/80">
              Specialized AI assistants for every need
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {modes.map((mode, index) => (
              <Card
                key={index}
                className="p-6 hover:shadow-lg transition-all duration-300 cursor-pointer border-border/50 bg-background/80 backdrop-blur group hover:-translate-y-1 hover:scale-[1.02]"
                onClick={() => navigate("/modes")}
              >
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-300 shadow-sm">
                    {mode.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2 text-base">{mode.title}</h3>
                    <p className="text-sm text-muted-foreground/80 line-clamp-2 leading-relaxed">
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
              className="min-w-[260px] h-14 text-base rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 group"
            >
              Start using Bahor AI
              <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
            </Button>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 bg-slate-50/50 dark:bg-slate-900/20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl sm:text-5xl font-bold mb-5 tracking-tight">How Bahor AI Works</h2>
            <p className="text-xl text-muted-foreground/80">
              Get started in three simple steps
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
            {/* Connecting line for desktop */}
            <div className="hidden md:block absolute top-8 left-[16.66%] right-[16.66%] h-0.5 bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20" />
            
            {steps.map((step, index) => (
              <div key={index} className="text-center relative z-10">
                <div className="w-20 h-20 rounded-full bg-primary text-primary-foreground text-3xl font-bold flex items-center justify-center mx-auto mb-6 shadow-lg hover:scale-110 transition-transform duration-300">
                  {step.number}
                </div>
                <h3 className="text-2xl font-semibold mb-3">{step.title}</h3>
                <p className="text-muted-foreground/80 text-base leading-relaxed max-w-xs mx-auto">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Teaser Section */}
      <section className="py-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl sm:text-5xl font-bold mb-8 tracking-tight">Pricing (coming soon)</h2>
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900/60 dark:to-slate-900/40 rounded-3xl p-10 border border-border/50 backdrop-blur shadow-lg">
            <p className="text-2xl font-semibold mb-5">Currently free during beta.</p>
            <p className="text-muted-foreground/80 mb-5 text-lg leading-relaxed">
              All users can access Bahor AI with limited messages per day.
            </p>
            <p className="text-sm text-muted-foreground/70">
              Future plans will include monthly (49,000 UZS) and annual (340,000 UZS) subscriptions.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 bg-slate-50/50 dark:bg-slate-900/20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold mb-5 tracking-tight">Frequently Asked Questions</h2>
          </div>
          <Accordion type="single" collapsible className="space-y-5">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-background/80 backdrop-blur border border-border/50 rounded-2xl px-7 py-2 hover:shadow-md transition-all duration-200 data-[state=open]:shadow-lg"
              >
                <AccordionTrigger className="text-left hover:no-underline py-5 group">
                  <span className="font-semibold text-lg pr-4">{faq.question}</span>
                  <ChevronDown className="h-5 w-5 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground/80 text-base leading-relaxed pb-5">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-12 bg-background/80 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
            <p className="text-base text-muted-foreground/80">© 2025 Bahor AI</p>
            <div className="flex gap-8 text-base text-muted-foreground/80">
              <a href="#" className="hover:text-foreground transition-colors duration-200">
                Terms of Use
              </a>
              <a href="#" className="hover:text-foreground transition-colors duration-200">
                Privacy Policy
              </a>
              <a href="#" className="hover:text-foreground transition-colors duration-200">
                Help Center
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
