import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Send, Settings, ArrowRight } from "lucide-react";
import { CHAT_MODES } from "@/data/modes";
import { useTranslation } from "@/i18n/LanguageProvider";
import { getTranslation } from "@/data/translations";
import bahorLogo from "@/assets/bahor-logo.png";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default function Home() {
  const navigate = useNavigate();
  const { language } = useTranslation();
  const t = getTranslation(language);
  const [input, setInput] = useState("");

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

  return (
    <div className="min-h-screen bg-background relative">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 left-1/4 w-[300px] h-[300px] bg-primary/3 rounded-full blur-[80px]" />
      </div>
      
      <div className="max-w-3xl lg:max-w-5xl mx-auto px-4 py-6 space-y-8 relative z-10">
        {/* Header */}
        <header className="flex justify-between items-center px-1 pt-2">
          <div className="flex items-center gap-3">
            <img 
              src={bahorLogo} 
              alt="Bahor AI Logo" 
              className="h-10 w-auto sm:h-11 object-contain" 
            />
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">
              Bahor AI
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher variant="compact" />
            <button
              onClick={() => navigate("/settings")}
              className="p-2.5 hover:bg-secondary rounded-xl transition-colors"
              aria-label="Sozlamalar"
            >
              <Settings className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </header>

        {/* Hero Section */}
        <div className="text-center pt-6 pb-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground leading-relaxed mb-2">
            {t.heroText}
          </h1>
        </div>

        {/* Main Chat Input */}
        <div className="glass-premium rounded-2xl p-1.5 shadow-glow hover:shadow-glow-lg transition-all">
          <div className="bg-card rounded-xl px-4 py-3">
            <div className="flex gap-3 items-center">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={t.chatPlaceholder}
                rows={1}
                className="flex-1 border-none outline-none bg-transparent text-base text-foreground placeholder:text-muted-foreground resize-none"
                style={{ minHeight: "48px" }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className="rounded-xl bg-primary text-primary-foreground w-11 h-11 flex items-center justify-center hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 shadow-lg shadow-primary/25"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Section Title */}
        <div className="text-center pt-4">
          <p className="text-sm text-muted-foreground font-medium">
            {t.subtitle}
          </p>
        </div>

        {/* Mode Cards Grid - Premium 2x4 Layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-8">
          {CHAT_MODES.filter((mode) => mode.id !== "general").map((mode, index) => {
            const modeTranslation = t.modes[mode.id as keyof typeof t.modes];
            
            return (
              <button
                key={mode.id}
                onClick={() => navigate(`/chat/${mode.id}`)}
                className="group text-left p-5 rounded-2xl glass-premium hover:shadow-glow hover:border-primary/30 transition-all duration-300 hover-scale animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-2xl flex-shrink-0 group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
                    {modeIcons[mode.id] || mode.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h3 className="font-bold text-foreground truncate">
                        {modeTranslation?.title || mode.title}
                      </h3>
                      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0" />
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
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