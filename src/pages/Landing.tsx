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
      <header className="border-b border-border/40 backdrop-blur-sm bg-background/80 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={bahorLogo} alt="Bahor AI" className="h-10 w-10" />
            <span className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Bahor AI
            </span>
          </div>
          <Button onClick={() => navigate("/modes")} size="sm">
            Open App
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 sm:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8 animate-fade-in">
            <Sparkles className="w-4 h-4" />
            Currently in Beta
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent leading-tight">
            The first Uzbek artificial intelligence — made for Uzbekistan.
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            A lightning-fast AI assistant designed specifically for the Uzbek language.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-4">
            <Button
              onClick={() => navigate("/modes")}
              size="lg"
              className="w-full sm:w-auto min-w-[200px] shadow-lg hover:shadow-xl transition-shadow"
            >
              <MessageSquare className="w-5 h-5 mr-2" />
              Open Bahor AI App
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto min-w-[200px]"
              disabled
            >
              Mobile apps coming soon
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Currently available for free during beta.
          </p>
        </div>
      </section>

      {/* Why Bahor AI Section */}
      <section className="py-20 bg-slate-50/50 dark:bg-slate-900/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Why choose Bahor AI?</h2>
            <p className="text-lg text-muted-foreground">
              Built specifically for the needs of Uzbek speakers
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((feature, index) => (
              <Card
                key={index}
                className="p-6 hover:shadow-lg transition-shadow border-border/50 bg-background/80 backdrop-blur"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                    {feature.icon}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground text-sm">{feature.description}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Modes Preview Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Explore Bahor AI Modes</h2>
            <p className="text-lg text-muted-foreground">
              Specialized AI assistants for every need
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            {modes.map((mode, index) => (
              <Card
                key={index}
                className="p-5 hover:shadow-md transition-all cursor-pointer border-border/50 bg-background/80 backdrop-blur group"
                onClick={() => navigate("/modes")}
              >
                <div className="flex flex-col items-center text-center gap-3">
                  <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                    {mode.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1 text-sm">{mode.title}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2">
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
              className="min-w-[240px] shadow-lg"
            >
              Start using Bahor AI
            </Button>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-slate-50/50 dark:bg-slate-900/20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">How Bahor AI Works</h2>
            <p className="text-lg text-muted-foreground">
              Get started in three simple steps
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground text-2xl font-bold flex items-center justify-center mx-auto mb-4 shadow-lg">
                  {step.number}
                </div>
                <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Teaser Section */}
      <section className="py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6">Pricing (coming soon)</h2>
          <div className="bg-slate-50 dark:bg-slate-900/40 rounded-2xl p-8 border border-border/50">
            <p className="text-xl font-semibold mb-4">Currently free during beta.</p>
            <p className="text-muted-foreground mb-4">
              All users can access Bahor AI with limited messages per day.
            </p>
            <p className="text-sm text-muted-foreground/70">
              Future plans will include monthly (49,000 UZS) and annual (340,000 UZS) subscriptions.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-slate-50/50 dark:bg-slate-900/20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Frequently Asked Questions</h2>
          </div>
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-background/80 backdrop-blur border border-border/50 rounded-lg px-6"
              >
                <AccordionTrigger className="text-left hover:no-underline">
                  <span className="font-semibold">{faq.question}</span>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8 bg-background/80 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">© 2025 Bahor AI</p>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">
                Terms of Use
              </a>
              <a href="#" className="hover:text-foreground transition-colors">
                Privacy Policy
              </a>
              <a href="#" className="hover:text-foreground transition-colors">
                Help Center
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
