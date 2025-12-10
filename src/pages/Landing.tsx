import React, { useEffect, useRef, useState } from "react";
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
  Search,
  ImagePlus,
  FileText,
  Users,
  Globe,
  Sparkles,
  MessageSquare,
  ArrowRight,
  Check,
  Send,
  Mic,
  Paperclip,
  Camera,
  ExternalLink,
  Download,
  Zap,
  Shield,
  Clock,
} from "lucide-react";
import bahorLogo from "@/assets/bahor-logo.png";
import samarkandImage from "@/assets/landing/samarkand-registan.jpg";
import tashkentImage from "@/assets/landing/tashkent-night.jpg";
import suzaniImage from "@/assets/landing/uzbek-suzani.jpg";
import { useTranslation } from "@/i18n/LanguageProvider";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { AppFooter } from "@/components/layout/AppFooter";
import { prefetchCriticalRoutes } from "@/lib/routePrefetch";

// Glass card component for consistent styling
function GlassCard({ 
  children, 
  className = "", 
  hover = true 
}: { 
  children: React.ReactNode; 
  className?: string;
  hover?: boolean;
}) {
  return (
    <div className={`
      relative overflow-hidden rounded-2xl
      bg-white/[0.03] dark:bg-white/[0.03]
      backdrop-blur-xl
      border border-white/[0.08]
      ${hover ? 'transition-all duration-300 hover:bg-white/[0.05] hover:border-white/[0.12] hover:scale-[1.02] hover:shadow-[0_0_40px_-10px_hsl(var(--primary)/0.3)]' : ''}
      ${className}
    `}>
      {children}
    </div>
  );
}

