import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Send, Settings } from "lucide-react";
import { CHAT_MODES } from "@/data/modes";
import ModeCard from "@/components/ModeCard";
import { useLanguage } from "@/hooks/useLanguage";
import { getTranslation } from "@/data/translations";

export default function Home() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const t = getTranslation(language);
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim()) return;
    // Navigate to general chat with the message
    navigate("/chat/general", { state: { initialMessage: input } });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5 dark:to-primary/10">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Header with App Name and Settings Icon */}
        <div className="flex justify-between items-center px-4 py-3">
          <h2 className="text-lg font-semibold text-foreground">Bahor AI</h2>
          <button
            onClick={() => navigate("/settings")}
            className="p-2 hover:bg-accent dark:hover:bg-accent rounded-lg transition-colors"
            aria-label="Sozlamalar"
          >
            <Settings className="w-6 h-6 text-muted-foreground hover:text-foreground" />
          </button>
        </div>

        {/* Hero Section */}
        <div className="relative pt-12 pb-8">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary-light/10 to-primary/10 dark:from-primary/20 dark:via-primary-light/20 dark:to-primary/20 rounded-3xl blur-3xl opacity-50" />
          <h1 className="relative text-center text-xl sm:text-2xl font-bold text-foreground/90 dark:text-foreground/95 leading-relaxed px-4">
            {t.heroText}
          </h1>
        </div>

        {/* Main Chat Input */}
        <div className="relative">
          <div className="bg-card dark:bg-card border border-border dark:border-border rounded-2xl shadow-lg hover:shadow-xl transition-shadow p-4">
            <div className="flex gap-3 items-end">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={t.chatPlaceholder}
                rows={1}
                className="flex-1 bg-background dark:bg-background border border-border dark:border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none max-h-32"
                style={{ minHeight: "44px" }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className="bg-primary hover:bg-primary-light text-primary-foreground rounded-xl p-3 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 shadow-sm"
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

        {/* Feature Grid */}
        <div className="grid grid-cols-2 gap-3 pb-8">
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
