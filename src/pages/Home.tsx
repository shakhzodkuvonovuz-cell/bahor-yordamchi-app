import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Send, ChevronDown, Check, AlertCircle } from "lucide-react";
import { CHAT_MODES } from "@/data/modes";
import { useTranslation } from "@/i18n/LanguageProvider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default function Home() {
  const navigate = useNavigate();
  const { language, t } = useTranslation();
  const [input, setInput] = useState("");
  const [selectedMode, setSelectedMode] = useState("general");

  // Mode icons mapping
  const modeIcons: Record<string, string> = {
    general: "💬",
    tech: "💻",
    daily: "🏠",
    business: "📈",
    ielts: "🎓",
    homework: "📚",
    job: "💼",
    financial: "💰",
    health: "❤️",
  };

  // Get localized mode title
  const getModeTitle = (modeId: string) => {
    const modeKeys: Record<string, string> = {
      general: 'mode.general.title',
      tech: 'mode.tech.title',
      daily: 'mode.life.title',
      business: 'mode.business.title',
      ielts: 'mode.english.title',
      homework: 'mode.homework.title',
      job: 'mode.job.title',
      financial: 'mode.finance.title',
      health: 'mode.health.title',
    };
    return t(modeKeys[modeId] || 'mode.general.title');
  };

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
        { label: "🖼️ Rasm yaratish", mode: "general", prompt: "Samarqand shahri haqida chiroyli rasm yarat" },
        { label: "📄 PDF yaratish", mode: "general", prompt: "Matnni PDF formatiga o'tkaz" },
      ],
      en: [
        { label: "📝 IELTS essay", mode: "ielts", prompt: "Help me write an IELTS Writing Task 2 essay" },
        { label: "💼 CV/Resume", mode: "job", prompt: "Help me create a professional CV" },
        { label: "🍳 Recipe", mode: "daily", prompt: "Give me an easy and delicious recipe" },
        { label: "🏠 Daily advice", mode: "daily", prompt: "What useful thing can I do today?" },
        { label: "💻 Coding", mode: "tech", prompt: "Help me write a React button component" },
        { label: "📐 Math", mode: "homework", prompt: "Explain how to solve quadratic equations" },
        { label: "🖼️ Generate image", mode: "general", prompt: "Create a beautiful image of Samarkand city" },
        { label: "📄 Create PDF", mode: "general", prompt: "Convert this text to PDF format" },
      ],
      ru: [
        { label: "📝 IELTS эссе", mode: "ielts", prompt: "Помоги написать эссе для IELTS Writing Task 2" },
        { label: "💼 Резюме", mode: "job", prompt: "Помоги создать профессиональное резюме" },
        { label: "🍳 Рецепт", mode: "daily", prompt: "Дай простой и вкусный рецепт" },
        { label: "🏠 Совет на день", mode: "daily", prompt: "Что полезного я могу сделать сегодня?" },
        { label: "💻 Код", mode: "tech", prompt: "Помоги написать компонент кнопки в React" },
        { label: "📐 Математика", mode: "homework", prompt: "Объясни как решать квадратные уравнения" },
        { label: "🖼️ Создать изображение", mode: "general", prompt: "Создай красивое изображение города Самарканд" },
        { label: "📄 Создать PDF", mode: "general", prompt: "Преобразуй этот текст в PDF формат" },
      ],
      tr: [
        { label: "📝 IELTS kompozisyon", mode: "ielts", prompt: "IELTS Writing Task 2 için kompozisyon yazmama yardım et" },
        { label: "💼 CV hazırlama", mode: "job", prompt: "Profesyonel CV hazırlamama yardım et" },
        { label: "🍳 Tarif", mode: "daily", prompt: "Kolay ve lezzetli bir tarif ver" },
        { label: "🏠 Günlük tavsiye", mode: "daily", prompt: "Bugün ne faydalı yapabilirim?" },
        { label: "💻 Kodlama", mode: "tech", prompt: "React'ta bir buton komponenti yazmama yardım et" },
        { label: "📐 Matematik", mode: "homework", prompt: "İkinci dereceden denklemleri çözmeyi açıkla" },
        { label: "🖼️ Görsel oluştur", mode: "general", prompt: "Semerkant şehrinin güzel bir görselini oluştur" },
        { label: "📄 PDF oluştur", mode: "general", prompt: "Bu metni PDF formatına dönüştür" },
      ],
    };
    return prompts[language] || prompts.uz;
  };

  const handleSend = () => {
    if (!input.trim()) return;
    navigate(`/chat/${selectedMode}`, { state: { initialMessage: input } });
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

  return (
    <div className="min-h-full bg-background flex flex-col">
      {/* Top Bar with Beta + Language */}
      <div className="w-full px-4 sm:px-6 py-3 border-b border-border/50">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm">
            <AlertCircle className="w-4 h-4 text-primary" />
            <span className="text-muted-foreground">{t('beta.title')}</span>
            <span className="text-muted-foreground">·</span>
            <button 
              onClick={() => navigate("/feedback")} 
              className="text-primary hover:underline"
            >
              {t('beta.report')}
            </button>
          </div>
          <LanguageSwitcher variant="compact" />
        </div>
      </div>

      {/* Main Content - Centered */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-3xl space-y-6">
          
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground">
              {t('home.title')}
            </h1>
            <p className="text-muted-foreground text-base sm:text-lg">
              {t('home.subtitle')}
            </p>
          </div>

          {/* Main Input Area */}
          <div className="space-y-3">
            {/* Mode Selector + Input */}
            <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
              {/* Mode Dropdown Row */}
              <div className="px-4 py-2 border-b border-border/50 flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{t('chat.mode')}:</span>
                <DropdownMenu>
                  <DropdownMenuTrigger className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-accent transition-colors text-sm font-medium">
                    <span>{modeIcons[selectedMode]}</span>
                    <span>{getModeTitle(selectedMode)}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56">
                    {CHAT_MODES.map((mode) => (
                      <DropdownMenuItem
                        key={mode.id}
                        onClick={() => setSelectedMode(mode.id)}
                        className="flex items-center gap-2"
                      >
                        <span>{modeIcons[mode.id] || mode.icon}</span>
                        <span className="flex-1">{getModeTitle(mode.id)}</span>
                        {selectedMode === mode.id && (
                          <Check className="w-4 h-4 text-primary" />
                        )}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Input Row */}
              <div className="p-3 sm:p-4">
                <div className="flex gap-3 items-end">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={t('chat.input.placeholder')}
                    rows={2}
                    className="flex-1 border-none outline-none bg-transparent text-base sm:text-lg text-foreground placeholder:text-muted-foreground resize-none leading-relaxed"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!input.trim()}
                    className="rounded-xl bg-primary text-primary-foreground w-11 h-11 flex items-center justify-center hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 shadow-lg shadow-primary/20 flex-shrink-0"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Prompt Chips */}
            <div className="flex flex-wrap gap-2 justify-center">
              {getBetaPrompts().map((item, index) => (
                <button
                  key={index}
                  onClick={() => handlePromptChip(item.mode, item.prompt)}
                  className="px-3 py-1.5 text-sm bg-secondary/50 hover:bg-secondary text-secondary-foreground rounded-full transition-colors border border-border/50"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer hint */}
      <div className="text-center py-4 text-xs text-muted-foreground">
        {t('section.exploreModes.subtitle')}
      </div>
    </div>
  );
}
