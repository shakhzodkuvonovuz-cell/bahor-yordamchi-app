import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
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
  X,
  Send,
  Mic,
  Paperclip,
  Camera,
  ExternalLink,
  Download,
  Zap,
} from "lucide-react";
import bahorLogo from "@/assets/bahor-logo.png";
import samarkandImage from "@/assets/landing/samarkand-registan.jpg";
import { useTranslation } from "@/i18n/LanguageProvider";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { AppFooter } from "@/components/layout/AppFooter";
import { prefetchCriticalRoutes } from "@/lib/routePrefetch";

// Spotlight card with mouse-following gradient
function SpotlightCard({ 
  children, 
  className = "" 
}: { 
  children: React.ReactNode; 
  className?: string;
}) {
  const divRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!divRef.current) return;
    const rect = divRef.current.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, []);

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setOpacity(1)}
      onMouseLeave={() => setOpacity(0)}
      className={`relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] transition-colors duration-500 hover:border-white/[0.15] ${className}`}
    >
      {/* Spotlight gradient */}
      <div
        className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-500"
        style={{
          opacity,
          background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, rgba(45,212,191,0.06), transparent 40%)`,
        }}
      />
      {children}
    </div>
  );
}

// Hero product mockup with perspective
function HeroMockup() {
  const [activeSlide, setActiveSlide] = useState(0);
  const sources = ['kun.uz', 'gazeta.uz', 'lex.uz', 'review.uz'];
  
  useEffect(() => {
    const timer = setInterval(() => setActiveSlide((p) => (p + 1) % 3), 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative w-full max-w-5xl mx-auto mt-16 sm:mt-24">
      {/* Perspective container */}
      <div 
        className="relative"
        style={{ 
          perspective: '1500px',
          perspectiveOrigin: 'center bottom'
        }}
      >
        {/* Glow behind */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/3 w-[600px] h-[400px] bg-[#2DD4BF]/[0.08] rounded-full blur-[120px]" />
        </div>
        
        {/* The mockup */}
        <motion.div
          initial={{ opacity: 0, rotateX: 15, y: 60 }}
          animate={{ opacity: 1, rotateX: 8, y: 0 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative rounded-t-2xl border border-white/[0.1] border-b-0 bg-[#0a0a0a] overflow-hidden shadow-2xl"
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* Browser chrome */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06] bg-[#0a0a0a]">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-white/10" />
              <div className="w-3 h-3 rounded-full bg-white/10" />
              <div className="w-3 h-3 rounded-full bg-white/10" />
            </div>
            <div className="flex-1 flex justify-center">
              <div className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                <div className="w-3 h-3 rounded-full bg-[#2DD4BF]/20 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#2DD4BF]" />
                </div>
                <span className="text-xs text-gray-500">bahorai.com</span>
              </div>
            </div>
          </div>
          
          {/* App content */}
          <div className="grid grid-cols-[240px_1fr] min-h-[400px]">
            {/* Sidebar */}
            <div className="border-r border-white/[0.06] p-4 hidden sm:block">
              <div className="flex items-center gap-2 mb-6">
                <img src={bahorLogo} alt="Bahor AI" className="w-7 h-7" />
                <span className="font-semibold text-white text-sm">Bahor AI</span>
              </div>
              
              <div className="space-y-1">
                {['Yangi suhbat', 'Kodlash', 'IELTS tayyorgarlik', 'Biznes va Marketing'].map((item, i) => (
                  <div 
                    key={item}
                    className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                      i === 0 ? 'bg-white/[0.06] text-white' : 'text-gray-500 hover:text-gray-400'
                    }`}
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
            
            {/* Main chat */}
            <div className="p-6">
              {/* Chat messages */}
              <div className="space-y-4 mb-6">
                {/* User message */}
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.6, ease: "easeOut" }}
                  className="flex justify-end"
                >
                  <div className="bg-[#2DD4BF]/10 border border-[#2DD4BF]/20 px-4 py-2.5 rounded-2xl rounded-tr-md max-w-md">
                    <p className="text-sm text-white">O'zbekistonda 2024 yil uchun eng muhim iqtisodiy yangiliklar nima?</p>
                  </div>
                </motion.div>
                
                {/* Sources */}
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8, duration: 0.6, ease: "easeOut" }}
                  className="space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <Search className="w-3.5 h-3.5 text-[#2DD4BF]" />
                    <span className="text-xs text-gray-500">4 manba topildi</span>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {sources.map((s, i) => (
                      <motion.span 
                        key={s}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.9 + i * 0.1, duration: 0.4 }}
                        className="text-xs px-3 py-1.5 rounded-full bg-white/[0.04] text-gray-400 border border-white/[0.08] flex items-center gap-1.5 hover:bg-white/[0.06] transition-colors cursor-pointer"
                      >
                        <ExternalLink className="w-3 h-3" />{s}
                      </motion.span>
                    ))}
                  </div>
                </motion.div>
                
                {/* AI Response */}
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.2, duration: 0.6, ease: "easeOut" }}
                  className="space-y-3"
                >
                  <p className="text-sm font-medium text-white">📊 2024 yildagi asosiy iqtisodiy yangiliklar:</p>
                  <div className="text-sm text-gray-400 leading-relaxed space-y-2">
                    <p>1. <span className="text-gray-300">YaIM o'sishi</span> — 6.2% ga yetdi, bu mintaqadagi eng yuqori ko'rsatkich.</p>
                    <p>2. <span className="text-gray-300">Eksport</span> — 15% ga oshdi, ayniqsa to'qimachilik va qishloq xo'jaligi.</p>
                    <p>3. <span className="text-gray-300">IT sektor</span> — 2 milliard dollarlik eksportga chiqdi...</p>
                  </div>
                </motion.div>
              </div>
              
              {/* Input */}
              <div className="flex items-center gap-3 p-3 rounded-xl border border-white/[0.08] bg-white/[0.02]">
                <button className="p-2 text-gray-500 hover:text-gray-400 transition-colors">
                  <Paperclip className="w-4 h-4" />
                </button>
                <input 
                  type="text" 
                  placeholder="Savolingizni yozing..."
                  className="flex-1 bg-transparent text-sm text-white placeholder:text-gray-600 outline-none"
                />
                <button className="p-2 text-gray-500 hover:text-gray-400 transition-colors">
                  <Mic className="w-4 h-4" />
                </button>
                <button className="w-9 h-9 rounded-lg bg-[#2DD4BF] flex items-center justify-center hover:bg-[#2DD4BF]/90 transition-colors">
                  <Send className="w-4 h-4 text-black" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
        
        {/* Fade out mask */}
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#050505] via-[#050505]/80 to-transparent pointer-events-none" />
      </div>
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
    navigate(user ? "/modes" : "/auth?next=/modes");
  };

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const faqs = [
    { q: t('faq.1.question'), a: t('faq.1.answer') },
    { q: t('faq.2.question'), a: t('faq.2.answer') },
    { q: t('landing.faq.imageGen.question'), a: t('landing.faq.imageGen.answer') },
    { q: t('faq.webSearch.question'), a: t('faq.webSearch.answer') },
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-white relative overflow-x-hidden">
      {/* Grid background */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage: `linear-gradient(to right, #80808008 1px, transparent 1px), linear-gradient(to bottom, #80808008 1px, transparent 1px)`,
          backgroundSize: '48px 48px',
        }}
      />
      
      {/* Subtle top gradient */}
      <div className="fixed top-0 inset-x-0 h-[500px] bg-gradient-to-b from-[#2DD4BF]/[0.03] to-transparent pointer-events-none" />
      
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#050505]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={bahorLogo} alt="Bahor AI" className="h-8 w-auto" />
            <span className="text-lg font-semibold text-white tracking-tight">Bahor AI</span>
          </div>
          
          <nav className="hidden md:flex items-center gap-8">
            {[
              { label: 'Imkoniyatlar', id: 'features' },
              { label: 'Taqqoslash', id: 'compare' },
              { label: 'Narxlar', id: 'pricing' },
            ].map((item) => (
              <button 
                key={item.id}
                onClick={() => scrollToSection(item.id)} 
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                {item.label}
              </button>
            ))}
          </nav>
          
          <div className="flex items-center gap-4">
            <LanguageSwitcher variant="pill" />
            <Button 
              onClick={handleOpenApp} 
              size="sm" 
              className="h-9 px-5 rounded-lg font-medium bg-[#2DD4BF] text-black hover:bg-[#2DD4BF]/90 transition-colors"
            >
              Boshlash
            </Button>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative pt-20 sm:pt-28 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Badge */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="flex justify-center mb-8"
          >
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#2DD4BF]/10 border border-[#2DD4BF]/20 text-[#2DD4BF] text-xs font-medium">
              <Sparkles className="w-3.5 h-3.5" />
              Hozircha beta
            </span>
          </motion.div>
          
          {/* Headline */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="text-center"
          >
            <h1 className="text-5xl sm:text-7xl lg:text-8xl font-medium tracking-tight leading-[1.05]">
              <span className="text-white">Birinchi o'zbek</span>
              <br />
              <span className="bg-gradient-to-r from-white via-gray-300 to-gray-500 bg-clip-text text-transparent">
                sun'iy intellekti
              </span>
            </h1>
          </motion.div>
          
          {/* Subheadline */}
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
            className="text-center text-lg sm:text-xl text-gray-400 mt-6 max-w-2xl mx-auto font-normal leading-relaxed"
          >
            Savol so'rang, rasm yarating, hujjat tahlil qiling — 
            hammasi o'zbek tilida, bir platformada.
          </motion.p>
          
          {/* CTA */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
            className="flex justify-center gap-4 mt-10"
          >
            <Button 
              onClick={handleOpenApp}
              size="lg"
              className="h-12 px-8 rounded-lg font-medium bg-[#2DD4BF] text-black hover:bg-[#2DD4BF]/90 transition-all"
            >
              Bepul boshlash
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button 
              variant="outline"
              size="lg"
              onClick={() => scrollToSection('features')}
              className="h-12 px-8 rounded-lg font-medium bg-white/[0.03] border-white/[0.1] text-white hover:bg-white/[0.06] transition-all"
            >
              Ko'proq bilish
            </Button>
          </motion.div>
          
          {/* Hero Mockup */}
          <HeroMockup />
        </div>
      </section>

      {/* BENTO FEATURES */}
      <section id="features" className="py-24 sm:py-32 relative">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-medium text-white tracking-tight">
              Bir platformada hamma narsa
            </h2>
            <p className="text-gray-400 mt-4 text-lg max-w-xl mx-auto">
              Qidiruv, rasm yaratish, hujjat tahlili — hammasi o'zbek tilida
            </p>
          </motion.div>
          
          {/* Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Web Search - 2 cols */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="md:col-span-2"
            >
              <SpotlightCard className="p-6 h-full">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl border border-white/[0.1] bg-white/[0.03] flex items-center justify-center">
                    <Search className="w-5 h-5 text-[#2DD4BF]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-white tracking-tight">Web qidiruv</h3>
                    <p className="text-sm text-gray-500">Real vaqtda internet ma'lumotlari</p>
                  </div>
                </div>
                
                {/* Animated sources list */}
                <div className="mt-6 space-y-2 overflow-hidden h-32 relative">
                  {['kun.uz — Yangi iqtisodiy islohotlar e\'lon qilindi', 'gazeta.uz — 2024 yil byudjeti tasdiqlandi', 'lex.uz — Yangi soliq kodeksi kuchga kirdi', 'review.uz — IT sektor rekord o\'sishda'].map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.3 + i * 0.1 }}
                      className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-white/[0.02] border border-white/[0.05]"
                    >
                      <ExternalLink className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-400">{item}</span>
                    </motion.div>
                  ))}
                  <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#050505] to-transparent" />
                </div>
              </SpotlightCard>
            </motion.div>
            
            {/* Image Gen - tall */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="md:row-span-2"
            >
              <SpotlightCard className="p-6 h-full flex flex-col">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl border border-white/[0.1] bg-white/[0.03] flex items-center justify-center">
                    <ImagePlus className="w-5 h-5 text-[#2DD4BF]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-white tracking-tight">Rasm yaratish</h3>
                    <p className="text-sm text-gray-500">So'z bilan tasvirlang</p>
                  </div>
                </div>
                
                <p className="text-sm text-gray-400 mb-4">
                  "Registon maydonini quyosh botishida chiz" — va Bahor yaratadi.
                </p>
                
                {/* Image fills the rest */}
                <div className="flex-1 relative rounded-xl overflow-hidden mt-auto min-h-[200px]">
                  <img 
                    src={samarkandImage} 
                    alt="Registon" 
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3">
                    <span className="text-xs text-white/70">Registon maydoni, Samarqand</span>
                  </div>
                </div>
              </SpotlightCard>
            </motion.div>
            
            {/* Circles */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <SpotlightCard className="p-6 h-full">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl border border-white/[0.1] bg-white/[0.03] flex items-center justify-center">
                    <Users className="w-5 h-5 text-[#2DD4BF]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-white tracking-tight">Doiralar</h3>
                    <p className="text-sm text-gray-500">Guruh bilan ishlang</p>
                  </div>
                </div>
                
                <div className="flex -space-x-2 mt-4">
                  <img src="https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=64&h=64&fit=crop&crop=face" alt="" className="w-10 h-10 rounded-full border-2 border-[#050505]" />
                  <img src="https://images.unsplash.com/photo-1580489944761-15a19d654956?w=64&h=64&fit=crop&crop=face" alt="" className="w-10 h-10 rounded-full border-2 border-[#050505]" />
                  <div className="w-10 h-10 rounded-full bg-white/[0.06] border-2 border-[#050505] flex items-center justify-center text-xs text-gray-400">+4</div>
                </div>
              </SpotlightCard>
            </motion.div>
            
            {/* Files */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <SpotlightCard className="p-6 h-full">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl border border-white/[0.1] bg-white/[0.03] flex items-center justify-center">
                    <FileText className="w-5 h-5 text-[#2DD4BF]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-white tracking-tight">Fayl tahlili</h3>
                    <p className="text-sm text-gray-500">PDF, Word, Excel</p>
                  </div>
                </div>
                
                <div className="flex gap-2 mt-4">
                  {['PDF', 'DOCX', 'CSV'].map((ext) => (
                    <span key={ext} className="px-2.5 py-1 rounded-md text-xs bg-white/[0.04] text-gray-400 border border-white/[0.06]">
                      {ext}
                    </span>
                  ))}
                </div>
              </SpotlightCard>
            </motion.div>
          </div>
        </div>
      </section>

      {/* COMPARISON */}
      <section id="compare" className="py-24 sm:py-32 relative">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-medium text-white tracking-tight">
              Nima uchun Bahor AI?
            </h2>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0 relative">
            {/* Separator */}
            <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-white/10 to-transparent" />
            
            {/* Ordinary chatbots */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="p-8"
            >
              <h3 className="text-lg font-medium text-gray-500 mb-6">Oddiy chatbotlar</h3>
              <ul className="space-y-4">
                {[
                  "Faqat ingliz tilida yaxshi ishlaydi",
                  "O'zbek madaniyatini tushunmaydi",
                  "Eskirgan ma'lumotlar",
                  "Rasm yaratish yo'q",
                  "Fayl tahlili cheklangan",
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-gray-500">
                    <X className="w-4 h-4 text-gray-600" />
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
            
            {/* Bahor AI */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="p-8"
            >
              <h3 className="text-lg font-medium text-white mb-6">Bahor AI</h3>
              <ul className="space-y-4">
                {[
                  "O'zbek tilida mukammal ishlaydi",
                  "Mahalliy madaniyat va kontekst",
                  "Real vaqtda web qidiruv",
                  "AI bilan rasm yaratish",
                  "Har qanday faylni tahlil qiladi",
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-white">
                    <Check className="w-4 h-4 text-[#2DD4BF]" />
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-24 sm:py-32 relative">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-medium text-white tracking-tight">
              Oddiy narxlar
            </h2>
            <p className="text-gray-400 mt-4">
              Bepul boshlang, kerak bo'lganda yangilang
            </p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Free */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="p-8 rounded-2xl border border-white/[0.08] bg-white/[0.02]"
            >
              <h3 className="text-lg font-medium text-white mb-2">Bepul</h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-5xl font-medium text-white tracking-tighter">0</span>
                <span className="text-gray-500">so'm</span>
              </div>
              
              <ul className="space-y-3 mb-8">
                {["Kuniga 5 ta so'rov", "Asosiy rejimlar", "Web qidiruv (cheklangan)"].map((f, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-gray-400">
                    <Check className="w-4 h-4 text-[#2DD4BF]" />
                    {f}
                  </li>
                ))}
              </ul>
              
              <Button 
                onClick={handleOpenApp}
                className="w-full h-11 rounded-lg font-medium bg-white/[0.05] border border-white/[0.1] text-white hover:bg-white/[0.1] transition-colors"
              >
                Boshlash
              </Button>
            </motion.div>
            
            {/* Pro */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="p-8 rounded-2xl border border-[#2DD4BF]/30 bg-[#2DD4BF]/[0.03] relative overflow-hidden"
            >
              {/* Glow */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#2DD4BF]/10 rounded-full blur-[100px] -z-10" />
              
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-medium text-white">Premium</h3>
                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-[#2DD4BF]/20 text-[#2DD4BF] border border-[#2DD4BF]/30">
                  Tavsiya
                </span>
              </div>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-5xl font-medium text-white tracking-tighter">49,000</span>
                <span className="text-gray-500">so'm/oy</span>
              </div>
              
              <ul className="space-y-3 mb-8">
                {["Kuniga 200 ta so'rov", "Barcha rejimlar", "Cheksiz rasm yaratish", "PDF asboblar to'plami", "Tezkor javoblar"].map((f, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-gray-300">
                    <Check className="w-4 h-4 text-[#2DD4BF]" />
                    {f}
                  </li>
                ))}
              </ul>
              
              <Button 
                className="w-full h-11 rounded-lg font-medium bg-[#2DD4BF] text-black hover:bg-[#2DD4BF]/90 transition-colors"
              >
                Tez kunda
              </Button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 sm:py-32">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-medium text-white tracking-tight">
              Savollar
            </h2>
          </motion.div>
          
          <Accordion type="single" collapsible className="space-y-2">
            {faqs.map((faq, idx) => (
              <AccordionItem 
                key={idx} 
                value={`faq-${idx}`}
                className="border-b border-white/[0.06] px-0"
              >
                <AccordionTrigger className="text-left text-white hover:no-underline py-5 text-sm font-normal">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-gray-400 text-sm pb-5">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 sm:py-32 border-t border-white/[0.06]">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl sm:text-4xl font-medium text-white tracking-tight mb-4"
          >
            Hoziroq sinab ko'ring
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-gray-400 mb-8"
          >
            Bepul ro'yxatdan o'ting — 30 soniya
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <Button 
              onClick={handleOpenApp}
              size="lg"
              className="h-12 px-10 rounded-lg font-medium bg-[#2DD4BF] text-black hover:bg-[#2DD4BF]/90"
            >
              Boshlash
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </motion.div>
        </div>
      </section>

      <AppFooter />
    </div>
  );
}
