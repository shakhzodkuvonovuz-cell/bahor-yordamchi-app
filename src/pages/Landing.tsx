import React, { useEffect, useState } from "react";
import { SEO } from "@/components/SEO";
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
  ArrowLeft,
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
  Paperclip,
  Camera,
  Mic,
  ChevronRight,
} from "lucide-react";
import { PremiumInterestModal } from "@/components/PremiumInterestModal";
import bahorLogo from "@/assets/bahor-logo.png";
import samarkandImage from "@/assets/landing/samarkand-registan.jpg";
import tashkentImage from "@/assets/landing/tashkent-night.jpg";
import suzaniImage from "@/assets/landing/uzbek-suzani.jpg";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useTranslation } from "@/i18n/LanguageProvider";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { AppFooter } from "@/components/layout/AppFooter";
import { prefetchCriticalRoutes } from "@/lib/routePrefetch";

// Hero mockup with 3-page carousel showing real use cases
function HeroMockup() {
  const { t } = useTranslation();
  const [activeSlide, setActiveSlide] = React.useState(0);
  const [mousePosition, setMousePosition] = React.useState({ x: 0, y: 0 });
  const containerRef = React.useRef<HTMLDivElement>(null);
  
  // Auto-rotate slides every 5 seconds
  React.useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % 3);
    }, 5000);
    return () => clearInterval(timer);
  }, []);
  
  // Mouse parallax effect (desktop only, throttled for performance)
  const lastFrameRef = React.useRef(0);
  const handleMouseMove = React.useCallback((e: React.MouseEvent) => {
    // Skip on mobile or if throttled
    if (window.innerWidth < 768) return;
    const now = performance.now();
    if (now - lastFrameRef.current < 16) return; // ~60fps throttle
    lastFrameRef.current = now;
    
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2);
    const y = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2);
    setMousePosition({ x: x * 8, y: y * 8 }); // Max 8deg tilt
  }, []);
  
  const handleMouseLeave = React.useCallback(() => {
    setMousePosition({ x: 0, y: 0 });
  }, []);
  
  const slides = [
    { id: 'web', label: t('mockup.slide.web') },
    { id: 'image', label: t('mockup.slide.image') },
    { id: 'pdf', label: t('mockup.slide.pdf') },
  ];
  
  return (
    <div 
      ref={containerRef}
      className="relative w-full max-w-md mx-auto perspective-1000"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Background decorations - optimized for mobile (smaller blur, fewer orbs) */}
      {/* Gradient mesh orbs - mobile gets 1 smaller orb, desktop gets full effect */}
      <div className="absolute -top-12 -left-12 w-24 h-24 md:-top-20 md:-left-20 md:w-40 md:h-40 bg-primary/15 rounded-full blur-2xl md:blur-3xl animate-pulse" />
      <div className="hidden sm:block absolute -bottom-16 -right-16 w-32 h-32 bg-primary/10 rounded-full blur-2xl animate-[pulse_3s_ease-in-out_infinite_0.5s]" />
      <div className="hidden md:block absolute top-1/2 -left-24 w-24 h-24 bg-accent/20 rounded-full blur-2xl animate-[pulse_4s_ease-in-out_infinite_1s]" />
      
      {/* Floating particles - mobile gets 2 static dots, desktop gets animated */}
      <div className="absolute top-8 right-0 w-1.5 h-1.5 md:w-2 md:h-2 bg-primary/40 rounded-full md:animate-[float-slow_6s_ease-in-out_infinite]" />
      <div className="absolute bottom-8 left-4 w-1 h-1 md:w-1.5 md:h-1.5 bg-accent/40 rounded-full md:animate-[float-slow_7s_ease-in-out_infinite_0.3s]" />
      <div className="hidden md:block absolute top-1/3 -left-8 w-1.5 h-1.5 bg-primary/30 rounded-full animate-[float-slow_5s_ease-in-out_infinite_0.5s]" />
      <div className="hidden md:block absolute bottom-1/4 -right-4 w-1 h-1 bg-primary/50 rounded-full animate-[float-slow_4s_ease-in-out_infinite_1s]" />
      
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 -m-16 opacity-[0.03] pointer-events-none" 
        style={{
          backgroundImage: `linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />
      
      {/* Main glow effect - mobile gets static subtle glow, desktop gets parallax */}
      <div 
        className="absolute inset-0 bg-primary/10 md:bg-primary/20 rounded-full scale-75 md:scale-90 translate-y-4 md:translate-y-8 blur-2xl md:blur-3xl transition-transform duration-300 ease-out"
        style={{
          transform: window.innerWidth >= 768 
            ? `translate(${mousePosition.x * 2}px, ${mousePosition.y * 2 + 32}px) scale(0.9)`
            : 'translateY(16px) scale(0.75)',
        }}
      />
      
      {/* Main card with 3D tilt */}
      <div 
        className="relative glass-premium rounded-2xl shadow-glow-lg border border-border/40 overflow-hidden transition-transform duration-300 ease-out will-change-transform"
        style={{
          transform: `rotateY(${mousePosition.x}deg) rotateX(${-mousePosition.y}deg) translateZ(0)`,
        }}
      >
        {/* Header bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/30 bg-card/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-secondary/60 flex items-center justify-center">
              <ArrowLeft className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex items-center gap-2">
              <img src={bahorLogo} alt="Bahor AI" className="w-6 h-6 object-contain" />
              <span className="font-semibold text-foreground text-sm">Bahor AI</span>
            </div>
          </div>
          {/* Model toggle */}
          <div className="flex items-center gap-0.5 bg-secondary/60 rounded-lg p-0.5">
            <span className="text-[10px] px-2.5 py-1 rounded-md bg-background text-foreground font-medium">Tez</span>
            <span className="text-[10px] px-2.5 py-1 rounded-md text-muted-foreground">Aqlli</span>
          </div>
        </div>
        
        {/* Slide content */}
        <div className="p-4 min-h-[320px]">
          {/* Slide 1: Web Search */}
          {activeSlide === 0 && (
            <div className="space-y-3">
              {/* User message */}
              <div className="flex justify-end opacity-0 animate-[fade-in_0.4s_ease-out_0.1s_forwards]">
                <div className="bg-primary/15 border border-primary/30 text-foreground px-4 py-2.5 rounded-2xl rounded-tr-sm max-w-[85%]">
                  <p className="text-sm">{t('mockup.web.userMessage')}</p>
                </div>
              </div>
              
              {/* ThinkBar */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary/50 border border-border/30 w-fit opacity-0 animate-[fade-in_0.4s_ease-out_0.3s_forwards]">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs text-muted-foreground">{t('mockup.web.searching')}</span>
                <div className="flex items-center gap-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-[pulse_1.4s_ease-in-out_infinite]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-[pulse_1.4s_ease-in-out_0.2s_infinite]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-[pulse_1.4s_ease-in-out_0.4s_infinite]" />
                </div>
              </div>
              
              {/* Sources row */}
              <div className="space-y-2 opacity-0 animate-[fade-in_0.4s_ease-out_0.5s_forwards]">
                <div className="flex items-center gap-2">
                  <Search className="w-3 h-3 text-primary" />
                  <span className="text-[10px] text-muted-foreground">{t('mockup.web.sourcesFound')}</span>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  <span className="text-[10px] px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center gap-1 cursor-pointer hover:bg-primary/20 hover:scale-105 transition-all duration-200">
                    <ExternalLink className="w-2.5 h-2.5" />gazeta.uz
                  </span>
                  <span className="text-[10px] px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center gap-1 cursor-pointer hover:bg-primary/20 hover:scale-105 transition-all duration-200">
                    <ExternalLink className="w-2.5 h-2.5" />review.uz
                  </span>
                  <span className="text-[10px] px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center gap-1 cursor-pointer hover:bg-primary/20 hover:scale-105 transition-all duration-200">
                    <ExternalLink className="w-2.5 h-2.5" />lex.uz
                  </span>
                </div>
              </div>
              
              {/* AI response - collapsed */}
              <div className="space-y-2 opacity-0 animate-[fade-in_0.4s_ease-out_0.7s_forwards]">
                <p className="text-sm font-medium text-foreground">{t('mockup.web.aiTitle')}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {t('mockup.web.aiPreview')}
                </p>
                
                {/* Fade gradient for truncated content */}
                <div className="relative h-6 -mt-4">
                  <div className="absolute inset-0 bg-gradient-to-t from-card via-card/80 to-transparent" />
                </div>
                
                {/* Expand button */}
                <button className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 hover:translate-y-0.5 transition-all duration-200 -mt-2">
                  <svg className="w-3.5 h-3.5 transition-transform group-hover:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  {t('mockup.web.showMore')}
                </button>
                
                {/* Action buttons */}
                <div className="flex items-center gap-1 pt-1 opacity-0 animate-[fade-in_0.4s_ease-out_0.9s_forwards]">
                  <button className="p-1.5 rounded-lg hover:bg-secondary/60 hover:scale-110 transition-all duration-200 text-muted-foreground hover:text-foreground">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                  </button>
                  <button className="p-1.5 rounded-lg hover:bg-secondary/60 hover:scale-110 transition-all duration-200 text-muted-foreground hover:text-foreground">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                  </button>
                  <button className="p-1.5 rounded-lg hover:bg-secondary/60 hover:scale-110 transition-all duration-200 text-muted-foreground hover:text-foreground">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" /></svg>
                  </button>
                  <button className="p-1.5 rounded-lg hover:bg-secondary/60 hover:scale-110 transition-all duration-200 text-muted-foreground hover:text-foreground">
                    <FileText className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Slide 2: Image Generation */}
          {activeSlide === 1 && (
            <div className="space-y-3">
              {/* User message */}
              <div className="flex justify-end opacity-0 animate-[fade-in_0.4s_ease-out_0.1s_forwards]">
                <div className="bg-primary/15 border border-primary/30 text-foreground px-4 py-2.5 rounded-2xl rounded-tr-sm max-w-[85%]">
                  <p className="text-sm">{t('mockup.image.userMessage')}</p>
                </div>
              </div>
              
              {/* ThinkBar - generating */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary/50 border border-border/30 w-fit opacity-0 animate-[fade-in_0.4s_ease-out_0.3s_forwards]">
                <ImagePlus className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs text-muted-foreground">{t('mockup.image.generating')}</span>
                <div className="flex items-center gap-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-[pulse_1.4s_ease-in-out_infinite]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-[pulse_1.4s_ease-in-out_0.2s_infinite]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-[pulse_1.4s_ease-in-out_0.4s_infinite]" />
                </div>
              </div>
              
              {/* AI response with generated image */}
              <div className="space-y-2 opacity-0 animate-[fade-in_0.4s_ease-out_0.5s_forwards]">
                <p className="text-xs text-muted-foreground">{t('mockup.image.aiResponse')}</p>
                
                {/* Generated image preview */}
                <div className="relative rounded-xl overflow-hidden border border-border/40 bg-secondary/30 opacity-0 animate-[scale-in_0.5s_ease-out_0.7s_forwards]">
                  <img 
                    src={samarkandImage} 
                    alt="Generated Registan"
                    width={400}
                    height={144}
                    loading="lazy"
                    className="w-full h-36 object-cover"
                  />
                  {/* Image overlay actions */}
                  <div className="absolute bottom-2 right-2 flex gap-1.5">
                    <button className="p-1.5 rounded-lg bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 hover:scale-110 transition-all duration-200">
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button className="p-1.5 rounded-lg bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 hover:scale-110 transition-all duration-200">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                
                {/* Action buttons */}
                <div className="flex items-center gap-1 pt-1 opacity-0 animate-[fade-in_0.4s_ease-out_0.9s_forwards]">
                  <button className="p-1.5 rounded-lg hover:bg-secondary/60 hover:scale-110 transition-all duration-200 text-muted-foreground hover:text-foreground">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                  </button>
                  <button className="p-1.5 rounded-lg hover:bg-secondary/60 hover:scale-110 transition-all duration-200 text-muted-foreground hover:text-foreground">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" /></svg>
                  </button>
                  <button className="p-1.5 rounded-lg hover:bg-secondary/60 hover:scale-110 transition-all duration-200 text-muted-foreground hover:text-foreground">
                    <FileText className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              
              {/* Follow-up suggestions */}
              <div className="flex gap-2 flex-wrap pt-1 opacity-0 animate-[fade-in_0.4s_ease-out_1.1s_forwards]">
                <button className="text-[10px] px-3 py-1.5 rounded-full bg-secondary/50 border border-border/40 text-muted-foreground hover:bg-secondary hover:text-foreground hover:scale-105 transition-all duration-200">
                  {t('mockup.image.suggestion1')}
                </button>
                <button className="text-[10px] px-3 py-1.5 rounded-full bg-secondary/50 border border-border/40 text-muted-foreground hover:bg-secondary hover:text-foreground hover:scale-105 transition-all duration-200">
                  {t('mockup.image.suggestion2')}
                </button>
              </div>
            </div>
          )}
          
          {/* Slide 3: Text to PDF */}
          {activeSlide === 2 && (
            <div className="space-y-3">
              {/* Previous AI response (truncated) */}
              <div className="space-y-1 pb-2 border-b border-border/30 opacity-0 animate-[fade-in_0.4s_ease-out_0.1s_forwards]">
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                  {t('mockup.pdf.previousResponse')}
                </p>
                <button className="inline-flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 hover:translate-y-0.5 transition-all duration-200">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  {t('mockup.web.showMore')}
                </button>
              </div>
              
              {/* User message */}
              <div className="flex justify-end opacity-0 animate-[fade-in_0.4s_ease-out_0.3s_forwards]">
                <div className="bg-primary/15 border border-primary/30 text-foreground px-4 py-2.5 rounded-2xl rounded-tr-sm max-w-[85%]">
                  <p className="text-sm">{t('mockup.pdf.userMessage')}</p>
                </div>
              </div>
              
              {/* ThinkBar - creating file */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary/50 border border-border/30 w-fit opacity-0 animate-[fade-in_0.4s_ease-out_0.5s_forwards]">
                <FileText className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs text-muted-foreground">{t('mockup.pdf.creating')}</span>
                <div className="flex items-center gap-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-[pulse_1.4s_ease-in-out_infinite]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-[pulse_1.4s_ease-in-out_0.2s_infinite]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-[pulse_1.4s_ease-in-out_0.4s_infinite]" />
                </div>
              </div>
              
              {/* AI response with PDF file */}
              <div className="space-y-2 opacity-0 animate-[fade-in_0.4s_ease-out_0.7s_forwards]">
                <p className="text-xs text-muted-foreground">{t('mockup.pdf.aiResponse')}</p>
                
                {/* PDF file card */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/40 border border-border/40 opacity-0 animate-[scale-in_0.5s_ease-out_0.9s_forwards] hover:bg-secondary/60 transition-colors cursor-pointer group">
                  <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-200">
                    <FileText className="w-5 h-5 text-red-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{t('mockup.pdf.fileName')}</p>
                    <p className="text-[10px] text-muted-foreground">PDF • 24 KB</p>
                  </div>
                  <button className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 hover:scale-110 transition-all duration-200">
                    <Download className="w-4 h-4" />
                  </button>
                </div>
                
                {/* Action buttons */}
                <div className="flex items-center gap-1 pt-1 opacity-0 animate-[fade-in_0.4s_ease-out_1.1s_forwards]">
                  <button className="p-1.5 rounded-lg hover:bg-secondary/60 hover:scale-110 transition-all duration-200 text-muted-foreground hover:text-foreground">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                  </button>
                  <button className="p-1.5 rounded-lg hover:bg-secondary/60 hover:scale-110 transition-all duration-200 text-muted-foreground hover:text-foreground">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" /></svg>
                  </button>
                </div>
              </div>
              
              {/* Follow-up suggestions */}
              <div className="flex gap-2 flex-wrap pt-1 opacity-0 animate-[fade-in_0.4s_ease-out_1.3s_forwards]">
                <button className="text-[10px] px-3 py-1.5 rounded-full bg-secondary/50 border border-border/40 text-muted-foreground hover:bg-secondary hover:text-foreground hover:scale-105 transition-all duration-200">
                  {t('mockup.pdf.suggestion1')}
                </button>
                <button className="text-[10px] px-3 py-1.5 rounded-full bg-secondary/50 border border-border/40 text-muted-foreground hover:bg-secondary hover:text-foreground hover:scale-105 transition-all duration-200">
                  {t('mockup.pdf.suggestion2')}
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Small dot indicators inside card */}
        <div className="flex items-center justify-center gap-1.5 pb-3">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setActiveSlide(idx)}
              className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                activeSlide === idx
                  ? 'bg-primary w-4'
                  : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
              }`}
            />
          ))}
        </div>
        
        {/* Input area */}
        <div className="px-4 py-3 border-t border-border/30 bg-card/30">
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-lg hover:bg-secondary/60 transition-colors text-muted-foreground">
              <Paperclip className="w-4 h-4" />
            </button>
            <button className="p-2 rounded-lg hover:bg-secondary/60 transition-colors text-muted-foreground">
              <Camera className="w-4 h-4" />
            </button>
            <div className="flex-1 bg-secondary/40 rounded-xl px-4 py-2.5 border border-border/30">
              <span className="text-sm text-muted-foreground">{t('chat.input.placeholder')}</span>
            </div>
            <button className="p-2 rounded-lg hover:bg-secondary/60 transition-colors text-muted-foreground">
              <Mic className="w-4 h-4" />
            </button>
            <button className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
              <Send className="w-4 h-4 text-primary-foreground" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Feature tabs below mockup */}
      <div className="flex items-center justify-center gap-2 mt-6">
        {slides.map((slide, idx) => (
          <button
            key={slide.id}
            onClick={() => setActiveSlide(idx)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
              activeSlide === idx
                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30'
                : 'bg-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {slide.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  
  // Premium interest modal state
  const [premiumModalOpen, setPremiumModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "yearly">("monthly");
  
  // Prefetch critical routes after landing loads for instant navigation
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

  // Pricing plans - updated CTAs
  const pricingPlans = [
    {
      name: t('pricing.free.name'),
      price: "0",
      features: [t('landing.pricing.free.f1'), t('landing.pricing.free.f2'), t('landing.pricing.free.f3')],
      cta: t('button.start'),
      action: "start" as const,
    },
    {
      name: t('pricing.monthly.name'),
      price: "49,000",
      features: [t('landing.pricing.monthly.f1'), t('landing.pricing.monthly.f2'), t('landing.pricing.monthly.f3'), t('landing.pricing.monthly.f4'), t('landing.pricing.monthly.f5')],
      cta: t('premium.interest.monthlyBtn') || "Premiumga qiziqaman",
      action: "interest_monthly" as const,
      highlighted: true,
      badge: t('pricing.monthly.badge'),
    },
    {
      name: t('pricing.yearly.name'),
      price: "340,000",
      features: [t('landing.pricing.yearly.f1'), t('landing.pricing.yearly.f2'), t('landing.pricing.yearly.f3')],
      cta: t('premium.interest.yearlyBtn') || "Yillik reja (42% tejash)",
      action: "interest_yearly" as const,
      badge: t('pricing.yearly.badge'),
    },
  ];

  // Real AI-generated image gallery
  const imageGallery = [
    { label: "Samarqand", image: samarkandImage },
    { label: "Toshkent", image: tashkentImage },
    { label: "Suzani", image: suzaniImage },
  ];

  // Source chips
  const sourceChips = ['kun.uz', 'gazeta.uz', 'lex.uz'];

  return (
    <>
      <SEO url="/" />
      <div className="min-h-screen bg-background relative overflow-x-hidden">
      {/* Background - reduced fog/blur for crisper look */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary/4 rounded-full blur-[80px]" />
        <div className="absolute top-1/3 right-0 w-[500px] h-[500px] bg-primary/3 rounded-full blur-[70px]" />
      </div>
      
      {/* Sticky Header with Nav */}
      <header className="glass-strong sticky top-0 z-50 border-b border-border/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          {/* Logo - ~30% larger for visual presence */}
          <div className="flex items-center gap-3">
            <img src={bahorLogo} alt="Bahor AI" className="h-12 sm:h-14 w-auto" />
            <span className="text-[1.4rem] sm:text-[1.7rem] font-bold text-foreground tracking-tight">Bahor AI</span>
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

      {/* HERO — 2-column, premium dense layout */}
      <section className="relative pt-4 pb-8 sm:pt-6 sm:pb-12 lg:pt-8 lg:pb-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            ref={heroRef.ref}
            className={`grid lg:grid-cols-[1fr_1.1fr] gap-8 lg:gap-12 items-center transition-all duration-700 ${
              heroRef.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
          >
            {/* Left - Content (wider column, max-w ~620px) */}
            <div className="text-center lg:text-left max-w-[620px] lg:max-w-none">
              {/* Beta badge - tighter margin */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-3">
                <Sparkles className="w-4 h-4" />
                {t('badge.beta')}
              </div>
              
              {/* Headline - slightly larger, tighter line-height */}
              <h1 className="text-[1.75rem] sm:text-4xl lg:text-[2.75rem] xl:text-5xl font-bold mb-3 sm:mb-4 text-foreground leading-[1.15] tracking-tight">
                {t('landing.hero.headline')}
              </h1>
              
              {/* Subheadline - slightly larger max-width */}
              <p className="text-base sm:text-lg text-muted-foreground mb-5 max-w-xl mx-auto lg:mx-0">
                {t('landing.hero.subheadline')}
              </p>
              
              {/* 3 bullet value props - improved spacing and line-height */}
              <ul className="space-y-3 mb-5 text-left max-w-xl mx-auto lg:mx-0">
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-foreground leading-relaxed">{t('landing.hero.bullet1')}</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-foreground leading-relaxed">{t('landing.hero.bullet2')}</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-foreground leading-relaxed">{t('landing.hero.bullet3')}</span>
                </li>
              </ul>
              
              {/* CTA row - taller buttons, consistent radius */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mb-4">
                <Button onClick={handleOpenApp} size="lg" className="h-12 md:h-13 px-6 font-semibold rounded-xl shadow-lg shadow-primary/25 hover-lift">
                  <MessageSquare className="w-5 h-5 mr-2" />
                  {t('button.openApp')}
                </Button>
                <Button variant="outline" size="lg" className="h-12 md:h-13 px-6 font-medium rounded-xl" onClick={() => scrollToSection('features')}>
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
            
            {/* Right - Mockup (10-15% larger on desktop) */}
            <div className="mt-2 lg:mt-0 lg:scale-[1.1] lg:origin-center">
              <HeroMockup />
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 1 — Asosiy imkoniyatlar (2-column feature list with dividers) */}
      <section id="features" className="py-16 md:py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div ref={featuresRef.ref} className={`text-center mb-10 transition-all duration-600 ${featuresRef.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            <h2 className="text-3xl md:text-5xl font-semibold tracking-tight mb-3 text-foreground">{t('landing.features.title')}</h2>
            <p className="text-white/70 max-w-xl mx-auto">{t('landing.features.subtitle')}</p>
          </div>
          
          {/* 2-column feature list with dividers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
            {features.map((f, i) => (
              <div
                key={i}
                className={`group flex items-center gap-4 py-5 px-4 border-b border-white/10 transition-all duration-500 hover:bg-white/[0.02] ${
                  featuresRef.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
                } ${i % 2 === 0 ? 'md:border-r md:border-white/10' : ''}`}
                style={{ transitionDelay: `${i * 60}ms` }}
              >
                {/* Icon in soft square */}
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 group-hover:bg-primary/20 group-hover:shadow-lg group-hover:shadow-primary/10 transition-all duration-300">
                  {f.icon}
                </div>
                
                {/* Title + description */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">{f.title}</h3>
                    {f.badge && (
                      <span className="px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold">
                        {f.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-white/60 leading-relaxed">{f.desc}</p>
                </div>
                
                {/* Arrow */}
                <ChevronRight className="w-5 h-5 text-white/30 group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-300 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 2 — Rasm yaratish (AI) - premium gallery look */}
      <section id="image-gen" className="py-16 md:py-20 relative">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div ref={imageGenRef.ref} className={`grid lg:grid-cols-2 gap-10 items-center transition-all duration-700 ${imageGenRef.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
            {/* Content */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium mb-4">
                <ImagePlus className="w-3.5 h-3.5" />
                {t('landing.badge.new')}
              </div>
              <h2 className="text-3xl md:text-5xl font-semibold tracking-tight mb-4 text-foreground">{t('landing.imageGen.title')}</h2>
              <ul className="space-y-4 mb-6">
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary mt-0.5" />
                  <span className="text-white/70">{t('landing.imageGen.bullet1')}</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary mt-0.5" />
                  <span className="text-white/70">{t('landing.imageGen.bullet2')}</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary mt-0.5" />
                  <span className="text-white/70">{t('landing.imageGen.bullet3')}</span>
                </li>
              </ul>
              <Button onClick={handleOpenApp} className="h-12 px-6 rounded-xl font-medium shadow-lg shadow-primary/20">
                {t('landing.imageGen.cta')}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
            
            {/* Premium gallery with staggered overlap effect - 20-30% larger */}
            <div className="flex items-end gap-3 justify-center lg:justify-end">
              {imageGallery.map((img, i) => (
                <div
                  key={i}
                  className={`rounded-xl overflow-hidden border border-white/10 relative group transition-all duration-500 hover:translate-y-[-4px] hover:shadow-xl hover:shadow-primary/10 ${
                    imageGenRef.isVisible ? "opacity-100 scale-100" : "opacity-0 scale-90"
                  } ${i === 1 ? 'w-36 h-44 sm:w-40 sm:h-48 -mb-4' : 'w-28 h-36 sm:w-32 sm:h-40'}`}
                  style={{ transitionDelay: `${200 + i * 100}ms` }}
                >
                  <img 
                    src={img.image} 
                    alt={img.label}
                    width={160}
                    height={192}
                    loading="lazy" 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                    <span className="text-xs text-white font-medium">{img.label}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3 — Doiralar (Circles) - improved clarity */}
      <section id="circles" className="py-16 md:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div ref={circlesRef.ref} className={`grid lg:grid-cols-2 gap-8 lg:gap-12 items-start transition-all duration-700 ${circlesRef.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
            {/* Realistic Circles Mockup - sharper edges/contrast */}
            <div className={`order-2 lg:order-1 transition-all duration-700 ${circlesRef.isVisible ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}>
              <div className="rounded-2xl p-4 sm:p-5 border border-white/15 bg-card/80 backdrop-blur-sm max-w-lg mx-auto shadow-2xl">
                {/* Header with back button, emoji, title, members, and avatars */}
                <div className="flex items-center gap-3 pb-3 border-b border-border/30 mb-3">
                  {/* Back button */}
                  <button className="p-1.5 rounded-lg hover:bg-secondary/60 transition-colors group">
                    <ArrowLeft className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </button>
                  {/* Circle emoji icon */}
                  <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-base">
                    📊
                  </div>
                  {/* Title and member count */}
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-sm text-foreground block truncate">{t('landing.circles.mockupTitle')}</span>
                    <span className="text-xs text-muted-foreground">6 {t('landing.circles.members')}</span>
                  </div>
                  {/* Online members mini avatars */}
                  <div className="flex -space-x-1.5">
                    <img src="https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=64&h=64&fit=crop&crop=face" alt="" loading="lazy" className="w-7 h-7 rounded-full border-2 border-background object-cover" />
                    <img src="https://images.unsplash.com/photo-1580489944761-15a19d654956?w=64&h=64&fit=crop&crop=face" alt="" loading="lazy" className="w-7 h-7 rounded-full border-2 border-background object-cover" />
                    <div className="w-7 h-7 rounded-full bg-orange-500 border-2 border-background flex items-center justify-center text-[9px] text-white font-medium">JA</div>
                    <div className="w-7 h-7 rounded-full bg-green-500 border-2 border-background flex items-center justify-center text-[9px] text-white font-medium">NK</div>
                    <div className="w-7 h-7 rounded-full bg-purple-500 border-2 border-background flex items-center justify-center text-[9px] text-white font-medium">SU</div>
                    <div className="w-7 h-7 rounded-full bg-pink-500 border-2 border-background flex items-center justify-center text-[9px] text-white font-medium">+1</div>
                  </div>
                </div>
                
                {/* Tabs: Chat, Fayllar, AI natijalar */}
                <div className="flex gap-1 p-1 rounded-xl bg-secondary/50 mb-3">
                  {[
                    { label: 'Chat', active: true },
                    { label: 'Fayllar', active: false },
                    { label: t('landing.circles.aiResults'), active: false }
                  ].map((tab) => (
                    <div 
                      key={tab.label} 
                      className={`flex-1 py-2 rounded-lg text-center text-xs font-medium transition-all cursor-pointer ${
                        tab.active 
                          ? 'bg-primary text-primary-foreground shadow-sm' 
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {tab.label}
                    </div>
                  ))}
                </div>
                
                {/* AI Action buttons */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {circleOutcomes.map((outcome) => (
                    <span 
                      key={outcome} 
                      className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20 hover:bg-primary/20 transition-colors cursor-pointer"
                    >
                      {outcome}
                    </span>
                  ))}
                </div>
                
                {/* Chat messages */}
                <div className="space-y-3 mb-3">
                  {/* User message 1 */}
                  <div className="flex items-start gap-2.5">
                    <img 
                      src="https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=64&h=64&fit=crop&crop=face" 
                      alt="Asror" 
                      className="w-8 h-8 rounded-full object-cover shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-foreground">Asror</span>
                        <span className="text-[10px] text-muted-foreground">10:32</span>
                      </div>
                      <div className="bg-secondary/60 rounded-xl rounded-tl-sm px-3 py-2 text-xs text-foreground">
                        Ertangi uchrashuv uchun prezentatsiya tayyor bo'ldimi?
                      </div>
                    </div>
                  </div>
                  
                  {/* User message 2 */}
                  <div className="flex items-start gap-2.5">
                    <img 
                      src="https://images.unsplash.com/photo-1580489944761-15a19d654956?w=64&h=64&fit=crop&crop=face" 
                      alt="Dilnoza" 
                      className="w-8 h-8 rounded-full object-cover shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-foreground">Dilnoza</span>
                        <span className="text-[10px] text-muted-foreground">10:34</span>
                      </div>
                      <div className="bg-secondary/60 rounded-xl rounded-tl-sm px-3 py-2 text-xs text-foreground">
                        Ha, faylga yuklab qo'ydim ✓
                      </div>
                    </div>
                  </div>
                  
                  {/* /bahor AI request */}
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-[10px] text-white font-medium shrink-0">
                      JA
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-foreground">Jamshid</span>
                        <span className="text-[10px] text-muted-foreground">10:35</span>
                      </div>
                      <div className="bg-secondary/60 rounded-xl rounded-tl-sm px-3 py-2 text-xs text-foreground">
                        <span className="text-primary font-medium">/bahor</span> shu hafta qanday vazifalar qoldi?
                      </div>
                    </div>
                  </div>
                  
                  {/* Bahor AI response */}
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center shrink-0 ring-1 ring-primary/20 overflow-hidden p-0.5">
                      <img src={bahorLogo} alt="Bahor AI" className="w-full h-full object-contain" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-primary">Bahor AI</span>
                        <Sparkles className="w-3 h-3 text-primary" />
                        <span className="text-[10px] text-muted-foreground">10:35</span>
                      </div>
                      <div className="bg-primary/10 border border-primary/20 rounded-xl rounded-tl-sm px-3 py-2.5 text-xs text-foreground leading-relaxed">
                        📋 Shu hafta uchun 3 ta vazifa:<br/>
                        1. Prezentatsiya tayyorlash ✅<br/>
                        2. Byudjet hisob-kitobi<br/>
                        3. Mijozlar bilan uchrashuv
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Input area */}
                <div className="pt-3 border-t border-border/30">
                  <div className="flex items-center gap-2">
                    <button className="p-2 rounded-xl bg-secondary/60 hover:bg-secondary transition-colors">
                      <Paperclip className="w-4 h-4 text-muted-foreground" />
                    </button>
                    <button className="p-2 rounded-xl bg-secondary/60 hover:bg-secondary transition-colors">
                      <Camera className="w-4 h-4 text-muted-foreground" />
                    </button>
                    <div className="flex-1 px-3 py-2 rounded-xl bg-secondary/50 text-xs text-muted-foreground">
                      {t('landing.circles.inputPlaceholder')}
                    </div>
                    <button className="p-2 rounded-xl bg-secondary/60 hover:bg-secondary transition-colors">
                      <Mic className="w-4 h-4 text-muted-foreground" />
                    </button>
                    <button className="p-2 rounded-xl bg-primary shadow-lg shadow-primary/20">
                      <Send className="w-4 h-4 text-primary-foreground" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Content with key features explanation */}
            <div className="order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium mb-4">
                <Users className="w-3.5 h-3.5" />
                {t('landing.circles.badge')}
              </div>
              <h2 className="text-3xl md:text-5xl font-semibold tracking-tight mb-4 text-foreground">{t('landing.circles.title')}</h2>
              <p className="text-white/70 mb-6">{t('landing.circles.desc')}</p>
              
              {/* Key Features List - improved spacing */}
              <div className="space-y-5 mb-6">
                <div className="flex items-start gap-3 group">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                    <MessageSquare className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-0.5">{t('landing.circles.feature.chat')}</h4>
                    <p className="text-xs text-white/60">{t('landing.circles.feature.chatDesc')}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 group">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                    <Sparkles className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-0.5">{t('landing.circles.feature.ai')}</h4>
                    <p className="text-xs text-white/60">{t('landing.circles.feature.aiDesc')}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 group">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                    <FileText className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-0.5">{t('landing.circles.feature.files')}</h4>
                    <p className="text-xs text-white/60">{t('landing.circles.feature.filesDesc')}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 group">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                    <ListTodo className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-0.5">{t('landing.circles.feature.outcomes')}</h4>
                    <p className="text-xs text-white/60">{t('landing.circles.feature.outcomesDesc')}</p>
                  </div>
                </div>
              </div>
              
              <p className="text-sm text-muted-foreground mb-2">{t('landing.circles.templates')}</p>
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span className="px-2 py-1 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer">📚 Study</span>
                <span className="px-2 py-1 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer">💼 Work</span>
                <span className="px-2 py-1 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer">👨‍👩‍👧‍👦 Family</span>
                <span className="px-2 py-1 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer">🎨 Creator</span>
                <span className="px-2 py-1 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer">🏪 Small Biz</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4 — Qanday ishlaydi (4 steps) - reduced padding, lighter trust box */}
      <section className="py-14 md:py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div ref={stepsRef.ref} className={`text-center mb-10 transition-all duration-600 ${stepsRef.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            <h2 className="text-3xl md:text-5xl font-semibold tracking-tight mb-3 text-foreground">{t('section.howItWorks')}</h2>
            <p className="text-white/70">{t('section.howItWorks.subtitle.4steps')}</p>
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
                <p className="text-xs text-white/60">{step.desc}</p>
              </div>
            ))}
          </div>
          
          {/* Trust sources box - smaller, lighter */}
          <div className={`mt-10 rounded-xl p-5 border border-white/10 bg-card/50 text-center max-w-md mx-auto transition-all duration-700 ${stepsRef.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`} style={{ transitionDelay: '400ms' }}>
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary mx-auto mb-2">
              <ExternalLink className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-foreground mb-1.5 text-sm">{t('trust.title')}</h3>
            <p className="text-xs text-white/60 mb-3">{t('trust.description')}</p>
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
                  className={`w-full h-11 rounded-xl font-medium ${plan.highlighted ? "shadow-lg shadow-primary/25" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}
                  onClick={() => {
                    if (plan.action === "start") {
                      handleOpenApp();
                    } else if (plan.action === "interest_monthly") {
                      setSelectedPlan("monthly");
                      setPremiumModalOpen(true);
                    } else if (plan.action === "interest_yearly") {
                      setSelectedPlan("yearly");
                      setPremiumModalOpen(true);
                    }
                  }}
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
      
      {/* Premium Interest Modal */}
      <PremiumInterestModal 
        open={premiumModalOpen} 
        onOpenChange={setPremiumModalOpen} 
        plan={selectedPlan} 
      />
    </div>
    </>
  );
}
