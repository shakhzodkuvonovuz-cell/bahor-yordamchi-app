import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Send, Settings } from "lucide-react";
import { CHAT_MODES } from "@/data/modes";
import ModeCard from "@/components/ModeCard";
import { useLanguage } from "@/hooks/useLanguage";
import { getTranslation } from "@/data/translations";
import bahorLogo from "@/assets/bahor-logo.png";

export default function Home() {
  const navigate = useNavigate();
  const { language } = useLanguage();
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

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl lg:max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Header with glassmorphism */}
        <div className="flex justify-between items-center px-2 pt-2 pb-1">
          <div className="flex items-center gap-2.5">
            <img 
              src={bahorLogo} 
              alt="Bahor AI Logo" 
              className="h-9 w-auto sm:h-10 object-contain" 
            />
            <h2 className="text-xl sm:text-2xl font-semibold text-foreground">
              Bahor AI
            </h2>
          </div>
          <button
            onClick={() => navigate("/settings")}
            className="p-2.5 hover:bg-secondary rounded-xl transition-colors"
            aria-label="Sozlamalar"
          >
            <Settings className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Hero Section */}
        <div className="text-center pt-4 pb-2">
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground leading-relaxed">
            {t.heroText}
          </h1>
        </div>

        {/* Main Chat Input */}
        <div className="rounded-2xl border border-border/60 bg-card shadow-premium-sm px-4 py-3 hover:border-primary/30 hover:shadow-premium-md transition-all">
          <div className="flex gap-3 items-center">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={t.chatPlaceholder}
              rows={1}
              className="flex-1 border-none outline-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground resize-none"
              style={{ minHeight: "44px" }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="rounded-xl bg-primary text-primary-foreground w-10 h-10 flex items-center justify-center hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 shadow-sm hover:shadow-md hover:glow-primary"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Section Title */}
        <div className="text-center pt-2">
          <p className="text-sm text-muted-foreground font-medium">
            {t.subtitle}
          </p>
        </div>

        {/* Mode Cards Grid */}
        <div className="grid grid-cols-2 gap-3 pb-6">
          {CHAT_MODES.filter((mode) => mode.id !== "general").map((mode) => (
            <ModeCard
              key={mode.id}
              mode={mode}
              language={language}
              onClick={() => navigate(`/chat/${mode.id}`)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