// Phone mockup component with 3D effect
function PhoneMockup() {
  const { t } = useTranslation();
  const [activeSlide, setActiveSlide] = useState(0);
  
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % 3);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative mx-auto" style={{ perspective: '1200px' }}>
      {/* Glow behind phone */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-primary/20 rounded-full blur-[100px] animate-pulse" />
      </div>
      
      {/* iPhone-style frame */}
      <div 
        className="relative w-[280px] sm:w-[320px] mx-auto rounded-[40px] bg-gradient-to-b from-zinc-800 to-zinc-900 p-2 shadow-[0_0_60px_-15px_hsl(var(--primary)/0.4)]"
        style={{ 
          transform: 'rotateX(5deg) rotateY(-2deg)',
          transformStyle: 'preserve-3d'
        }}
      >
        {/* Dynamic Island */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-full z-10" />
        
        {/* Screen */}
        <div className="relative rounded-[32px] overflow-hidden bg-background">
          {/* Status bar */}
          <div className="flex items-center justify-between px-6 py-2 bg-card/80">
            <span className="text-[10px] text-muted-foreground font-medium">9:41</span>
            <div className="flex items-center gap-1">
              <div className="w-4 h-2 rounded-sm bg-muted-foreground/50" />
              <div className="w-6 h-3 rounded-sm border border-muted-foreground/50 relative">
                <div className="absolute inset-0.5 right-1 bg-primary rounded-sm" />
              </div>
            </div>
          </div>
          
          {/* App header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/30 bg-card/50">
            <div className="flex items-center gap-2">
              <img src={bahorLogo} alt="Bahor AI" className="w-6 h-6" />
              <span className="font-semibold text-sm text-foreground">Bahor AI</span>
            </div>
            <div className="flex gap-0.5 bg-secondary/60 rounded-lg p-0.5">
              <span className="text-[10px] px-2 py-1 rounded-md bg-background text-foreground font-medium">Tez</span>
              <span className="text-[10px] px-2 py-1 rounded-md text-muted-foreground">Aqlli</span>
            </div>
          </div>
          
          {/* Chat content */}
          <div className="p-4 min-h-[280px] space-y-3">
            {activeSlide === 0 && (
              <>
                {/* User message */}
                <div className="flex justify-end animate-fade-in">
                  <div className="bg-primary/15 border border-primary/30 text-foreground px-3 py-2 rounded-2xl rounded-tr-sm max-w-[85%]">
                    <p className="text-xs">O'zbekistonda eng yaxshi universitetlar qaysilar?</p>
                  </div>
                </div>
                
                {/* Sources */}
                <div className="space-y-2 animate-fade-in" style={{ animationDelay: '0.2s' }}>
                  <div className="flex items-center gap-2">
                    <Search className="w-3 h-3 text-primary" />
                    <span className="text-[10px] text-muted-foreground">4 manba topildi</span>
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {['kun.uz', 'gazeta.uz', 'lex.uz'].map((s) => (
                      <span key={s} className="text-[9px] px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">
                        <ExternalLink className="w-2 h-2" />{s}
                      </span>
                    ))}
                  </div>
                </div>
                
                {/* AI Response */}
                <div className="space-y-2 animate-fade-in" style={{ animationDelay: '0.4s' }}>
                  <p className="text-xs font-medium text-foreground">📚 O'zbekistondagi eng yaxshi universitetlar:</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    1. Toshkent Davlat Universiteti<br/>
                    2. Mirzo Ulug'bek nomidagi O'zMU<br/>
                    3. Toshkent Tibbiyot Akademiyasi...
                  </p>
                </div>
              </>
            )}
            
            {activeSlide === 1 && (
              <>
                <div className="flex justify-end animate-fade-in">
                  <div className="bg-primary/15 border border-primary/30 text-foreground px-3 py-2 rounded-2xl rounded-tr-sm max-w-[85%]">
                    <p className="text-xs">Registon maydoni rasmini yarat</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary/50 w-fit animate-fade-in" style={{ animationDelay: '0.2s' }}>
                  <ImagePlus className="w-3 h-3 text-primary" />
                  <span className="text-[10px] text-muted-foreground">Rasm yaratilmoqda...</span>
                  <div className="flex gap-0.5">
                    <span className="w-1 h-1 rounded-full bg-primary animate-pulse" />
                    <span className="w-1 h-1 rounded-full bg-primary animate-pulse" style={{ animationDelay: '0.2s' }} />
                    <span className="w-1 h-1 rounded-full bg-primary animate-pulse" style={{ animationDelay: '0.4s' }} />
                  </div>
                </div>
                
                <div className="relative rounded-xl overflow-hidden animate-scale-in" style={{ animationDelay: '0.4s' }}>
                  <img src={samarkandImage} alt="Registon" className="w-full h-28 object-cover" />
                  <div className="absolute bottom-2 right-2 flex gap-1">
                    <button className="p-1.5 rounded-lg bg-black/50 backdrop-blur-sm text-white">
                      <Download className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </>
            )}
            
            {activeSlide === 2 && (
              <>
                <div className="flex justify-end animate-fade-in">
                  <div className="bg-primary/15 border border-primary/30 text-foreground px-3 py-2 rounded-2xl rounded-tr-sm max-w-[85%]">
                    <p className="text-xs">Buni PDF qilib ber</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary/50 w-fit animate-fade-in" style={{ animationDelay: '0.2s' }}>
                  <FileText className="w-3 h-3 text-primary" />
                  <span className="text-[10px] text-muted-foreground">PDF tayyorlanmoqda...</span>
                </div>
                
                <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/40 border border-border/40 animate-scale-in" style={{ animationDelay: '0.4s' }}>
                  <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-red-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-foreground">Universitetlar_Royxati.pdf</p>
                    <p className="text-[10px] text-muted-foreground">PDF • 24 KB</p>
                  </div>
                  <button className="p-2 rounded-lg bg-primary/10 text-primary">
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}
          </div>
          
          {/* Input bar */}
          <div className="px-4 py-3 border-t border-border/30 bg-card/30">
            <div className="flex items-center gap-2">
              <button className="p-1.5 text-muted-foreground">
                <Paperclip className="w-4 h-4" />
              </button>
              <button className="p-1.5 text-muted-foreground">
                <Camera className="w-4 h-4" />
              </button>
              <div className="flex-1 bg-secondary/40 rounded-xl px-3 py-2 border border-border/30">
                <span className="text-[10px] text-muted-foreground">Savolingizni yozing...</span>
              </div>
              <button className="p-1.5 text-muted-foreground">
                <Mic className="w-4 h-4" />
              </button>
              <button className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
                <Send className="w-3.5 h-3.5 text-primary-foreground" />
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Slide indicators */}
      <div className="flex items-center justify-center gap-2 mt-6">
        {['Web qidiruv', 'Rasm yaratish', 'PDF eksport'].map((label, idx) => (
          <button
            key={idx}
            onClick={() => setActiveSlide(idx)}
            className={`px-4 py-2 rounded-full text-xs font-medium transition-all duration-300 ${
              activeSlide === idx
                ? 'bg-primary text-primary-foreground shadow-[0_0_20px_-5px_hsl(var(--primary)/0.5)]'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

// Bento grid feature card
function BentoCard({ 
  icon, 
  title, 
  description, 
  className = "",
  children,
  badge
}: { 
  icon: React.ReactNode;
  title: string;
  description: string;
  className?: string;
  children?: React.ReactNode;
  badge?: string;
}) {
  return (
    <GlassCard className={`p-6 ${className}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
          {icon}
        </div>
        {badge && (
          <span className="px-2 py-1 text-[10px] font-medium rounded-full bg-primary/20 text-primary border border-primary/30">
            {badge}
          </span>
        )}
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2 tracking-tight">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      {children}
    </GlassCard>
  );
}

// Pricing card component
function PricingCard({ 
  name, 
  price, 
  features, 
  cta, 
  popular = false,
  onAction
}: { 
  name: string;
  price: string;
  features: string[];
  cta: string;
  popular?: boolean;
  onAction: () => void;
}) {
  return (
    <div className={`
      relative rounded-2xl p-6 transition-all duration-300
      ${popular 
        ? 'bg-white/[0.05] border-2 border-primary/50 shadow-[0_0_50px_-15px_hsl(var(--primary)/0.4)] scale-105 z-10' 
        : 'bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.05] hover:border-white/[0.12]'
      }
    `}>
      {popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="px-4 py-1 text-xs font-semibold rounded-full bg-primary text-primary-foreground shadow-lg">
            ⭐ Tavsiya etiladi
          </span>
        </div>
      )}
      
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-foreground mb-2">{name}</h3>
        <div className="flex items-baseline justify-center gap-1">
          <span className="text-5xl font-bold text-foreground tracking-tight">{price}</span>
          <span className="text-muted-foreground text-sm">so'm/oy</span>
        </div>
      </div>
      
      <ul className="space-y-3 mb-6">
        {features.map((feature, idx) => (
          <li key={idx} className="flex items-start gap-3 text-sm">
            <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <span className="text-foreground/90">{feature}</span>
          </li>
        ))}
      </ul>
      
      <Button 
        onClick={onAction}
        className={`w-full rounded-xl h-11 font-medium transition-all duration-300 ${
          popular 
            ? 'bg-primary text-primary-foreground shadow-[0_0_30px_-10px_hsl(var(--primary)/0.5)] hover:shadow-[0_0_40px_-10px_hsl(var(--primary)/0.7)]' 
            : 'bg-white/[0.05] text-foreground border border-white/[0.1] hover:bg-white/[0.1]'
        }`}
      >
        {cta}
      </Button>
    </div>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  
  useEffect(() => {
    const timer = setTimeout(prefetchCriticalRoutes, 1500);
    return () => clearTimeout(timer);
  }, []);
  
  const handleOpenApp = () => {
    if (user) {
      navigate("/modes");
    } else {
      navigate("/auth?next=/modes");
    }
  };

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  // FAQs
  const faqs = [
    { q: t('faq.1.question'), a: t('faq.1.answer') },
    { q: t('faq.2.question'), a: t('faq.2.answer') },
    { q: t('landing.faq.imageGen.question'), a: t('landing.faq.imageGen.answer') },
    { q: t('faq.webSearch.question'), a: t('faq.webSearch.answer') },
    { q: t('landing.faq.files.question'), a: t('landing.faq.files.answer') },
    { q: t('faq.circles.question'), a: t('faq.circles.answer') },
  ];

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {/* Noise texture */}
        <div className="absolute inset-0 opacity-[0.015]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }} />
        
        {/* Gradient orbs */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-primary/[0.07] rounded-full blur-[150px]" />
        <div className="absolute top-1/3 right-0 w-[600px] h-[600px] bg-primary/[0.05] rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-primary/[0.04] rounded-full blur-[100px]" />
      </div>
      
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-white/[0.05]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={bahorLogo} alt="Bahor AI" className="h-10 sm:h-12 w-auto" />
            <span className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Bahor AI</span>
          </div>
          
          <nav className="hidden md:flex items-center gap-8">
            {[
              { label: t('nav.features'), id: 'features' },
              { label: t('nav.circles'), id: 'circles' },
              { label: t('nav.pricing'), id: 'pricing' },
              { label: 'FAQ', id: 'faq' },
            ].map((item) => (
              <button 
                key={item.id}
                onClick={() => scrollToSection(item.id)} 
                className="text-sm text-muted-foreground hover:text-foreground transition-colors relative group"
              >
                {item.label}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full" />
              </button>
            ))}
          </nav>
          
          <div className="flex items-center gap-3">
            <LanguageSwitcher variant="pill" />
            <Button 
              onClick={handleOpenApp} 
              size="sm" 
              className="h-9 px-5 rounded-full font-medium bg-primary/20 text-primary border border-primary/50 hover:bg-primary hover:text-primary-foreground transition-all duration-300 shadow-[0_0_20px_-5px_hsl(var(--primary)/0.3)] hover:shadow-[0_0_30px_-5px_hsl(var(--primary)/0.5)]"
            >
              {t('button.openApp')}
            </Button>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative pt-16 sm:pt-24 pb-16 sm:pb-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Beta badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6 animate-fade-in">
            <Sparkles className="w-4 h-4" />
            Beta — Bepul sinab ko'ring
          </div>
          
          {/* Headline with gradient */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl xl:text-8xl font-bold mb-6 tracking-tight leading-[1.1] animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <span className="text-foreground">Birinchi o'zbek </span>
            <span className="bg-gradient-to-r from-primary via-primary-light to-primary bg-clip-text text-transparent">
              sun'iy intellekti
            </span>
          </h1>
          
          {/* Subheadline */}
          <p className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: '0.2s' }}>
            O'zbek tili, madaniyat va kundalik ehtiyojlar uchun yaratilgan.
            Savol so'rang, rasm yarating, hujjat tayyorlang.
          </p>
          
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <Button 
              onClick={handleOpenApp} 
              size="lg" 
              className="h-12 px-8 rounded-full font-semibold text-base shadow-[0_0_40px_-10px_hsl(var(--primary)/0.5)] hover:shadow-[0_0_50px_-10px_hsl(var(--primary)/0.7)] transition-all duration-300"
            >
              <MessageSquare className="w-5 h-5 mr-2" />
              Boshlash — Bepul
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="h-12 px-8 rounded-full font-medium text-base border-white/[0.1] bg-white/[0.03] hover:bg-white/[0.08]"
              onClick={() => scrollToSection('features')}
            >
              Imkoniyatlarni ko'ring
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
          
          {/* Phone Mockup */}
          <div className="animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <PhoneMockup />
          </div>
        </div>
      </section>

      {/* FEATURES - BENTO GRID */}
      <section id="features" className="py-20 sm:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4 tracking-tight">
              Barcha imkoniyatlar bir joyda
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Qidiruv, rasm yaratish, hujjat tahlili va ko'proq — hammasi o'zbek tilida
            </p>
          </div>
          
          {/* Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {/* Web Search - 2 cols */}
            <BentoCard
              icon={<Search className="w-5 h-5" />}
              title="Internetdan qidiruv"
              description="Eng so'nggi ma'lumotlarni real vaqtda toping. Manbalarni ko'ring, natijalarni PDF qiling."
              className="md:col-span-2"
            >
              <div className="flex gap-2 flex-wrap mt-4">
                {['kun.uz', 'gazeta.uz', 'lex.uz', 'review.uz'].map((s) => (
                  <span key={s} className="text-[11px] px-3 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                    {s}
                  </span>
                ))}
              </div>
            </BentoCard>
            
            {/* Image Gen - 1 col, tall */}
            <BentoCard
              icon={<ImagePlus className="w-5 h-5" />}
              title="Rasm yaratish"
              description="Tasviringizni so'z bilan ifodalang — Bahor uni yaratadi."
              badge="Yangi"
              className="md:row-span-2"
            >
              <div className="mt-4 rounded-xl overflow-hidden relative">
                <img src={samarkandImage} alt="Generated" className="w-full h-32 object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <span className="absolute bottom-2 left-2 text-[11px] text-white font-medium">Registon maydoni</span>
              </div>
            </BentoCard>
            
            {/* Circles */}
            <BentoCard
              icon={<Users className="w-5 h-5" />}
              title="Doiralar"
              description="Guruh bilan ishlang. AI yordamida vazifalar, qarorlar va xulosalar."
            >
              <div className="flex -space-x-2 mt-4">
                <img src="https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=64&h=64&fit=crop&crop=face" alt="" className="w-8 h-8 rounded-full border-2 border-background" />
                <img src="https://images.unsplash.com/photo-1580489944761-15a19d654956?w=64&h=64&fit=crop&crop=face" alt="" className="w-8 h-8 rounded-full border-2 border-background" />
                <div className="w-8 h-8 rounded-full bg-primary/20 border-2 border-background flex items-center justify-center text-[10px] text-primary font-medium">+3</div>
              </div>
            </BentoCard>
            
            {/* File Analysis */}
            <BentoCard
              icon={<FileText className="w-5 h-5" />}
              title="Fayl tahlili"
              description="PDF, Word, Excel yuklang — Bahor o'qiydi va javob beradi."
            />
            
            {/* PDF Tools - 2 cols */}
            <BentoCard
              icon={<Zap className="w-5 h-5" />}
              title="PDF asboblar"
              description="Birlashtirish, bo'lish, siqish, suv belgisi qo'shish va boshqa 10+ asbob."
              className="md:col-span-2"
            >
              <div className="flex gap-2 flex-wrap mt-4">
                {['Birlashtirish', 'Siqish', 'Himoya', 'OCR'].map((tool) => (
                  <span key={tool} className="text-[11px] px-3 py-1.5 rounded-full bg-secondary text-muted-foreground">
                    {tool}
                  </span>
                ))}
              </div>
            </BentoCard>
            
            {/* Modes */}
            <BentoCard
              icon={<Globe className="w-5 h-5" />}
              title="8+ rejim"
              description="Kodlash, IELTS, biznes, sog'liq — har bir soha uchun maxsus yordamchi."
            />
          </div>
        </div>
      </section>

      {/* CIRCLES SECTION */}
      <section id="circles" className="py-20 sm:py-28 relative">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Content */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium mb-4">
                <Users className="w-3.5 h-3.5" />
                Guruhlar uchun
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4 tracking-tight">
                Doiralar — jamoaviy AI yordamchi
              </h2>
              <p className="text-muted-foreground mb-8">
                Oila, jamoa yoki do'stlar bilan birgalikda ishlang. 
                /bahor yozing — AI vazifalar, qarorlar va xulosalarni chiqaradi.
              </p>
              
              <div className="space-y-4">
                {[
                  { icon: <MessageSquare className="w-4 h-4" />, title: "Guruh chati", desc: "Telegram uslubida tezkor xabarlar" },
                  { icon: <Sparkles className="w-4 h-4" />, title: "/bahor AI yordami", desc: "Suhbatni tahlil qilish, vazifa chiqarish" },
                  { icon: <FileText className="w-4 h-4" />, title: "Fayl almashish", desc: "Hujjatlarni yuklang, AI tahlil qilsin" },
                  { icon: <Shield className="w-4 h-4" />, title: "Xavfsiz va maxfiy", desc: "Faqat a'zolar ko'rishi mumkin" },
                ].map((item) => (
                  <div key={item.title} className="flex items-start gap-3 group">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary/20 transition-colors">
                      {item.icon}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">{item.title}</h4>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              
              <Button onClick={handleOpenApp} className="mt-8 rounded-xl h-11 px-6 font-medium shadow-lg shadow-primary/20">
                Doira yaratish
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
            
            {/* Circles Mockup */}
            <GlassCard className="p-5 max-w-md mx-auto" hover={false}>
              <div className="flex items-center gap-3 pb-3 border-b border-white/[0.05] mb-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-lg">📊</div>
                <div>
                  <span className="font-semibold text-sm text-foreground">Marketing jamoasi</span>
                  <span className="text-xs text-muted-foreground block">6 a'zo</span>
                </div>
                <div className="flex -space-x-1.5 ml-auto">
                  <img src="https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=64&h=64&fit=crop&crop=face" alt="" className="w-6 h-6 rounded-full border-2 border-background" />
                  <img src="https://images.unsplash.com/photo-1580489944761-15a19d654956?w=64&h=64&fit=crop&crop=face" alt="" className="w-6 h-6 rounded-full border-2 border-background" />
                  <div className="w-6 h-6 rounded-full bg-orange-500 border-2 border-background flex items-center justify-center text-[8px] text-white">+4</div>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <div className="w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center text-[9px] text-white shrink-0">JA</div>
                  <div className="bg-secondary/60 rounded-xl rounded-tl-sm px-3 py-2 text-xs text-foreground">
                    <span className="text-primary font-medium">/bahor</span> shu hafta qanday vazifalar qoldi?
                  </div>
                </div>
                
                <div className="flex items-start gap-2">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center overflow-hidden p-0.5 shrink-0">
                    <img src={bahorLogo} alt="" className="w-full h-full" />
                  </div>
                  <div className="bg-primary/10 border border-primary/20 rounded-xl rounded-tl-sm px-3 py-2 text-xs text-foreground">
                    📋 3 ta vazifa:<br/>
                    1. Prezentatsiya ✅<br/>
                    2. Byudjet hisob-kitobi<br/>
                    3. Mijozlar uchrashuvi
                  </div>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-20 sm:py-28">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4 tracking-tight">
              Oddiy narxlar
            </h2>
            <p className="text-lg text-muted-foreground">
              Bepul boshlang, kerak bo'lganda yangilang
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            <PricingCard
              name="Bepul"
              price="0"
              features={[
                "Kuniga 5 ta so'rov",
                "Asosiy rejimlar",
                "Oddiy web qidiruv",
              ]}
              cta="Boshlash"
              onAction={handleOpenApp}
            />
            
            <PricingCard
              name="Premium"
              price="49,000"
              features={[
                "Kuniga 200 ta so'rov",
                "Barcha rejimlar",
                "Cheksiz rasm yaratish",
                "PDF asboblar to'plami",
                "Tezkor javoblar",
              ]}
              cta="Tez kunda"
              popular
              onAction={() => {}}
            />
            
            <PricingCard
              name="Yillik"
              price="340,000"
              features={[
                "Premium + 30% tejash",
                "Ustuvor yordam",
                "API kirish",
              ]}
              cta="Tez kunda"
              onAction={() => {}}
            />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 sm:py-28">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4 tracking-tight">
              Ko'p so'raladigan savollar
            </h2>
          </div>
          
          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((faq, idx) => (
              <AccordionItem 
                key={idx} 
                value={`faq-${idx}`}
                className="rounded-xl bg-white/[0.03] border border-white/[0.08] px-6 overflow-hidden"
              >
                <AccordionTrigger className="text-left text-foreground hover:no-underline py-5">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-5">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 sm:py-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <GlassCard className="p-8 sm:p-12" hover={false}>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-4 tracking-tight">
              O'zbek tilidagi eng aqlli yordamchi
            </h2>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
              Bepul sinab ko'ring — ro'yxatdan o'tish 30 soniya.
            </p>
            <Button 
              onClick={handleOpenApp} 
              size="lg" 
              className="h-12 px-8 rounded-full font-semibold text-base shadow-[0_0_40px_-10px_hsl(var(--primary)/0.5)]"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Hozir boshlash
            </Button>
          </GlassCard>
        </div>
      </section>

      <AppFooter />
    </div>
  );
}
