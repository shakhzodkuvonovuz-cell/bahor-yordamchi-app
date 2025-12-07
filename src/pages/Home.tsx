import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Send, ArrowRight, AlertCircle } from "lucide-react";
import { CHAT_MODES } from "@/data/modes";
import { useTranslation } from "@/i18n/LanguageProvider";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default function Home() {
  const navigate = useNavigate();
  const { language, t } = useTranslation();
  const [input, setInput] = useState("");

  // Get localized beta prompt chips
  const getBetaPrompts = () => {
    const prompts = {
      uz: [
        { label: "📝 IELTS essay", mode: "ielts", prompt: "IELTS Writing Task 2 uchun essay yozishda yordam ber" },
        { label: "💼 CV tayyorlash", mode: "job", prompt: "Professional CV tayyorlashda yordam ber" },
        { label: "🍳 Taom retsepti", mode: "daily", prompt: "Oson va mazali taom retseptini ber" },
        { label: "🏠 Kundalik maslahat", mode: "daily", prompt: "Bugun qanday foydali ish qilsam bo'ladi?" },
        { label: "💻 Kod yozish", mode: "tech", prompt: "React da button komponenti yozishda yordam ber" },
        { label: "📐 Matematika", mode: "homework", prompt: "Kvadrat tenglama yechishni tushuntir" },
      ],
      en: [
        { label: "📝 IELTS essay", mode: "ielts", prompt: "Help me write an IELTS Writing Task 2 essay" },
        { label: "💼 CV/Resume", mode: "job", prompt: "Help me create a professional CV" },
        { label: "🍳 Recipe", mode: "daily", prompt: "Give me an easy and delicious recipe" },
        { label: "🏠 Daily advice", mode: "daily", prompt: "What useful thing can I do today?" },
        { label: "💻 Coding", mode: "tech", prompt: "Help me write a React button component" },
        { label: "📐 Math", mode: "homework", prompt: "Explain how to solve quadratic equations" },
      ],
      ru: [
        { label: "📝 IELTS эссе", mode: "ielts", prompt: "Помоги написать эссе для IELTS Writing Task 2" },
        { label: "💼 Резюме", mode: "job", prompt: "Помоги создать профессиональное резюме" },
        { label: "🍳 Рецепт", mode: "daily", prompt: "Дай простой и вкусный рецепт" },
        { label: "🏠 Совет на день", mode: "daily", prompt: "Что полезного я могу сделать сегодня?" },
        { label: "💻 Код", mode: "tech", prompt: "Помоги написать компонент кнопки в React" },
        { label: "📐 Математика", mode: "homework", prompt: "Объясни как решать квадратные уравнения" },
      ],
      tr: [
        { label: "📝 IELTS kompozisyon", mode: "ielts", prompt: "IELTS Writing Task 2 için kompozisyon yazmama yardım et" },
        { label: "💼 CV hazırlama", mode: "job", prompt: "Profesyonel CV hazırlamama yardım et" },
        { label: "🍳 Tarif", mode: "daily", prompt: "Kolay ve lezzetli bir tarif ver" },
        { label: "🏠 Günlük tavsiye", mode: "daily", prompt: "Bugün ne faydalı yapabilirim?" },
        { label: "💻 Kodlama", mode: "tech", prompt: "React\'ta bir buton komponenti yazmama yardım et" },
        { label: "📐 Matematik", mode: "homework", prompt: "İkinci dereceden denklemleri çözmeyi açıkla" },
      ],
    };
    return prompts[language] || prompts.uz;
  };

  const handleSend = () => {
    if (!input.trim()) return;
    navigate("/chat/general", { state: { initialMessage: input } });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handlePromptChip = (mode: string, prompt: string) => {
    navigate(`/chat/${mode}`, { state: { initialMessage: prompt } });
  };

  // Mode icons mapping
  const modeIcons: Record<string, string> = {
    general: "💬",
    tech: "💻",
    daily: "🏠",
    business: "📈",
    ielts: "🎓",
    homework: "📚",
    job: "💼",
    finance: "💰",
    health: "❤️",
  };

  // Get localized mode info
  const getModeTranslation = (modeId: string) => {
    const modeKeys: Record<string, { title: string; desc: string }> = {
      general: { title: 'mode.general.title', desc: 'mode.general.desc' },
      tech: { title: 'mode.tech.title', desc: 'mode.tech.desc' },
      daily: { title: 'mode.life.title', desc: 'mode.life.desc' },
      business: { title: 'mode.business.title', desc: 'mode.business.desc' },
      ielts: { title: 'mode.english.title', desc: 'mode.english.desc' },
      homework: { title: 'mode.homework.title', desc: 'mode.homework.desc' },
      job: { title: 'mode.job.title', desc: 'mode.job.desc' },
      finance: { title: 'mode.finance.title', desc: 'mode.finance.desc' },
      health: { title: 'mode.health.title', desc: 'mode.health.desc' },
    };
    const keys = modeKeys[modeId];
    if (!keys) return null;
    return {
      title: t(keys.title),
      subtitle: t(keys.desc),
    };
  };

  return (
    <div className="min-h-full bg-background relative">
      {/* Subtle background effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 right-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-primary/3 rounded-full blur-[100px]" />
      </div>

      {/* Main content */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Top right - Language switcher */}
        <div className="flex justify-end mb-4">
          <LanguageSwitcher variant="compact" />
        </div>

        {/* Beta Banner - Compact */}
        <div className="bg-primary/10 border border-primary/20 rounded-xl px-4 py-2.5 flex items-center gap-3 mb-8 max-w-3xl mx-auto">
          <AlertCircle className="w-4 h-4 text-primary flex-shrink-0" />
          <p className="text-sm text-foreground">
            <span className="font-medium">{t('beta.title')}</span>
            <span className="text-muted-foreground ml-2 hidden sm:inline">{t('beta.description')}</span>
            <button onClick={() => navigate("/feedback")} className="text-primary hover:underline ml-2">{t('beta.report')}</button>
          </p>
        </div>

        {/* Hero Section - Centered, Perplexity-style */}
        <div className="text-center pt-8 sm:pt-12 pb-6">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground leading-tight mb-4">
            {t('app.tagline.main')}
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto">
            {t('app.tagline.sub')}
          </p>
        </div>

        {/* Main Chat Input - Centered, Premium */}
        <div className="max-w-2xl mx-auto mb-6">
          <div className="glass-premium rounded-2xl p-1.5 shadow-glow hover:shadow-glow-lg transition-all">
            <div className="bg-card rounded-xl px-4 py-3">
              <div className="flex gap-3 items-center">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={t('chat.input.placeholder')}
                  rows={1}
                  className="flex-1 border-none outline-none bg-transparent text-base sm:text-lg text-foreground placeholder:text-muted-foreground resize-none"
                  style={{ minHeight: "52px" }}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className="rounded-xl bg-primary text-primary-foreground w-12 h-12 flex items-center justify-center hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 shadow-lg shadow-primary/25"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Prompt Chips - Centered */}
        <div className="flex flex-wrap gap-2 justify-center mb-10 max-w-3xl mx-auto">
          {getBetaPrompts().map((item, index) => (
            <button
              key={index}
              onClick={() => handlePromptChip(item.mode, item.prompt)}
              className="px-3.5 py-2 text-sm bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-full transition-colors"
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Section Divider */}
        <div className="text-center mb-6">
          <p className="text-sm text-muted-foreground font-medium">
            {t('section.exploreModes.subtitle')}
          </p>
        </div>

        {/* Mode Cards Grid - Wider, 2x4 on desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-8">
          {CHAT_MODES.filter((mode) => mode.id !== "general").map((mode, index) => {
            const modeTranslation = getModeTranslation(mode.id);
            
            return (
              <button
                key={mode.id}
                onClick={() => navigate(`/chat/${mode.id}`)}
                className="group text-left p-5 rounded-2xl glass-premium hover:shadow-glow hover:border-primary/30 transition-all duration-300 hover-scale animate-fade-in"
                style={{ animationDelay: `${index * 40}ms` }}
              >
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center text-xl flex-shrink-0 group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
                    {modeIcons[mode.id] || mode.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h3 className="font-semibold text-foreground truncate text-sm">
                        {modeTranslation?.title || mode.title}
                      </h3>
                      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0" />
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {modeTranslation?.subtitle || mode.subtitle}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
